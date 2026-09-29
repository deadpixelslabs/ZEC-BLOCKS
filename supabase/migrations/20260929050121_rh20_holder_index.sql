-- RHSC holder projection. All writes are service-role only and derive from
-- canonical RH-20/marketplace events. Marketplace escrow belongs to its sellers.
create table public.rh20_holder_state (
  id boolean primary key default true check (id),
  start_block bigint not null default 75340072,
  cursor_block bigint not null default 75340071,
  cursor_hash text,
  computed_holders bigint not null default 0 check (computed_holders >= 0),
  published_holders bigint,
  published_block bigint,
  published_at timestamptz,
  status text not null default 'indexing' check (status in ('indexing','ready','delayed')),
  lease_id uuid,
  lease_until timestamptz,
  last_started_at timestamptz,
  last_error text
);
insert into public.rh20_holder_state(id) values(true);
create table public.rh20_holder_balances (
  account text primary key check (account ~ '^0x[0-9a-f]{40}$'),
  liquid bigint not null default 0 check (liquid >= 0),
  listed bigint not null default 0 check (listed >= 0)
);
create table public.rh20_holder_orders (
  listing_id bigint primary key,
  seller text not null check (seller ~ '^0x[0-9a-f]{40}$'),
  amount bigint not null check (amount > 0 and amount <= 21000000),
  state smallint not null check (state in (1,2,3))
);
create table public.rh20_holder_events (
  block_number bigint not null,
  log_index integer not null,
  tx_hash text not null,
  event jsonb not null,
  primary key(block_number,log_index),
  unique(tx_hash,log_index)
);
create table public.rh20_holder_checkpoints (
  block_number bigint primary key,
  block_hash text not null check (block_hash ~ '^0x[0-9a-f]{64}$')
);
alter table public.rh20_holder_state enable row level security;
alter table public.rh20_holder_balances enable row level security;
alter table public.rh20_holder_orders enable row level security;
alter table public.rh20_holder_events enable row level security;
alter table public.rh20_holder_checkpoints enable row level security;
revoke all on public.rh20_holder_state,public.rh20_holder_balances,public.rh20_holder_orders,public.rh20_holder_events,public.rh20_holder_checkpoints from public,anon,authenticated;
grant select,insert,update,delete on public.rh20_holder_state,public.rh20_holder_balances,public.rh20_holder_orders,public.rh20_holder_events,public.rh20_holder_checkpoints to service_role;

create function public.rh20_holder_delta(p_account text,p_liquid bigint,p_listed bigint)
returns void language plpgsql security invoker set search_path = '' as $$
declare before_total bigint; after_total bigint; eligible boolean;
begin
  if p_account='0x0000000000000000000000000000000000000000' then return; end if;
  insert into public.rh20_holder_balances(account) values(p_account) on conflict do nothing;
  select liquid+listed into strict before_total from public.rh20_holder_balances where account=p_account for update;
  update public.rh20_holder_balances set liquid=liquid+p_liquid,listed=listed+p_listed where account=p_account returning liquid+listed into after_total;
  eligible:=p_account<>'0x3e6e91232ce0895c6154b66800ee5c8b8ee83cfc';
  if eligible and ((before_total>0)<>(after_total>0)) then
    update public.rh20_holder_state set computed_holders=computed_holders+case when after_total>0 then 1 else -1 end where id;
  end if;
end $$;

create function public.rh20_holder_event(p_event jsonb,p_reverse boolean default false)
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
      insert into public.rh20_holder_orders(listing_id,seller,amount,state) values(listing,p_event->>'seller',n,1);
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

