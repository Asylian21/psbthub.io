-- Hardens public share creation against storage abuse and payload DoS.
-- 1) Removes direct anonymous table inserts.
-- 2) Enforces strict ciphertext envelope validation/size at database layer.
-- 3) Routes creation through a rate-limited SECURITY DEFINER RPC.
create schema if not exists private;

create table if not exists private.psbt_share_rate_limit_counters (
  ip inet not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  primary key (ip, bucket_start),
  constraint psbt_share_rate_limit_request_count_positive check (request_count > 0)
);

create index if not exists psbt_share_rate_limit_bucket_start_idx
  on private.psbt_share_rate_limit_counters (bucket_start);

create or replace function public.is_valid_psbt_share_ciphertext_payload(input_payload text)
returns boolean
language plpgsql
immutable
strict
as $$
declare
  -- Upper bound aligned with current envelope format (max ~1.9 MiB).
  max_payload_bytes constant integer := 2000000;
  envelope jsonb;
  key_derivation jsonb;
  raw_iterations text;
  parsed_iterations integer;
begin
  if octet_length(input_payload) <= 0 or octet_length(input_payload) > max_payload_bytes then
    return false;
  end if;

  begin
    envelope := input_payload::jsonb;
  exception
    when others then
      return false;
  end;

  if jsonb_typeof(envelope) <> 'object' then
    return false;
  end if;

  if envelope->>'version' <> '1' then
    return false;
  end if;

  if envelope->>'algorithm' <> 'AES-GCM-256' then
    return false;
  end if;

  if coalesce(envelope->>'iv', '') !~ '^[A-Za-z0-9_-]{16}$' then
    return false;
  end if;

  if coalesce(envelope->>'ciphertext', '') !~ '^[A-Za-z0-9_-]{24,}$' then
    return false;
  end if;

  if not (envelope ? 'keyDerivation') then
    if (envelope - 'version' - 'algorithm' - 'iv' - 'ciphertext') <> '{}'::jsonb then
      return false;
    end if;

    return true;
  end if;

  if (envelope - 'version' - 'algorithm' - 'iv' - 'ciphertext' - 'keyDerivation') <> '{}'::jsonb then
    return false;
  end if;

  key_derivation := envelope->'keyDerivation';

  if key_derivation is null or jsonb_typeof(key_derivation) <> 'object' then
    return false;
  end if;

  if key_derivation->>'type' <> 'PBKDF2-SHA256' then
    return false;
  end if;

  if (key_derivation - 'type' - 'salt' - 'iterations') <> '{}'::jsonb then
    return false;
  end if;

  if coalesce(key_derivation->>'salt', '') !~ '^[A-Za-z0-9_-]{22}$' then
    return false;
  end if;

  raw_iterations := coalesce(key_derivation->>'iterations', '');

  if raw_iterations !~ '^[0-9]+$' then
    return false;
  end if;

  parsed_iterations := raw_iterations::integer;

  if parsed_iterations < 100000 or parsed_iterations > 1000000 then
    return false;
  end if;

  return true;
end;
$$;

alter table public.psbt_shares
  drop constraint if exists psbt_shares_ciphertext_payload_valid;

alter table public.psbt_shares
  add constraint psbt_shares_ciphertext_payload_valid
  check (public.is_valid_psbt_share_ciphertext_payload(ciphertext_payload))
  not valid;

drop policy if exists psbt_shares_public_insert on public.psbt_shares;

revoke insert on public.psbt_shares from anon, authenticated;

create or replace function private.consume_psbt_share_write_quota()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  max_requests_per_minute_per_ip constant integer := 12;
  headers jsonb := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  raw_ip text := coalesce(
    nullif(headers->>'cf-connecting-ip', ''),
    nullif(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1), ''),
    '0.0.0.0'
  );
  client_ip inet;
  bucket_start timestamptz := date_trunc('minute', timezone('utc', now()));
  updated_count integer;
begin
  begin
    client_ip := raw_ip::inet;
  exception
    when others then
      client_ip := '0.0.0.0'::inet;
  end;

  insert into private.psbt_share_rate_limit_counters as counters (
    ip,
    bucket_start,
    request_count
  )
  values (
    client_ip,
    bucket_start,
    1
  )
  on conflict (ip, bucket_start)
  do update set request_count = counters.request_count + 1
  returning request_count into updated_count;

  if updated_count > max_requests_per_minute_per_ip then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'PSBTHUB_RATE_LIMITED',
        'message', 'Too many share creation requests from this IP.',
        'details', 'Please retry in about one minute.'
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests'
      )::text;
  end if;
end;
$$;

revoke all on function private.consume_psbt_share_write_quota() from public;

create or replace function public.create_psbt_share(
  input_id text,
  input_ciphertext_payload text,
  input_size_bytes integer,
  input_version smallint,
  input_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  max_size_bytes constant integer := 1048576;
  now_utc timestamptz := timezone('utc', now());
  normalized_share_id text := btrim(input_id);
  inserted_row public.psbt_shares%rowtype;
begin
  if normalized_share_id is null or normalized_share_id = '' then
    raise exception using errcode = '22023', message = 'Share id is required.';
  end if;

  if input_size_bytes is null or input_size_bytes <= 0 or input_size_bytes > max_size_bytes then
    raise exception using errcode = '22023', message = 'Share size metadata is outside accepted bounds.';
  end if;

  if input_version is null or input_version <> 1 then
    raise exception using errcode = '22023', message = 'Share payload version is invalid.';
  end if;

  if input_expires_at is null then
    raise exception using errcode = '22023', message = 'Share expiration timestamp is required.';
  end if;

  if input_expires_at <= now_utc or input_expires_at > now_utc + interval '31 days' then
    raise exception using errcode = '22023', message = 'Share expiration timestamp is outside accepted bounds.';
  end if;

  if not public.is_valid_psbt_share_ciphertext_payload(input_ciphertext_payload) then
    raise exception using errcode = '22023', message = 'Ciphertext payload format or size is invalid.';
  end if;

  perform private.consume_psbt_share_write_quota();

  insert into public.psbt_shares (
    id,
    ciphertext_payload,
    size_bytes,
    version,
    expires_at
  )
  values (
    normalized_share_id,
    input_ciphertext_payload,
    input_size_bytes,
    input_version,
    input_expires_at
  )
  returning * into inserted_row;

  return jsonb_build_object(
    'id', inserted_row.id,
    'ciphertext_payload', inserted_row.ciphertext_payload,
    'size_bytes', inserted_row.size_bytes,
    'version', inserted_row.version,
    'created_at', inserted_row.created_at,
    'expires_at', inserted_row.expires_at
  );
end;
$$;

revoke all on function public.create_psbt_share(text, text, integer, smallint, timestamptz) from public;
grant execute on function public.create_psbt_share(text, text, integer, smallint, timestamptz) to anon, authenticated;

create or replace function private.purge_psbt_share_rate_limit_counters()
returns integer
language plpgsql
security definer
set search_path = private
as $$
declare
  deleted_row_count integer := 0;
begin
  delete from private.psbt_share_rate_limit_counters
  where bucket_start < timezone('utc', now()) - interval '2 hours';

  get diagnostics deleted_row_count = row_count;
  return deleted_row_count;
end;
$$;

revoke all on function private.purge_psbt_share_rate_limit_counters() from public;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'psbt_share_rate_limit_cleanup';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'psbt_share_rate_limit_cleanup',
    '*/10 * * * *',
    $schedule$select private.purge_psbt_share_rate_limit_counters();$schedule$
  );
end;
$$;
