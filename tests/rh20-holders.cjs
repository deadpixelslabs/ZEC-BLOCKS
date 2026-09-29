'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const {Contract,id,toBeHex}=require('ethers');
const {startMarket}=require('./helpers/rh20-market-chain.cjs');
let pool,chain,market,engine,config,snapshot;
const MINT='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
const tx=async p=>(await p).wait();
before(async()=>{
  pool=new Pool();await pool.query("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;");
  const names=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).filter(n=>/_rh20_(holder_(index|freshness)|market_price_order)\.sql$/.test(n)).sort();
  assert.equal(names.length,3);
  for(const name of names)await pool.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8'));
  engine=await import('../supabase/functions/zecblocks-rh20-holders/engine.mjs');
  const {CONFIG}=await import('../supabase/functions/zecblocks-rh20-holders/config.mjs');config={...CONFIG,startBlock:1,deploymentBlock:1};
  chain=await startMarket();
  await chain.provider.send('anvil_setCode',[config.contractAddress,chain.marketArtifact.deployedBytecode]);
  await chain.provider.send('anvil_setStorageAt',[config.contractAddress,toBeHex(0,32),toBeHex(1,32)]);
  market=new Contract(config.contractAddress,chain.marketArtifact.abi,chain.signers[0]);
});
beforeEach(async()=>{
  snapshot=await chain.provider.send('evm_snapshot',[]);
  await pool.query('truncate public.rh20_holder_balances,public.rh20_holder_orders,public.rh20_holder_events,public.rh20_holder_checkpoints; update public.rh20_holder_state set start_block=1,cursor_block=0,cursor_hash=null,computed_holders=0,published_holders=null,published_block=null,published_at=null,status=\'indexing\',lease_id=null,lease_until=null,last_started_at=null,last_error=null;');
});
afterEach(async()=>{await chain.provider.send('evm_revert',[snapshot]);});
after(async()=>{await chain?.close();await pool?.end();});
async function db(name,args={}){assert.match(name,/^rh20_(holders_[a-z]+|market_board)$/);const keys=Object.keys(args);keys.forEach(k=>assert.match(k,/^p_[a-z_]+$/));const values=keys.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k]);const result=await pool.query('select public.'+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') as value',values);return result.rows[0].value;}
const rpc=(name,args)=>chain.provider.send(name,args);
async function sync(overrides={}){await pool.query('update public.rh20_holder_state set last_started_at=null');return engine.synchronizeHolders({rpc,db,config,confirmations:0,...overrides});}
const count=async()=>(await db('rh20_holders_snapshot')).holders;
async function mint(index){await tx(chain.core.connect(chain.signers[index]).inscribe(MINT));}
async function list(index,amount=500,price=10000){const seller=chain.signers[index];await tx(chain.core.connect(seller).approve('RHSC',config.contractAddress,amount));const request=id('holder-'+await market.nextListingId());await tx(market.connect(seller).createListing('RHSC',amount,price,request));return market.listingByRequest(seller.address,request);}

