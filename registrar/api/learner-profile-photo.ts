import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './enrollment-email-shared.js';
import { deleteProfilePhotoFromDrive, fetchProfilePhotoFromDrive, uploadProfilePhotoToDrive } from '../../common/server/googleDriveProfilePhotos.js';
import { assertSquareImage } from '../../common/server/imageDimensions.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const toText = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const readBody = (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body) as Record<string, unknown>;
  return {};
};

const extensionForMimeType = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'DELETE') {
      const body = readBody(req);
      const learnerId = toText(body.learnerId || req.query.learnerId);
      if (!learnerId) return json(res, 400, { error: 'learnerId is required.' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: learnerRow, error: learnerError } = await supabaseAdmin
        .from('registrar_learners')
        .select('id,profile_photo_drive_file_id')
        .eq('id', learnerId)
        .maybeSingle();

      if (learnerError) throw learnerError;
      if (!learnerRow) return json(res, 404, { error: 'Learner record was not found.' });

      const fileId = toText((learnerRow as any).profile_photo_drive_file_id);
      if (fileId) await deleteProfilePhotoFromDrive(fileId);

      const { error: updateError } = await supabaseAdmin
        .from('registrar_learners')
        .update({
          profile_photo_drive_file_id: null,
          profile_photo_mime_type: null,
          profile_photo_updated_at: null,
        })
        .eq('id', learnerId);

      if (updateError) throw updateError;

      return json(res, 200, { ok: true, removed: Boolean(fileId) });
    }

    if (req.method === 'GET') {
      const learnerId = toText(req.query.learnerId);
      const lrn = toText(req.query.lrn);
      if (!learnerId) return json(res, 400, { error: 'learnerId is required.' });

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

      if (!photoRow || !fileId) return json(res, 404, { error: 'Learner profile picture was not found.', hasLearner: Boolean(photoRow), learnerId, lrn });

      const photo = await fetchProfilePhotoFromDrive(fileId);
      res.status(200);
      res.setHeader('Content-Type', toText(photoRow.profile_photo_mime_type) || photo.contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(photo.bytes);
      return;
    }

    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed.' });
    }

    const body = readBody(req);
    const learnerId = toText(body.learnerId);
    const mimeType = toText(body.mimeType).toLowerCase();
    const dataBase64 = toText(body.dataBase64).replace(/^data:[^;]+;base64,/, '');

    if (!learnerId) return json(res, 400, { error: 'learnerId is required.' });
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return json(res, 400, { error: 'Use a JPG, PNG, or WebP image.' });
    if (!dataBase64) return json(res, 400, { error: 'Image data is required.' });

    const bytes = Buffer.from(dataBase64, 'base64');
    if (!bytes.length) return json(res, 400, { error: 'Image data is invalid.' });
    if (bytes.length > MAX_FILE_BYTES) return json(res, 400, { error: 'Profile picture must be 2 MB or smaller.' });
    assertSquareImage(bytes, mimeType);

    const supabaseAdmin = getSupabaseAdmin();
    const { data: learnerRow, error: learnerError } = await supabaseAdmin
      .from('registrar_learners')
      .select('id,lrn,profile_photo_drive_file_id')
      .eq('id', learnerId)
      .maybeSingle();

    if (learnerError) throw learnerError;
    if (!learnerRow) return json(res, 404, { error: 'Learner record was not found.' });

    const lrn = toText((learnerRow as any).lrn) || learnerId;
    const fileName = `${lrn}-profile-photo.${extensionForMimeType(mimeType)}`;
    const uploadResult = await uploadProfilePhotoToDrive({
      fileName,
      mimeType,
      bytes,
      existingFileId: toText((learnerRow as any).profile_photo_drive_file_id),
    });

    const updatedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('registrar_learners')
      .update({
        profile_photo_drive_file_id: uploadResult.id,
        profile_photo_mime_type: uploadResult.mimeType,
        profile_photo_updated_at: updatedAt,
      })
      .eq('id', learnerId);

    if (updateError) throw updateError;

    const { data: savedRow, error: savedError } = await supabaseAdmin
      .from('registrar_learners')
      .select('id,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
      .eq('id', learnerId)
      .maybeSingle();

    if (savedError) throw savedError;
    if (toText((savedRow as any)?.profile_photo_drive_file_id) !== uploadResult.id) {
      throw new Error('Google Drive upload completed, but the learner photo file ID was not saved in Supabase.');
    }

    return json(res, 200, {
      ok: true,
      profilePhotoDriveFileId: uploadResult.id,
      profilePhotoMimeType: uploadResult.mimeType,
      profilePhotoUpdatedAt: updatedAt,
    });
  } catch (error: any) {
    return json(res, 500, {
      error: 'Unable to upload learner profile picture.',
      details: error?.message || String(error),
    });
  }
}
