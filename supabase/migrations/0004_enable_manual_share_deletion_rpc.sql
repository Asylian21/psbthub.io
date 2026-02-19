-- Adds capability-style manual deletion RPC by share ID.
-- Returns boolean so the client can distinguish "deleted" vs "already absent".
create or replace function public.delete_psbt_share_by_id(input_share_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_share_id text := btrim(input_share_id);
  deleted_row_count integer := 0;
begin
  if normalized_share_id is null or normalized_share_id = '' then
    return false;
  end if;

  delete from public.psbt_shares
  where id = normalized_share_id;

  get diagnostics deleted_row_count = row_count;
  return deleted_row_count > 0;
end;
$$;

revoke all on function public.delete_psbt_share_by_id(text) from public;
grant execute on function public.delete_psbt_share_by_id(text) to anon, authenticated;
