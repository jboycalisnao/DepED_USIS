alter table registrar_learners
  add column if not exists profile_photo_drive_file_id text,
  add column if not exists profile_photo_mime_type text,
  add column if not exists profile_photo_updated_at timestamptz;

create index if not exists idx_registrar_learners_profile_photo_drive_file_id
  on registrar_learners(profile_photo_drive_file_id);
