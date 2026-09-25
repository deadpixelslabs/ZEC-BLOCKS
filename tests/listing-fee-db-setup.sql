\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create table public.zecblocks_zec_listings(listing_id text primary key,token_id integer,seller_commitment text,price_zec numeric(20,8),expires_at bigint,status text,signed_message text,seller_payout text);
create table public.zecblocks_zecs_zec_orders(order_id text primary key,seller_commitment text,amount_zecs bigint,price_zat numeric(30,0),expires_at bigint,status text,signed_message text,seller_payout text);
insert into public.zecblocks_zec_listings values('legacy',5000,repeat('a',64),0.05,2000000000,'active','legacy signed terms','t1Legacy');
