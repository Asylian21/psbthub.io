-- Migrates share IDs from UUID-only to short URL-safe tokens.
-- Keeps backward compatibility by allowing both token and UUID formats.
alter table public.psbt_shares
  drop constraint if exists psbt_shares_uuid_v4;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'psbt_shares'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    alter table public.psbt_shares
      alter column id type text
      using id::text;
  end if;
end $$;

alter table public.psbt_shares
  drop constraint if exists psbt_shares_id_format;

alter table public.psbt_shares
  add constraint psbt_shares_id_format
  check (
    id ~ '^[A-Za-z0-9_-]{22}$'
    or id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  );
