-- Fixes ambiguous identifier collision in rate-limit function.
-- `bucket_start` local variable name conflicted with table column resolution.
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
  rate_limit_bucket_start timestamptz := date_trunc('minute', timezone('utc', now()));
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
    rate_limit_bucket_start,
    1
  )
  on conflict (ip, bucket_start)
  do update set request_count = counters.request_count + 1
  returning counters.request_count into updated_count;

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
