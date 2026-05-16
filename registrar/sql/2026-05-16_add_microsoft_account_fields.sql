alter table registrar_learners
  add column if not exists microsoft_user_id text,
  add column if not exists microsoft_upn text,
  add column if not exists microsoft_mail_nickname text,
  add column if not exists microsoft_account_status text,
  add column if not exists microsoft_license_sku_id text,
  add column if not exists microsoft_created_at timestamptz,
  add column if not exists microsoft_last_synced_at timestamptz;

create unique index if not exists registrar_learners_microsoft_upn_uq
  on registrar_learners (microsoft_upn)
  where microsoft_upn is not null;
