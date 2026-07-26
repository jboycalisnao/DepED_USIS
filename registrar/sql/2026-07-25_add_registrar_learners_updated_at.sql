alter table if exists registrar_learners
  add column if not exists updated_at timestamptz;

update registrar_learners
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table if exists registrar_learners
  alter column updated_at set default now();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_registrar_learners_updated_at on registrar_learners;
create trigger trg_registrar_learners_updated_at
before update on registrar_learners
for each row execute function set_updated_at();
