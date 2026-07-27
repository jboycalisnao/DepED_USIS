import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { fetchProfilePhotoFromDrive } from '../common/server/googleDriveProfilePhotos';

const LEARNER_TABLE = 'registrar_learners';

const toText = (value: unknown) => String(value ?? '').trim();

const setServerEnvFallbacks = (env: Record<string, string>) => {
  for (const key of [
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_DRIVE_PROFILE_PHOTOS_FOLDER_ID',
  ]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
};

const readRequestBody = (req: any) =>
  new Promise<Record<string, unknown>>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

const isMissingUpdatedAtError = (error: unknown) => {
  const message = toText((error as any)?.message || error).toLowerCase();
  return message.includes('registrar_learners.updated_at') || (message.includes('updated_at') && message.includes('does not exist'));
};

const updateLatestEnrollmentGuardianContact = (value: unknown, guardianContact: string) => {
  if (!Array.isArray(value) || value.length === 0) return value;

  const scoreEntry = (entry: any, index: number) => {
    const timestamp = toText(entry?.enrollmentDate || entry?.enrollment_date || entry?.created_at);
    const parsedTime = timestamp ? new Date(timestamp).getTime() : 0;
    return Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : index;
  };

  let latestIndex = 0;
  value.forEach((entry, index) => {
    if (scoreEntry(entry, index) >= scoreEntry(value[latestIndex], latestIndex)) latestIndex = index;
  });

  return value.map((entry, index) => {
    if (index !== latestIndex || !entry || typeof entry !== 'object') return entry;
    const submissionPayload =
      entry.submissionPayload && typeof entry.submissionPayload === 'object'
        ? { ...entry.submissionPayload }
        : {};
    return {
      ...entry,
      submissionPayload: {
        ...submissionPayload,
        guardianContact,
        learnerContact: guardianContact,
      },
    };
  });
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const learnerProfileApiPlugin = {
    name: 'learner-profile-api',
    configureServer(server: any) {
      server.middlewares.use('/api/learner-profile', async (req: any, res: any) => {
        try {
          if (req.method !== 'PATCH') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
            return;
          }

          setServerEnvFallbacks(env);
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');

          const body = await readRequestBody(req);
          const learnerId = toText(body.learnerId);
          const lrn = toText(body.lrn);
          const fields = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
          if (!learnerId && !lrn) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Learner profile update requires learner ID or LRN.' }));
            return;
          }

          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const historyQuery = supabaseAdmin.from(LEARNER_TABLE).select('enrollment_history').limit(1);
          const historyResult = learnerId
            ? await historyQuery.eq('id', learnerId).maybeSingle()
            : await historyQuery.eq('lrn', lrn).maybeSingle();

          const guardianContact = toText(fields.contactNumber);
          const basePayload = {
            address: toText(fields.address) || null,
            contact_number: guardianContact || null,
            email: toText(fields.email) || null,
            father_name: toText(fields.fatherName) || null,
            guardian_name: toText(fields.guardianName) || null,
            mother_name: toText(fields.motherName) || null,
            ...(!historyResult.error && Array.isArray((historyResult.data as any)?.enrollment_history)
              ? { enrollment_history: updateLatestEnrollmentGuardianContact((historyResult.data as any).enrollment_history, guardianContact) }
              : {}),
          };
          const updatedAt = new Date().toISOString();

          const buildUpdateQuery = (payload: Record<string, unknown>) => {
            let query = supabaseAdmin.from(LEARNER_TABLE).update(payload);
            if (learnerId) query = query.eq('id', learnerId);
            else query = query.eq('lrn', lrn);
            return query;
          };

          let { data, error } = await buildUpdateQuery({ ...basePayload, updated_at: updatedAt }).select('id,updated_at').maybeSingle();
          if (error && isMissingUpdatedAtError(error)) {
            const legacyResult = await buildUpdateQuery(basePayload).select('id').maybeSingle();
            data = legacyResult.data;
            error = legacyResult.error;
          }
          if (error) throw error;
          if (!data) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'No learner profile record was updated.' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ok: true,
            id: toText((data as any).id) || learnerId || lrn,
            updatedAt: toText((data as any).updated_at) || updatedAt,
          }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: error?.message || 'Unable to update learner profile.' }));
        }
      });

      server.middlewares.use('/api/learner-profile-photo', async (req: any, res: any) => {
        try {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }

          setServerEnvFallbacks(env);
          const requestUrl = new URL(req.url || '', 'http://localhost');
          const learnerId = String(requestUrl.searchParams.get('learnerId') || '').trim();
          const lrn = String(requestUrl.searchParams.get('lrn') || '').trim();
          if (!learnerId) throw new Error('learnerId is required.');

          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');

          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const { data, error } = await supabaseAdmin
            .from('registrar_learners')
            .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
            .eq('id', learnerId)
            .maybeSingle();
          if (error) throw error;

          let photoRow = data as any;
          let fileId = String(photoRow?.profile_photo_drive_file_id || '').trim();

          if ((!photoRow || !fileId) && lrn) {
            const { data: lrnRow, error: lrnError } = await supabaseAdmin
              .from('registrar_learners')
              .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
              .eq('lrn', lrn)
              .maybeSingle();
            if (lrnError) throw lrnError;
            if (lrnRow) {
              photoRow = lrnRow as any;
              fileId = String(photoRow?.profile_photo_drive_file_id || '').trim();
            }
          }

          if (!photoRow || !fileId) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Learner profile picture was not found.' }));
            return;
          }

          const photo = await fetchProfilePhotoFromDrive(fileId);
          res.statusCode = 200;
          res.setHeader('Content-Type', String(photoRow.profile_photo_mime_type || photo.contentType || 'application/octet-stream'));
          res.setHeader('Cache-Control', 'private, max-age=300');
          res.end(photo.bytes);
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unable to load learner profile picture.', details: error?.message || String(error) }));
        }
      });
    },
  };

  return {
    envDir: '..',
    plugins: [react(), learnerProfileApiPlugin],
    server: {
      port: 3014,
      host: '0.0.0.0',
    },
  };
});