test('counts unique minted owners and removes a zero-balance sender',async()=>{
  await mint(1);await mint(1);await mint(2);await sync();assert.equal(await count(),2);
  await tx(chain.core.connect(chain.signers[1]).transfer('RHSC',chain.signers[2].address,1000));await sync();assert.equal(await count(),1);
  assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),0n);
});
test('escrowed listings and cancellations keep the seller as a holder',async()=>{
  await mint(1);await mint(2);await sync();const lot=await list(1);await sync();assert.equal(await count(),2);
  const row=(await pool.query('select * from public.rh20_holder_balances where account=$1',[chain.signers[1].address.toLowerCase()])).rows[0];assert.equal(row.liquid,'0');assert.equal(row.listed,'500');
  await tx(market.connect(chain.signers[1]).cancelListing(lot));await sync();assert.equal(await count(),2);
});
test('a sale transfers beneficial ownership and merges an existing buyer correctly',async()=>{
  await mint(1);await mint(2);const lot=await list(1);await sync();assert.equal(await count(),2);
  await tx(market.connect(chain.signers[2]).buy(lot,{value:10000}));await sync();assert.equal(await count(),1);
  assert.equal(await chain.core.balanceOf('RHSC',chain.signers[2].address),1000n);
});
test('selling to a new owner changes ownership without counting escrow as a holder',async()=>{
  await mint(1);const lot=await list(1);await sync();assert.equal(await count(),1);
  await tx(market.connect(chain.signers[3]).buy(lot,{value:10000}));await sync();assert.equal(await count(),1);
});
test('RPC failure preserves the published count and retry resumes at the cursor',async()=>{
  await mint(1);await sync();const before=await db('rh20_holders_snapshot');await mint(2);
  await assert.rejects(sync({rpc:async(name,args)=>{if(name==='eth_getLogs')throw Error('Fixture RPC outage');return rpc(name,args);}}));
  const delayed=await db('rh20_holders_snapshot');assert.equal(delayed.holders,1);assert.equal(delayed.blockNumber,before.blockNumber);assert.equal(delayed.status,'delayed');
  await sync();assert.equal(await count(),2);
});
test('a changed chain checkpoint rolls back orphaned events and recounts the new branch',async()=>{
  await mint(1);await sync();const branch=await chain.provider.send('evm_snapshot',[]);
  await mint(2);await sync();assert.equal(await count(),2);
  await chain.provider.send('evm_revert',[branch]);
  await tx(chain.core.connect(chain.signers[1]).transfer('RHSC',chain.signers[3].address,500));await sync();assert.equal(await count(),1);
  const orphan=(await pool.query('select liquid,listed from public.rh20_holder_balances where account=$1',[chain.signers[2].address.toLowerCase()])).rows[0];assert.equal(orphan.liquid,'0');assert.equal(orphan.listed,'0');
});
test('a partial historical scan never publishes an incomplete holder count',async()=>{
  await mint(1);await chain.provider.send('anvil_mine',['0x7d0']);const partial=await sync({maxRanges:1});assert(partial.cursor<partial.head);assert.equal(await count(),null);
  await sync();assert.equal(await count(),1);
});
test('a healthy unchanged chain refreshes an old aggregate and clears a recovered outage',async()=>{
  await mint(1);await sync();const before=await db('rh20_holders_snapshot');
  await pool.query("update public.rh20_holder_state set published_at=now()-interval '5 minutes',status='delayed',last_error='Fixture outage'");
  assert.equal((await db('rh20_holders_snapshot')).status,'delayed');
  const result=await sync(),after=await db('rh20_holders_snapshot');
  assert.equal(result.processed,0);assert.equal(after.holders,1);assert.equal(after.blockNumber,before.blockNumber);assert.equal(after.status,'ready');
  assert(Date.now()-Date.parse(after.updatedAt)<10000);
});
test('a lagging RPC head keeps the previously verified count and cursor',async()=>{
  await mint(1);await sync();const before=await db('rh20_holders_snapshot');
  await assert.rejects(sync({rpc:async(name,args)=>name==='eth_blockNumber'?toBeHex(before.blockNumber-1):rpc(name,args)}),/behind/);
  const after=await db('rh20_holders_snapshot');assert.equal(after.holders,before.holders);assert.equal(after.blockNumber,before.blockNumber);assert.equal(after.updatedAt,before.updatedAt);assert.equal(after.status,'delayed');
});
test('lease serialization, batch replay checks and private grants prevent duplicate or public writes',async()=>{
  const first=crypto.randomUUID(),second=crypto.randomUUID();const acquired=await db('rh20_holders_acquire',{p_lease:first});assert(acquired);assert.equal(await db('rh20_holders_acquire',{p_lease:second}),null);
  await assert.rejects(db('rh20_holders_apply',{p_lease:second,p_from:1,p_to:1,p_hash:id('block'),p_head:1,p_events:[]}));
  await db('rh20_holders_finish',{p_lease:first,p_error:null});await mint(1);await sync();
  const state=(await pool.query('select cursor_block from public.rh20_holder_state')).rows[0];assert(Number(state.cursor_block)>0);
  for(const role of ['anon','authenticated']){
    const client=await pool.connect();try{await client.query('set role '+role);await assert.rejects(client.query('select * from public.rh20_holder_balances'));await assert.rejects(client.query('select public.rh20_holders_snapshot()'));}finally{await client.query('reset role');client.release();}
  }
  const rls=await pool.query("select relname,relrowsecurity from pg_class where relname like 'rh20_holder_%' and relkind='r'");assert.equal(rls.rows.length,5);assert(rls.rows.every(r=>r.relrowsecurity));
});
test('market pages sort all active lots by unit price and exclude closed lots',async()=>{
  const ids=[];for(let i=0;i<12;i++){await mint(1);ids.push(await list(1,100,10000));}
  await mint(1);const cheapest=await list(1,500,20000);await sync();
  let board=await db('rh20_market_board');assert.equal(board.ids[0],cheapest.toString());assert.equal(board.total,13);assert.equal(board.ids.length,12);
  const second=await db('rh20_market_board',{p_offset:12,p_limit:12});assert.equal(second.ids.length,1);assert(!board.ids.includes(second.ids[0]));
  await tx(market.connect(chain.signers[1]).cancelListing(cheapest));await sync();board=await db('rh20_market_board');assert.equal(board.total,12);assert(!board.ids.includes(cheapest.toString()));
  await assert.rejects(db('rh20_market_board',{p_offset:0,p_limit:13}));
});
test('unit-price ordering preserves one-wei differences at uint256-sized prices',async()=>{
  const price=2n**255n,seller=chain.signers[1].address.toLowerCase();
  await pool.query('insert into public.rh20_holder_orders(listing_id,seller,amount,state,price) values(1,$1,21000000,1,$2),(2,$1,21000000,1,$3)',[seller,(price+1n).toString(),price.toString()]);
  assert.deepEqual((await db('rh20_market_board')).ids,['2','1']);
});
