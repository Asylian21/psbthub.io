-- Aligns database PSBT size metadata bound with frontend validation (1 MiB).
alter table public.psbt_shares
  drop constraint if exists psbt_shares_size_bytes_check;

alter table public.psbt_shares
  add constraint psbt_shares_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 1048576);
