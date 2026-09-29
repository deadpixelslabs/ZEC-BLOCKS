-- Extend the existing private chain projection with exact listing prices.
alter table public.rh20_holder_orders add column price numeric(78,0) check (price>=100 and price<=115792089237316195423570985008687907853269984665640564039457584007913129639935);
-- If an older projection already contains orders, replay it from genesis.
-- Preserve the published holder count while rebuilding; invalidate any old lease.
do $$ begin
  perform 1 from public.rh20_holder_state where id for update;
  if exists(select 1 from public.rh20_holder_orders where price is null) then
    delete from public.rh20_holder_events; delete from public.rh20_holder_checkpoints;
    delete from public.rh20_holder_orders; delete from public.rh20_holder_balances;
    update public.rh20_holder_state set cursor_block=start_block-1,cursor_hash=null,computed_holders=0,status='indexing',lease_id=null,lease_until=null,last_started_at=null where id;
  end if;
end $$;
alter table public.rh20_holder_orders alter column price set not null;
-- Thirty fractional wei digits distinguish any ratio for RHSC amounts <=21M.
create index rh20_market_unit_price on public.rh20_holder_orders ((price::numeric(110,30)/amount),listing_id) where state=1;
create or replace function public.rh20_holder_event(p_event jsonb,p_reverse boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare k text:=p_event->>'kind'; n bigint; listing bigint; row_data public.rh20_holder_orders%rowtype; factor integer:=case when p_reverse then -1 else 1 end;
begin
  if k='transfer' then
    n:=(p_event->>'amount')::bigint;
    if n<=0 or n>21000000 then raise exception 'Invalid transfer amount'; end if;
    if not p_reverse then
      perform public.rh20_holder_delta(p_event->>'from',-n,0);
      perform public.rh20_holder_delta(p_event->>'to',n,0);
    else
      perform public.rh20_holder_delta(p_event->>'to',-n,0);
      perform public.rh20_holder_delta(p_event->>'from',n,0);
    end if;
  elsif k='listed' then
    listing:=(p_event->>'id')::bigint; n:=(p_event->>'amount')::bigint;
    if p_reverse then
      select * into strict row_data from public.rh20_holder_orders where listing_id=listing;
      if row_data.state<>1 or row_data.seller<>p_event->>'seller' or row_data.amount<>n then raise exception 'Invalid listing undo'; end if;
      delete from public.rh20_holder_orders where listing_id=listing;
    else
      if (p_event->>'price') is null then raise exception 'Missing canonical listing price'; end if;
      insert into public.rh20_holder_orders(listing_id,seller,amount,state,price) values(listing,p_event->>'seller',n,1,(p_event->>'price')::numeric);
    end if;
    perform public.rh20_holder_delta(p_event->>'seller',0,n*factor);
  elsif k in ('bought','cancelled') then
    listing:=(p_event->>'id')::bigint;
    select * into row_data from public.rh20_holder_orders where listing_id=listing for update;
    if not found and k='cancelled' then return false; end if; -- another ticker
    if not found then raise exception 'Missing RHSC listing'; end if;
    if k='cancelled' and row_data.seller<>p_event->>'seller' then raise exception 'Cancellation seller differs'; end if;
    if (not p_reverse and row_data.state<>1) or (p_reverse and row_data.state<>case when k='bought' then 2 else 3 end) then raise exception 'Invalid listing state'; end if;
    if k='bought' and row_data.amount<>(p_event->>'amount')::bigint then raise exception 'Purchase amount differs'; end if;
    perform public.rh20_holder_delta(row_data.seller,0,-row_data.amount*factor);
    update public.rh20_holder_orders set state=case when p_reverse then 1 when k='bought' then 2 else 3 end where listing_id=listing;
  else raise exception 'Unknown holder event'; end if;
  return true;
end $$;


create function public.rh20_market_board(p_offset integer default 0,p_limit integer default 12)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; s public.rh20_holder_state%rowtype;
begin
  if p_offset<0 or p_offset>1000000 or p_limit<1 or p_limit>12 then raise exception 'Invalid market page'; end if;
  select * into strict s from public.rh20_holder_state where id;
  select coalesce(jsonb_agg(q.listing_id::text order by q.unit_price,q.listing_id),'[]'::jsonb) into result
    from (select listing_id,price::numeric(110,30)/amount as unit_price from public.rh20_holder_orders where state=1 order by price::numeric(110,30)/amount,listing_id offset p_offset limit p_limit) q;
  return jsonb_build_object('chainId',4663,'ticker','RHSC','marketplaceAddress','0x3E6E91232CE0895C6154b66800ee5c8B8EE83CFC','sort','unit-price-asc','ids',result,'offset',p_offset,'total',(select count(*) from public.rh20_holder_orders where state=1),'blockNumber',s.cursor_block,'updatedAt',s.published_at,'status',case when s.published_at<now()-interval '90 seconds' then 'delayed' else s.status end);
end $$;
revoke all on function public.rh20_market_board(integer,integer) from public,anon,authenticated;
grant execute on function public.rh20_market_board(integer,integer) to service_role;