create function public.rh20_holders_acquire(p_lease uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.rh20_holder_state%rowtype; checkpoints jsonb;
begin
  select * into strict s from public.rh20_holder_state where id for update;
  if s.lease_until>now() or s.last_started_at>now()-interval '15 seconds' then return null; end if;
  update public.rh20_holder_state set lease_id=p_lease,lease_until=now()+interval '90 seconds',last_started_at=now() where id;
  select coalesce(jsonb_agg(x order by block_number desc),'[]'::jsonb) into checkpoints from (select * from public.rh20_holder_checkpoints order by block_number desc limit 16) x;
  return jsonb_build_object('cursor',s.cursor_block,'hash',s.cursor_hash,'start',s.start_block,'checkpoints',checkpoints);
end $$;

create function public.rh20_holders_anchor(p_lease uuid,p_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.rh20_holder_state%rowtype;
begin
  select * into strict s from public.rh20_holder_state where id for update;
  if s.lease_id is distinct from p_lease or s.lease_until<now() or s.cursor_hash is not null or p_hash !~ '^0x[0-9a-f]{64}$' then raise exception 'Invalid anchor lease'; end if;
  update public.rh20_holder_state set cursor_hash=p_hash where id;
  insert into public.rh20_holder_checkpoints values(s.cursor_block,p_hash) on conflict do nothing;
end $$;

create function public.rh20_holders_apply(p_lease uuid,p_from bigint,p_to bigint,p_hash text,p_head bigint,p_events jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.rh20_holder_state%rowtype; e jsonb; b bigint; l integer; previous_block bigint:=-1; previous_log integer:=-1; oldest bigint;
begin
  select * into strict s from public.rh20_holder_state where id for update;
  if s.lease_id is distinct from p_lease or s.lease_until<now() then raise exception 'Invalid holder lease'; end if;
  if p_from<>s.cursor_block+1 or p_to<p_from or p_to-p_from>=1000 or p_head<p_to or p_hash !~ '^0x[0-9a-f]{64}$' then raise exception 'Invalid contiguous range'; end if;
  if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20000 then raise exception 'Invalid event batch'; end if;
  for e in select value from jsonb_array_elements(p_events) loop
    b:=(e->>'block')::bigint; l:=(e->>'logIndex')::integer;
    if b<p_from or b>p_to or l<0 or b<previous_block or (b=previous_block and l<=previous_log) or (e->>'txHash') !~ '^0x[0-9a-f]{64}$' then raise exception 'Invalid event ordering'; end if;
    previous_block:=b;previous_log:=l;
    if public.rh20_holder_event(e,false) then insert into public.rh20_holder_events values(b,l,e->>'txHash',e); end if;
  end loop;
  update public.rh20_holder_state set cursor_block=p_to,cursor_hash=p_hash,last_error=null,status=case when p_to=p_head then 'ready' else 'indexing' end,
    published_holders=case when p_to=p_head then computed_holders else published_holders end,
    published_block=case when p_to=p_head then p_to else published_block end,
    published_at=case when p_to=p_head then now() else published_at end where id;
  insert into public.rh20_holder_checkpoints values(p_to,p_hash);
  select min(block_number) into oldest from (select block_number from public.rh20_holder_checkpoints order by block_number desc limit 128) q;
  delete from public.rh20_holder_checkpoints where block_number<oldest;
  delete from public.rh20_holder_events where block_number<=oldest;
end $$;

create function public.rh20_holders_rewind(p_lease uuid,p_block bigint,p_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.rh20_holder_state%rowtype; e record;
begin
  select * into strict s from public.rh20_holder_state where id for update;
  if s.lease_id is distinct from p_lease or s.lease_until<now() then raise exception 'Invalid rewind lease'; end if;
  if p_block is null then
    delete from public.rh20_holder_events; delete from public.rh20_holder_checkpoints; delete from public.rh20_holder_orders; delete from public.rh20_holder_balances;
    update public.rh20_holder_state set cursor_block=start_block-1,cursor_hash=null,computed_holders=0,status='indexing' where id;
    return;
  end if;
  if not exists(select 1 from public.rh20_holder_checkpoints where block_number=p_block and block_hash=p_hash) then raise exception 'Unknown rewind checkpoint'; end if;
  for e in select event from public.rh20_holder_events where block_number>p_block order by block_number desc,log_index desc loop
    perform public.rh20_holder_event(e.event,true);
  end loop;
  delete from public.rh20_holder_events where block_number>p_block;
  delete from public.rh20_holder_checkpoints where block_number>p_block;
  update public.rh20_holder_state set cursor_block=p_block,cursor_hash=p_hash,status='indexing' where id;
end $$;

create function public.rh20_holders_finish(p_lease uuid,p_error text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.rh20_holder_state set lease_id=null,lease_until=null,last_error=left(p_error,250),status=case when p_error is null then status else 'delayed' end where id and lease_id=p_lease;
end $$;

create function public.rh20_holders_snapshot()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('ticker','RHSC','chainId',4663,'coreAddress','0x4e89Bc6A7A218B338060d428f40d8f551efc8058','marketplaceAddress','0x3E6E91232CE0895C6154b66800ee5c8B8EE83CFC',
    'holders',published_holders,'blockNumber',published_block,'updatedAt',published_at,'status',case when published_at<now()-interval '90 seconds' then 'delayed' else status end,
    'definition','unique owners including listed RHSC','refreshSeconds',20)
  from public.rh20_holder_state where id
$$;

revoke all on function public.rh20_holder_delta(text,bigint,bigint),public.rh20_holder_event(jsonb,boolean),public.rh20_holders_acquire(uuid),public.rh20_holders_anchor(uuid,text),public.rh20_holders_apply(uuid,bigint,bigint,text,bigint,jsonb),public.rh20_holders_rewind(uuid,bigint,text),public.rh20_holders_finish(uuid,text),public.rh20_holders_snapshot() from public,anon,authenticated;
grant execute on function public.rh20_holder_delta(text,bigint,bigint),public.rh20_holder_event(jsonb,boolean),public.rh20_holders_acquire(uuid),public.rh20_holders_anchor(uuid,text),public.rh20_holders_apply(uuid,bigint,bigint,text,bigint,jsonb),public.rh20_holders_rewind(uuid,bigint,text),public.rh20_holders_finish(uuid,text),public.rh20_holders_snapshot() to service_role;
