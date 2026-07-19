import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { fetchProfilePhotoFromDrive } from '../../common/server/googleDriveProfilePhotos.js';

const toText = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role credentials are missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return json(res, 405, { error: 'Method not allowed.' });
    }

    const learnerId = toText(req.query.learnerId);
    const lrn = toText(req.query.lrn);
    if (!learnerId) {
      return json(res, 400, { error: 'learnerId is required.' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('registrar_learners')
      .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
      .eq('id', learnerId)
      .maybeSingle();
    if (error) throw error;

    let photoRow = data as any;
    let fileId = toText(photoRow?.profile_photo_drive_file_id);

    if ((!photoRow || !fileId) && lrn) {
      const { data: lrnRow, error: lrnError } = await supabaseAdmin
        .from('registrar_learners')
        .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
        .eq('lrn', lrn)
        .maybeSingle();
      if (lrnError) throw lrnError;
      if (lrnRow) {
        photoRow = lrnRow as any;
        fileId = toText(photoRow?.profile_photo_drive_file_id);
      }
    }

    if (!photoRow || !fileId) {
      return json(res, 404, { error: 'Learner profile picture was not found.' });
    }

    const photo = await fetchProfilePhotoFromDrive(fileId);
    res.status(200);
    res.setHeader('Content-Type', toText(photoRow.profile_photo_mime_type) || photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(photo.bytes);
  } catch (error: any) {
    return json(res, 500, {
      error: 'Unable to load learner profile picture.',
      details: error?.message || String(error),
    });
  }
}
