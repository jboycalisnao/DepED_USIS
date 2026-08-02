create table if not exists public.registrar_document_signatories (
  school_id text primary key,
  registrar_name text not null default 'Registrar',
  registrar_position text not null default 'School Registrar',
  principal_name text not null default 'School Principal',
  principal_position text not null default 'School Principal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.registrar_document_signatories
  add column if not exists registrar_position text not null default 'School Registrar';

alter table if exists public.registrar_document_signatories
  add column if not exists principal_position text not null default 'School Principal';

alter table if exists public.registrar_document_signatories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_document_signatories'
      and policyname = 'Registrar document signatories select'
  ) then
    create policy "Registrar document signatories select"
      on public.registrar_document_signatories
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_document_signatories'
      and policyname = 'Registrar document signatories insert'
  ) then
    create policy "Registrar document signatories insert"
      on public.registrar_document_signatories
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_document_signatories'
      and policyname = 'Registrar document signatories update'
  ) then
    create policy "Registrar document signatories update"
      on public.registrar_document_signatories
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_registrar_document_signatories_updated_at on public.registrar_document_signatories;
create trigger trg_registrar_document_signatories_updated_at
before update on public.registrar_document_signatories
for each row execute function public.set_updated_at();
