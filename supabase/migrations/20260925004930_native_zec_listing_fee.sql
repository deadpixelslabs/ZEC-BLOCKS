-- Native ZEC listing fees are separate from the unchanged 0% sale fee.
create table public.zecblocks_listing_fee_intents (
  listing_id text primary key,
  asset text not null check (asset in ('ZEC_BLOCK','ZECS')),
  seller_commitment text not null check (seller_commitment ~ '^[0-9a-f]{64}$'),
  payment_address text not null,
  signed_message text not null,
  terms jsonb not null,
  baseline_txids jsonb not null default '[]',
  request jsonb not null default '{}',
  pending_txid text check (pending_txid ~ '^[0-9a-f]{64}$'),
  watch_at timestamptz,
  created_at timestamptz not null default now(),
  payment_txid text unique check (payment_txid ~ '^[0-9a-f]{64}$'),
  paid_height bigint check (paid_height > 0),
  paid_at timestamptz,
  check ((payment_txid is null and paid_height is null and paid_at is null) or
         (payment_txid is not null and paid_height is not null and paid_at is not null))
);
create index zecblocks_listing_fee_watch on public.zecblocks_listing_fee_intents(watch_at) where watch_at is not null;
alter table public.zecblocks_listing_fee_intents enable row level security;
revoke all on public.zecblocks_listing_fee_intents from public, anon, authenticated, service_role;
grant select,insert on public.zecblocks_listing_fee_intents to service_role;
grant update(pending_txid,watch_at) on public.zecblocks_listing_fee_intents to service_role;

-- Freeze existing terms at cutover; neither a new ID nor new terms inherit a waiver.
create table public.zecblocks_listing_fee_legacy (
  listing_id text primary key, asset text not null, terms jsonb not null
);
insert into public.zecblocks_listing_fee_legacy
 select listing_id,'ZEC_BLOCK',jsonb_build_object('seller',seller_commitment,'token',token_id,'price',(price_zec*100000000)::bigint::text,'expires',expires_at,'message',signed_message)
 from public.zecblocks_zec_listings;
insert into public.zecblocks_listing_fee_legacy
 select order_id,'ZECS',jsonb_build_object('seller',seller_commitment,'amount',amount_zecs,'price',price_zat::bigint::text,'expires',expires_at,'message',signed_message)
 from public.zecblocks_zecs_zec_orders;
alter table public.zecblocks_listing_fee_legacy enable row level security;
revoke all on public.zecblocks_listing_fee_legacy from public,anon,authenticated,service_role;
grant select on public.zecblocks_listing_fee_legacy to service_role;

create function public.zecblocks_record_listing_fee(p_listing_id text,p_txid text,p_height bigint,p_time bigint)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.zecblocks_listing_fee_intents%rowtype;
begin
  select * into strict r from public.zecblocks_listing_fee_intents where listing_id=p_listing_id for update;
  if p_txid is null or p_txid !~ '^[0-9a-f]{64}$' or p_height is null or p_height<1
     or p_time is null or p_time<extract(epoch from r.created_at)::bigint-180 then
    raise exception 'INVALID_LISTING_FEE_PROOF';
  end if;
  if r.payment_txid is not null then
    if r.payment_txid<>p_txid then raise exception 'LISTING_FEE_ALREADY_PAID'; end if;
    return;
  end if;
  -- Unique TXID serializes competing receipts across both asset types.
  update public.zecblocks_listing_fee_intents set payment_txid=p_txid,paid_height=p_height,paid_at=to_timestamp(p_time)
    where listing_id=p_listing_id;
end $$;
revoke all on function public.zecblocks_record_listing_fee(text,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.zecblocks_record_listing_fee(text,text,bigint,bigint) to service_role;

create function public.zecblocks_require_listing_fee() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare id text; asset_name text; v_terms jsonb; receipt public.zecblocks_listing_fee_intents%rowtype;
begin
  if new.status<>'active' then return new; end if;
  if TG_OP='UPDATE' and old.status in ('sold','cancelled') and new.status='active' then
    raise exception 'CLOSED_LISTING_CANNOT_REOPEN';
  end if;
  if TG_TABLE_NAME='zecblocks_zec_listings' then
    id:=new.listing_id; asset_name:='ZEC_BLOCK';
    v_terms:=jsonb_build_object('seller',new.seller_commitment,'token',new.token_id,'price',(new.price_zec*100000000)::bigint::text,'expires',new.expires_at,'message',new.signed_message);
  else
    id:=new.order_id; asset_name:='ZECS';
    v_terms:=jsonb_build_object('seller',new.seller_commitment,'amount',new.amount_zecs,'price',new.price_zat::bigint::text,'expires',new.expires_at,'message',new.signed_message);
  end if;
  if exists(select 1 from public.zecblocks_listing_fee_legacy l where l.listing_id=id and l.asset=asset_name and l.terms=v_terms) then return new; end if;
  select * into receipt from public.zecblocks_listing_fee_intents f where f.listing_id=id and f.asset=asset_name;
  if receipt.payment_txid is null or receipt.terms<>v_terms or receipt.payment_address is distinct from new.seller_payout then
    raise exception 'LISTING_FEE_REQUIRED';
  end if;
  return new;
end $$;
revoke all on function public.zecblocks_require_listing_fee() from public,anon,authenticated;
create trigger zecblocks_listing_fee_guard before insert or update on public.zecblocks_zec_listings
for each row execute function public.zecblocks_require_listing_fee();
create trigger zecblocks_listing_fee_guard before insert or update on public.zecblocks_zecs_zec_orders
for each row execute function public.zecblocks_require_listing_fee();
