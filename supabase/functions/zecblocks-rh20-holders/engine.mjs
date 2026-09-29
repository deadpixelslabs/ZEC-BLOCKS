import { CONFIG } from './config.mjs';
const HEX32=/^0x[0-9a-f]{64}$/i;
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const hex=n=>'0x'+BigInt(n).toString(16);
const integer=value=>{const n=Number(BigInt(value));if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid block or log index');return n;};
const topicAddress=value=>{if(!HEX32.test(value)||!/^0x0{24}/i.test(value))throw Error('Invalid address topic');return '0x'+value.slice(-40).toLowerCase();};
const word=(data,index)=>{if(!/^0x(?:[0-9a-f]{64})+$/i.test(data)||data.length<2+(index+1)*64)throw Error('Invalid event data');return BigInt('0x'+data.slice(2+index*64,2+(index+1)*64)).toString();};
export function decodeHolderLog(log, config=CONFIG){
  if(!log||!ADDRESS.test(log.address)||!Array.isArray(log.topics))throw Error('Invalid chain log');
  if(log.removed)throw Error('Chain log was removed');
  const address=log.address.toLowerCase(),topics=log.topics.map(t=>String(t).toLowerCase()),kind=topics[0];
  let event;
  if(address===config.coreAddress.toLowerCase()&&kind===config.topics.transfer){
    if(topics[1]!==config.tokenId)return null;
    if(topics.length!==4||log.data.length!==66)throw Error('Invalid RHSC transfer event');
    event={kind:'transfer',from:topicAddress(topics[2]),to:topicAddress(topics[3]),amount:word(log.data,0)};
  }else if(address===config.contractAddress.toLowerCase()){
    if(kind===config.topics.listed){
      if(topics[2]!==config.tokenId)return null;
      if(topics.length!==4||!HEX32.test(topics[1]))throw Error('Invalid RHSC listing event');
      event={kind:'listed',id:BigInt(topics[1]).toString(),seller:topicAddress(topics[3]),amount:word(log.data,1)};
    }else if(kind===config.topics.bought){
      if(topics[2]!==config.tokenId)return null;
      if(topics.length!==4||!HEX32.test(topics[1])||log.data.length!==194)throw Error('Invalid RHSC purchase event');
      event={kind:'bought',id:BigInt(topics[1]).toString(),amount:word(log.data,0)};
    }else if(kind===config.topics.cancelled){
      if(topics.length!==3||!HEX32.test(topics[1])||log.data!=='0x')throw Error('Invalid cancellation event');
      event={kind:'cancelled',id:BigInt(topics[1]).toString(),seller:topicAddress(topics[2])};
    }else return null;
  }else return null;
  if(!HEX32.test(log.blockHash)||!HEX32.test(log.transactionHash))throw Error('Missing canonical log identity');
  return {...event,block:integer(log.blockNumber),blockHash:log.blockHash.toLowerCase(),txHash:log.transactionHash.toLowerCase(),logIndex:integer(log.logIndex)};
}
export function normalizeHolderLogs(logs,from,to,config=CONFIG){
  if(!Array.isArray(logs)||logs.length>20000)throw Error('Invalid or oversized log response');
  const rows=logs.map(l=>decodeHolderLog(l,config)).filter(Boolean).sort((a,b)=>a.block-b.block||a.logIndex-b.logIndex);
  let previous='';
  for(const row of rows){const key=row.block+':'+row.logIndex;if(row.block<from||row.block>to||key===previous)throw Error('Noncanonical log range or duplicate');previous=key;}
  return rows;
}
export async function synchronizeHolders({rpc,db,config=CONFIG,budgetMs=40000,maxRanges=40,confirmations=2}){
  const lease=crypto.randomUUID(),state=await db('rh20_holders_acquire',{p_lease:lease});
  if(!state)return {busy:true};
  const began=Date.now();let failure=null,processed=0;
  const block=async number=>{const value=await rpc('eth_getBlockByNumber',[hex(number),false]);if(!value||!HEX32.test(value.hash)||integer(value.number)!==number)throw Error('Canonical block unavailable');return value;};
  try{
    if(BigInt(await rpc('eth_chainId',[]))!==4663n)throw Error('Wrong upstream chain');
    const [core,market]=await Promise.all([rpc('eth_getCode',[config.coreAddress,'latest']),rpc('eth_getCode',[config.contractAddress,'latest'])]);
    if(core.toLowerCase()!==config.coreRuntime.toLowerCase()||market.toLowerCase()!==config.marketRuntime.toLowerCase())throw Error('Contract runtime differs');
    const head=Math.max(state.start-1,integer(await rpc('eth_blockNumber',[]))-confirmations);
    if(head<state.cursor)throw Error('RPC head is behind the verified holder cursor');
    let cursor=state.cursor,cursorHash=state.hash;
    if(cursorHash){
      let canonical=null;try{canonical=cursor<=head?await block(cursor):null;}catch(_){/* probe retained checkpoints below */}
      if(!canonical||canonical.hash.toLowerCase()!==cursorHash.toLowerCase()){
        let matched=null;
        for(const point of state.checkpoints||[]){if(point.block_number>head)continue;const candidate=await block(point.block_number);if(candidate.hash.toLowerCase()===point.block_hash.toLowerCase()){matched=point;break;}}
        await db('rh20_holders_rewind',{p_lease:lease,p_block:matched?.block_number??null,p_hash:matched?.block_hash??null});
        cursor=matched?.block_number??state.start-1;cursorHash=matched?.block_hash??null;
      }
    }
    if(!cursorHash){cursorHash=(await block(cursor)).hash.toLowerCase();await db('rh20_holders_anchor',{p_lease:lease,p_hash:cursorHash});}
    while(cursor<head&&processed<maxRanges&&Date.now()-began<budgetMs){
      const from=cursor+1,to=Math.min(head,cursor+1000),before=await block(to);
      const [transfers,marketEvents]=await Promise.all([
        rpc('eth_getLogs',[{address:config.coreAddress,fromBlock:hex(from),toBlock:hex(to),topics:[config.topics.transfer,config.tokenId]}]),
        to<config.deploymentBlock?[]:rpc('eth_getLogs',[{address:config.contractAddress,fromBlock:hex(Math.max(from,config.deploymentBlock)),toBlock:hex(to),topics:[[config.topics.listed,config.topics.bought,config.topics.cancelled]]}])
      ]);
      if(!Array.isArray(transfers)||!Array.isArray(marketEvents))throw Error('RPC logs unavailable');
      const events=normalizeHolderLogs([...transfers,...marketEvents],from,to,config),after=await block(to);
      const previous=await block(cursor);
      if(before.hash!==after.hash||previous.hash.toLowerCase()!==cursorHash.toLowerCase())throw Error('Chain changed during indexing');
      await db('rh20_holders_apply',{p_lease:lease,p_from:from,p_to:to,p_hash:after.hash.toLowerCase(),p_head:head,p_events:events});
      cursor=to;cursorHash=after.hash.toLowerCase();processed++;
    }
    if(cursor===head)await db('rh20_holders_touch',{p_lease:lease,p_block:cursor,p_hash:cursorHash});
    return {cursor,head,processed};
  }catch(error){failure=String(error?.message||error).slice(0,250);throw error;}
  finally{await db('rh20_holders_finish',{p_lease:lease,p_error:failure});}
}
