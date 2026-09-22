-- Public proof directory; only the signature-verifying Edge Function can insert.
-- Bindings are immutable: older signed proofs cannot replace a destination.
create table public.zecblocks_nft_addresses (
  address text primary key check (address ~ '^t1[1-9A-HJ-NP-Za-km-z]{33}$'),
  owner_commitment text not null check (owner_commitment ~ '^[0-9a-f]{64}$'),
  proof jsonb not null check (jsonb_typeof(proof) = 'object' and octet_length(proof::text) <= 6000),
  created_at timestamptz not null default now()
);
alter table public.zecblocks_nft_addresses enable row level security;
revoke all on public.zecblocks_nft_addresses from anon, authenticated;
revoke all on public.zecblocks_nft_addresses from service_role;
grant select, insert on public.zecblocks_nft_addresses to service_role;
comment on table public.zecblocks_nft_addresses is 'Opt-in public t1-to-NFT identity links with signatures from both keys. Clients independently verify every resolution.';
