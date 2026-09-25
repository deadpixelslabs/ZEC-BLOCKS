\set ON_ERROR_STOP on
begin;
do $$
declare failed boolean;
begin
  -- Existing ID 5000 survives, but changing its price loses the fee waiver.
  update public.zecblocks_zec_listings set seller_payout='t1Upgraded' where listing_id='legacy';
  failed:=false;
  begin update public.zecblocks_zec_listings set price_zec=0.1 where listing_id='legacy'; exception when others then failed:=true; end;
  if not failed then raise exception 'legacy terms bypassed fee'; end if;
  failed:=false;
  begin insert into public.zecblocks_zec_listings values('free',2,repeat('a',64),0.05,2000000000,'active','free','t1Wallet'); exception when others then failed:=true; end;
  if not failed then raise exception 'unpaid NFT listing accepted'; end if;
  failed:=false;
  begin insert into public.zecblocks_zecs_zec_orders values('free',repeat('a',64),210,10000,2000000000,'active','free','t1Wallet'); exception when others then failed:=true; end;
  if not failed then raise exception 'unpaid ZECS listing accepted'; end if;
end $$;
insert into public.zecblocks_listing_fee_intents(listing_id,asset,seller_commitment,payment_address,signed_message,terms)
values ('paid-nft','ZEC_BLOCK',repeat('a',64),'t1Wallet','signed nft',jsonb_build_object('seller',repeat('a',64),'token',2,'price','5000000','expires',2000000000,'message','signed nft')),
       ('paid-zecs','ZECS',repeat('a',64),'t1Wallet','signed zecs',jsonb_build_object('seller',repeat('a',64),'amount',210,'price','10000','expires',2000000000,'message','signed zecs'));
select public.zecblocks_record_listing_fee('paid-nft',repeat('b',64),100,extract(epoch from now())::bigint);
-- Same listing and TXID is idempotent.
select public.zecblocks_record_listing_fee('paid-nft',repeat('b',64),100,extract(epoch from now())::bigint);
do $$
declare failed boolean:=false;
begin
  begin perform public.zecblocks_record_listing_fee('paid-zecs',repeat('b',64),100,extract(epoch from now())::bigint); exception when unique_violation then failed:=true; end;
  if not failed then raise exception 'fee transaction reused across assets'; end if;
end $$;
select public.zecblocks_record_listing_fee('paid-zecs',repeat('c',64),101,extract(epoch from now())::bigint);
insert into public.zecblocks_zec_listings values('paid-nft',2,repeat('a',64),0.05,2000000000,'active','signed nft','t1Wallet');
insert into public.zecblocks_zecs_zec_orders values('paid-zecs',repeat('a',64),210,10000,2000000000,'active','signed zecs','t1Wallet');
do $$
declare failed boolean;
begin
  failed:=false;
  begin update public.zecblocks_zecs_zec_orders set seller_payout='t1Thief' where order_id='paid-zecs'; exception when others then failed:=true; end;
  if not failed then raise exception 'paid listing payout changed'; end if;
  update public.zecblocks_zec_listings set status='cancelled' where listing_id='paid-nft';
  failed:=false;
  begin update public.zecblocks_zec_listings set status='active' where listing_id='paid-nft'; exception when others then failed:=true; end;
  if not failed then raise exception 'cancelled listing reopened without new fee'; end if;
  if has_table_privilege('anon','public.zecblocks_listing_fee_intents','INSERT') or
     has_table_privilege('authenticated','public.zecblocks_listing_fee_intents','SELECT') or
     has_function_privilege('anon','public.zecblocks_record_listing_fee(text,text,bigint,bigint)','EXECUTE') or
     has_table_privilege('service_role','public.zecblocks_listing_fee_legacy','INSERT') then
     raise exception 'unsafe fee grants';
  end if;
end $$;
rollback;
