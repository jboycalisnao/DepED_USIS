import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const LEARNER_TABLE = 'registrar_learners';

const toText = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

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

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role credentials are missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

const readJsonBody = async (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PATCH') {
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    const body = await readJsonBody(req);
    const learnerId = toText(body.learnerId);
    const lrn = toText(body.lrn);
    const fields = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
    if (!learnerId && !lrn) return json(res, 400, { ok: false, error: 'Learner profile update requires learner ID or LRN.' });

    const supabaseAdmin = getSupabaseAdmin();
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
    if (!data) return json(res, 404, { ok: false, error: 'No learner profile record was updated.' });

    return json(res, 200, {
      ok: true,
      id: toText((data as any).id) || learnerId || lrn,
      updatedAt: toText((data as any).updated_at) || updatedAt,
    });
  } catch (error: any) {
    return json(res, 500, {
      ok: false,
      error: error?.message || 'Unable to update learner profile.',
    });
  }
}
