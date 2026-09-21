-- Incident: production V12.7.12 rendered zero listings while canonical SQL had 45.
-- Changes below have been applied through Supabase migrations:
--   index_public_claim_counter_read_path
--   fix_public_counter_privilege_boundary
-- No ownership, sale, payment, fee, reservation or listing-status rows are modified.

set local lock_timeout = '2s';
set local statement_timeout = '20s';

-- Public counter requests were repeatedly scanning the large event heap and
-- evaluating the TXID regex. This predicate exactly matches claims_seen_live().
create index if not exists zecblocks_events_public_claim_count_idx
  on public.zecblocks_events (token_id)
  where event_type = 'CLAIM'
    and token_id between 1 and 5000
    and lower(coalesce(txid, '')) ~ '^[0-9a-f]{64}$';

analyze public.zecblocks_events;

-- Anonymous callers are allowed to see the aggregate count, not raw observation
-- records. The previous invoker function failed with permission denied for
-- zecblocks_claim_observed when called through the public marketplace snapshot.
alter function public.zecblocks_claims_seen_live() security definer;
alter function public.zecblocks_claims_seen_live() set search_path = public, pg_temp;
grant execute on function public.zecblocks_claims_seen_live() to anon, authenticated;

-- Regression checks, run as the role used by a fresh unauthenticated visitor:
-- begin;
-- set local role anon;
-- select public.zecblocks_claims_seen_live();
-- select jsonb_array_length(public.zecblocks_usdc_market_board()->'usdc_listings');
-- select public.zecblocks_market_snapshot()->'claims_seen';
-- rollback;
