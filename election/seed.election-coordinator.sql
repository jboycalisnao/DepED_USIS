-- TEMPORARY SEED FOR ELECTION REGISTRATION LOGIN
-- Uses a 6-digit school ID and a temporary plaintext password field.
-- Adjust the values below before production use.

alter table public.election_coordinators
  add column if not exists password_plain text;

do $$
declare
  target_school_code text := '123456';
  target_school_name text := 'Leon National High School';
  target_school_division text := 'Schools Division of Iloilo';
  target_school_region text := 'Region VI - Western Visayas';
  target_username text := 'election.coordinator';
  target_email text := 'election.coordinator@123456.local';
  target_password text := 'Usis2026!';
  target_first_name text := 'Election';
  target_last_name text := 'Coordinator';
  target_election_code text := 'ELEC-26-SEED01';
  target_election_name text := 'Learner Government Election';
  target_election_type text := 'Learner Government';
  target_school_id uuid;
  target_election_id uuid;
  target_school_year_id text;
begin
  select id
  into target_school_year_id
  from public.registrar_school_years
  where coalesce(is_active, false) = true or coalesce("isActive", false) = true
  order by label desc
  limit 1;

  if target_school_year_id is null then
    select id
    into target_school_year_id
    from public.registrar_school_years
    order by label desc
    limit 1;
  end if;

  if target_school_year_id is null then
    raise exception 'No registrar_school_years row exists. Create a school year first.';
  end if;

  insert into public.usis_schools (
    school_code,
    school_name,
    division,
    region,
    address_line,
    municipality_city,
    province,
    is_active
  )
  values (
    target_school_code,
    target_school_name,
    target_school_division,
    target_school_region,
    'M.H. Del Pilar Street',
    'Leon',
    'Iloilo',
    true
  )
  on conflict (school_code) do update
    set school_name = excluded.school_name,
        division = excluded.division,
        region = excluded.region,
        address_line = coalesce(public.usis_schools.address_line, excluded.address_line),
        municipality_city = coalesce(public.usis_schools.municipality_city, excluded.municipality_city),
        province = coalesce(public.usis_schools.province, excluded.province)
  returning id into target_school_id;

  if target_school_id is null then
    select id
    into target_school_id
    from public.usis_schools
    where school_code = target_school_code
    limit 1;
  end if;

  insert into public.election_events (
    school_id,
    election_code,
    election_name,
    election_type,
    school_year_id,
    status,
    school_display_name
  )
  values (
    target_school_id,
    target_election_code,
    target_election_name,
    target_election_type,
    target_school_year_id,
    'OPEN',
    target_school_name
  )
  on conflict (school_id, election_code) do update
    set election_name = excluded.election_name,
        election_type = excluded.election_type,
        school_year_id = excluded.school_year_id,
        status = excluded.status,
        school_display_name = excluded.school_display_name
  returning id into target_election_id;

  if target_election_id is null then
    select id
    into target_election_id
    from public.election_events
    where school_id = target_school_id
      and election_code = target_election_code
    limit 1;
  end if;

  insert into public.election_coordinators (
    school_id,
    election_id,
    election_code,
    username,
    email,
    password_hash,
    password_plain,
    first_name,
    last_name,
    role,
    permissions,
    is_active
  )
  values (
    target_school_id,
    target_election_id,
    target_election_code,
    target_username,
    target_email,
    target_password,
    target_password,
    target_first_name,
    target_last_name,
    'election_admin',
    '["candidate.manage","ballot.audit","settings.manage"]'::jsonb,
    true
  )
  on conflict (school_id, election_code, username) do update
    set email = excluded.email,
        password_hash = excluded.password_hash,
        password_plain = excluded.password_plain,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        role = excluded.role,
        permissions = excluded.permissions,
        is_active = excluded.is_active;
end $$;

select
  ec.username,
  ec.email,
  ec.password_plain,
  ec.role,
  ec.is_active,
  ec.election_code,
  us.school_code,
  us.school_name,
  us.region,
  us.division
from public.election_coordinators ec
join public.usis_schools us on us.id = ec.school_id
where us.school_code = '123456'
order by ec.created_at desc;
