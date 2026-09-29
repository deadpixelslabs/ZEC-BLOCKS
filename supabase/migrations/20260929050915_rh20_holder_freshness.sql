-- Refresh the verified aggregate even when the chain has no newer block.
create function public.rh20_holders_touch(p_lease uuid,p_block bigint,p_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.rh20_holder_state%rowtype;
begin
  select * into strict s from public.rh20_holder_state where id for update;
  if s.lease_id is distinct from p_lease or s.lease_until<now() then raise exception 'Invalid holder lease'; end if;
  if p_block is distinct from s.cursor_block or p_hash is distinct from s.cursor_hash or p_hash is null then raise exception 'Unverified holder checkpoint'; end if;
  update public.rh20_holder_state set published_holders=computed_holders,published_block=cursor_block,published_at=now(),status='ready',last_error=null where id;
end $$;
revoke all on function public.rh20_holders_touch(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.rh20_holders_touch(uuid,bigint,text) to service_role;
