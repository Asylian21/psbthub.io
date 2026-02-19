# Security Migration Rollout Checklist

This runbook covers safe rollout of the hardening migration:

- close direct `anon/authenticated` inserts into `public.psbt_shares`
- enforce strict ciphertext payload validation at database level
- create shares only via `public.create_psbt_share(...)`
- enable server-side per-IP rate limiting in the create path

## Scope

- migration file: `supabase/migrations/0006_harden_share_creation_path.sql`
- affected runtime path: share creation (`useUpload` -> `shareRepository.insertShare` -> RPC)

## Pre-Deployment Gate

- Ensure branch is green:
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run test:e2e`
- Confirm migration order is correct (0001 -> ... -> 0006).
- Confirm no manual DB changes exist in staging/production that conflict with 0006 objects.

## Stage 1: Staging Rollout

1. Deploy app code + migration to staging.
2. Apply migration 0006 on staging.
3. Run smoke checks:
   - create a fragment-mode share from UI
   - create a password-mode share from UI
   - open/decrypt both shares
   - verify manual deletion still works
4. Run DB validation checks:

```sql
-- Direct insert path should be closed.
select has_table_privilege('anon', 'public.psbt_shares', 'insert') as anon_can_insert;
select has_table_privilege('authenticated', 'public.psbt_shares', 'insert') as authenticated_can_insert;

-- Insert RLS policy should be absent.
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'psbt_shares'
  and cmd = 'INSERT';

-- RPC must exist and be executable by anon/authenticated.
select has_function_privilege(
  'anon',
  'public.create_psbt_share(text, text, integer, smallint, timestamp with time zone, text)',
  'EXECUTE'
) as anon_can_execute_create_rpc;
```

Expected results:

- both `*_can_insert` values are `false`
- no `INSERT` policy rows returned
- `anon_can_execute_create_rpc` is `true`

## Stage 2: Staging Soak and Monitoring

Observe for at least 30-60 minutes under normal and burst traffic tests.

### A) Share creation throughput (successful inserts)

```sql
select
  date_trunc('minute', created_at) as minute_bucket,
  count(*) as successful_share_creates
from public.psbt_shares
where created_at >= timezone('utc', now()) - interval '2 hours'
group by 1
order by 1 desc;
```

### B) Rate-limit pressure (attempt counters)

```sql
select
  bucket_start,
  ip,
  request_count,
  greatest(request_count - 12, 0) as estimated_rejected
from private.psbt_share_rate_limit_counters
where bucket_start >= timezone('utc', now()) - interval '2 hours'
order by bucket_start desc, request_count desc
limit 200;
```

### C) Aggregated estimated 429 ratio (per minute)

```sql
with per_bucket as (
  select
    bucket_start,
    sum(request_count) as total_attempts,
    sum(greatest(request_count - 12, 0)) as estimated_rejected
  from private.psbt_share_rate_limit_counters
  where bucket_start >= timezone('utc', now()) - interval '2 hours'
  group by bucket_start
)
select
  bucket_start,
  total_attempts,
  estimated_rejected,
  case
    when total_attempts = 0 then 0
    else round((estimated_rejected::numeric / total_attempts::numeric) * 100, 2)
  end as estimated_rejected_pct
from per_bucket
order by bucket_start desc;
```

### D) Postgres/API logs (hard errors)

Track errors containing:

- `PSBTHUB_RATE_LIMITED` (429 expected under abuse tests)
- `Ciphertext payload format or size is invalid.`
- `Share size metadata is outside accepted bounds.`
- any unexpected `INSERT_FAILED` spikes from app telemetry

## Stage 3: Production Rollout

1. Deploy during a low-traffic window.
2. Apply migration 0006 to production.
3. Run the same smoke checks immediately.
4. Monitor first 15, 30, and 60 minutes with the queries above.

Suggested incident thresholds (tune to your baseline):

- estimated rejected ratio `> 5%` for `>= 15 minutes` on normal traffic
- successful creates drop `> 50%` versus same weekday/hour baseline
- repeated app-side `STORE_FAILED` not explained by `RATE_LIMITED`

## Backout Plan

Use backout only for availability emergencies. It reduces abuse resistance.

### Option A: Fast mitigation (keep RPC path, relax limiter)

Replace limiter with a no-op temporarily:

```sql
create or replace function private.consume_psbt_share_write_quota()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  return;
end;
$$;
```

### Option B: Full temporary reopen of legacy insert path

```sql
grant insert on public.psbt_shares to anon, authenticated;

drop policy if exists psbt_shares_public_insert on public.psbt_shares;
create policy psbt_shares_public_insert
  on public.psbt_shares
  for insert
  to anon, authenticated
  with check (
    expires_at > timezone('utc', now())
    and expires_at <= timezone('utc', now()) + interval '31 days'
  );
```

After incident resolution, re-apply hardened behavior and verify with Stage 1 DB checks.

## Post-Rollout Cleanup

- Remove emergency temporary overrides (if used).
- Document observed baseline values:
  - successful creates/minute
  - estimated rejected pct
  - top rate-limited IP distribution
- Keep this file updated whenever create-path limits or RPC behavior changes.
