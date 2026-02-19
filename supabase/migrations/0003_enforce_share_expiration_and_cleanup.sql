-- Enforces bounded expiry for all shares and configures periodic cleanup.
-- Also tightens insert/select policies to active share windows only.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

update public.psbt_shares
set expires_at = created_at + interval '31 days'
where expires_at is null
  or expires_at <= created_at
  or expires_at > created_at + interval '31 days';

alter table public.psbt_shares
  alter column expires_at set default (timezone('utc', now()) + interval '31 days');

alter table public.psbt_shares
  alter column expires_at set not null;

alter table public.psbt_shares
  drop constraint if exists psbt_shares_expiry_after_creation;

alter table public.psbt_shares
  drop constraint if exists psbt_shares_expiry_window;

alter table public.psbt_shares
  add constraint psbt_shares_expiry_window check (
    expires_at > created_at
    and expires_at <= created_at + interval '31 days'
  );

drop policy if exists psbt_shares_public_insert on public.psbt_shares;
create policy psbt_shares_public_insert
  on public.psbt_shares
  for insert
  to anon, authenticated
  with check (
    expires_at > timezone('utc', now())
    and expires_at <= timezone('utc', now()) + interval '31 days'
  );

drop policy if exists psbt_shares_public_select_active on public.psbt_shares;
create policy psbt_shares_public_select_active
  on public.psbt_shares
  for select
  to anon, authenticated
  using (expires_at > timezone('utc', now()));

create or replace function public.purge_expired_psbt_shares()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_row_count integer := 0;
begin
  delete from public.psbt_shares
  where expires_at <= timezone('utc', now());

  get diagnostics deleted_row_count = row_count;
  return deleted_row_count;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'psbt_shares_cleanup_expired';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'psbt_shares_cleanup_expired',
    '* * * * *',
    $schedule$select public.purge_expired_psbt_shares();$schedule$
  );
end;
$$;
