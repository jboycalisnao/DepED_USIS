import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { fetchProfilePhotoFromDrive } from '../common/server/googleDriveProfilePhotos';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const learnerProfilePhotoApiPlugin = {
    name: 'learner-profile-photo-api',
    configureServer(server: any) {
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
    plugins: [react(), learnerProfilePhotoApiPlugin],
    server: {
      port: 3014,
      host: '0.0.0.0',
    },
  };
});
