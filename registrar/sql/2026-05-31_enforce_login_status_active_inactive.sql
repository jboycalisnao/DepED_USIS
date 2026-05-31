-- Enforce learner portal credential status values used by registrar credentials UI.
-- Active accounts can sign in. Inactive accounts are blocked from portal access.

alter table if exists registrar_learners
  alter column login_status set default 'Active';

update registrar_learners
set login_status = case
  when lower(coalesce(login_status, '')) in ('active') then 'Active'
  when lower(coalesce(login_status, '')) in ('inactive', 'disabled') then 'Inactive'
  else 'Active'
end;

alter table if exists registrar_learners
  alter column login_status set not null;

alter table if exists registrar_learners
  drop constraint if exists registrar_learners_login_status_check;

alter table if exists registrar_learners
  add constraint registrar_learners_login_status_check
  check (login_status in ('Active', 'Inactive'));

create index if not exists registrar_learners_login_status_idx
  on registrar_learners (login_status);
