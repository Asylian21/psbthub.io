-- Enforces strict alphanumeric share IDs and removes legacy IDs with special characters.
-- Legacy rows are deleted so the stricter constraint can be validated immediately.
delete from public.psbt_shares
where id !~ '^[A-Za-z0-9]{22}$';

alter table public.psbt_shares
  drop constraint if exists psbt_shares_id_format;

alter table public.psbt_shares
  add constraint psbt_shares_id_format
  check (id ~ '^[A-Za-z0-9]{22}$');

create or replace function public.create_psbt_share(
  input_id text,
  input_ciphertext_payload text,
  input_size_bytes integer,
  input_version smallint,
  input_expires_at timestamptz,
  input_delete_token_hash text
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
  normalized_delete_token_hash text := lower(btrim(input_delete_token_hash));
  inserted_row public.psbt_shares%rowtype;
begin
  if normalized_share_id is null or normalized_share_id = '' then
    raise exception using errcode = '22023', message = 'Share id is required.';
  end if;

  if normalized_share_id !~ '^[A-Za-z0-9]{22}$' then
    raise exception using errcode = '22023', message = 'Share id format is invalid.';
  end if;

  if normalized_delete_token_hash is null or normalized_delete_token_hash = '' then
    raise exception using errcode = '22023', message = 'Delete token hash is required.';
  end if;

  if normalized_delete_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Delete token hash format is invalid.';
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
    delete_token_hash,
    size_bytes,
    version,
    expires_at
  )
  values (
    normalized_share_id,
    input_ciphertext_payload,
    normalized_delete_token_hash,
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

revoke all on function public.create_psbt_share(text, text, integer, smallint, timestamptz, text) from public;
grant execute on function public.create_psbt_share(text, text, integer, smallint, timestamptz, text) to anon, authenticated;

create or replace function public.delete_psbt_share_by_id(
  input_share_id text,
  input_delete_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_share_id text := btrim(input_share_id);
  normalized_delete_token_hash text := lower(btrim(input_delete_token_hash));
  deleted_row_count integer := 0;
begin
  if normalized_share_id is null or normalized_share_id = '' then
    return false;
  end if;

  if normalized_share_id !~ '^[A-Za-z0-9]{22}$' then
    return false;
  end if;

  if normalized_delete_token_hash is null or normalized_delete_token_hash = '' then
    return false;
  end if;

  if normalized_delete_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  delete from public.psbt_shares
  where id = normalized_share_id
    and delete_token_hash = normalized_delete_token_hash;

  get diagnostics deleted_row_count = row_count;
  return deleted_row_count > 0;
end;
$$;

revoke all on function public.delete_psbt_share_by_id(text, text) from public;
grant execute on function public.delete_psbt_share_by_id(text, text) to anon, authenticated;
