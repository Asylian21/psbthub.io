-- Initial schema for encrypted PSBT share storage.
-- Stores ciphertext + minimal metadata only (no plaintext/key material).
create table if not exists public.psbt_shares (
  id uuid primary key,
  ciphertext_payload text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 524288),
  version smallint not null default 1 check (version = 1),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz null,
  constraint psbt_shares_expiry_after_creation check (
    expires_at is null or expires_at > created_at
  ),
  constraint psbt_shares_ciphertext_not_empty check (
    char_length(ciphertext_payload) > 0
  ),
  constraint psbt_shares_uuid_v4 check (
    substring(id::text, 15, 1) = '4'
  )
);

create index if not exists psbt_shares_created_at_idx
  on public.psbt_shares (created_at desc);

create index if not exists psbt_shares_expires_at_idx
  on public.psbt_shares (expires_at);

alter table public.psbt_shares enable row level security;

drop policy if exists psbt_shares_public_insert on public.psbt_shares;
create policy psbt_shares_public_insert
  on public.psbt_shares
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists psbt_shares_public_select_active on public.psbt_shares;
create policy psbt_shares_public_select_active
  on public.psbt_shares
  for select
  to anon, authenticated
  using (
    expires_at is null or expires_at > timezone('utc', now())
  );
