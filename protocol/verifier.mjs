import {canonical,hex,integer,requireThat,sha256Hex,validateEnvelope,GENESIS,GENESIS_HEIGHT,SUPPLY} from './core.mjs';

// Only read methods exist. Node credentials stay in the operator environment.
export class ReadOnlyRpc {
  constructor(url,authorization=''){
    const u=new URL(url);requireThat(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password,'Use an HTTP RPC URL without credentials');
    this.url=u.href;this.authorization=authorization;this.id=0;
  }
  async call(method,params=[]){
    requireThat(['getblockchaininfo','getblockhash','getblock','getrawtransaction'].includes(method),'Read-only RPC method required');
    const r=await fetch(this.url,{method:'POST',headers:{'content-type':'application/json',...(this.authorization?{authorization:this.authorization}:{})},body:JSON.stringify({jsonrpc:'1.0',id:++this.id,method,params}),signal:AbortSignal.timeout(15000)});
    requireThat(r.ok,'Chain RPC HTTP '+r.status);const j=await r.json();
    requireThat(!j.error,'Chain RPC '+(j.error?.code??'error'));return j.result;
  }
  info(){return this.call('getblockchaininfo')}
  blockHash(height){return this.call('getblockhash',[height])}
  block(hash){return this.call('getblock',[hash,1])}
  tx(txid){return this.call('getrawtransaction',[txid,1])}
}
export function zecToZat(value){
  let s=value;
  if(typeof value==='number'){
    requireThat(Number.isFinite(value)&&value>=0,'Invalid output value');s=value.toFixed(8);requireThat(Number(s)===value,'Sub-zatoshi output');
  }
  requireThat(typeof s==='string'&&/^(0|[1-9][0-9]*)(\.[0-9]{1,8})?$/.test(s),'Invalid ZEC decimal');
  const [whole,fraction='']=s.split('.');return BigInt(whole)*100000000n+BigInt(fraction.padEnd(8,'0'));
}
export async function verifyNetwork(chain){
  const info=await chain.info();requireThat(info?.chain==='main','Zcash mainnet RPC required');
  const hash=hex(await chain.blockHash(GENESIS_HEIGHT),32,'genesis block hash'),block=await chain.block(hash);
  requireThat(block?.hash===hash&&block.height===GENESIS_HEIGHT&&Array.isArray(block.tx)&&block.tx.filter(x=>(typeof x==='string'?x:x?.txid)===GENESIS).length===1,'Genesis transaction absent at pinned height');
  return info;
}
export async function verifyAnchor(txid,anchor,chain,{heightLimit=Number.MAX_SAFE_INTEGER,minConfirmations=1}={}){
  hex(txid,32);integer(minConfirmations,1,10000,'minimum confirmations');
  await verifyNetwork(chain);
  const tx=await chain.tx(txid);
  requireThat(tx?.txid===txid,'TXID mismatch');hex(tx.blockhash,32,'confirmed block hash');
  requireThat(Number.isSafeInteger(tx.confirmations)&&tx.confirmations>=minConfirmations,'Transaction unconfirmed');
  const block=await chain.block(tx.blockhash),height=integer(block.height,GENESIS_HEIGHT,heightLimit,'block height');
  requireThat(block.hash===tx.blockhash&&await chain.blockHash(height)===block.hash,'Non-canonical block');
  requireThat(Array.isArray(block.tx),'Complete block transaction list required');
  const ids=block.tx.map(x=>typeof x==='string'?x:x?.txid),index=ids.indexOf(txid);
  requireThat(index>=0&&ids.lastIndexOf(txid)===index,'Transaction absent or duplicated in block');
  requireThat(Array.isArray(tx.vout),'Decoded transparent outputs required');
  const outputs=tx.vout.filter(o=>o?.scriptPubKey?.hex===anchor.scriptPubKey&&zecToZat(o.value)===BigInt(anchor.amountZat));
  requireThat(outputs.length===1,'Exact public anchor output missing or duplicated');
  return {txid,height,blockHash:block.hash,txIndex:index};
}
export async function verifyRecord(envelope,manifestHash,chain,options={}){
  const evidence=validateEnvelope(envelope,manifestHash);
  const position=await verifyAnchor(envelope.txid,evidence.anchor,chain,options);
  if(envelope.event.type==='CLAIM')requireThat(await chain.blockHash(envelope.event.sourceHeight)===envelope.event.sourceHash,'Source block hash mismatch');
  return {...envelope,...evidence,...position};
}
export function replayVerified(records){
  const owners=new Map(),seenTx=new Set(),seenEvents=new Set(),rejected=[];
  const byTx=new Map();
  for(const r of records){if(!byTx.has(r.txid))byTx.set(r.txid,new Set());byTx.get(r.txid).add(r.eventHash)}
  const ordered=[...records].sort((a,b)=>a.height-b.height||a.txIndex-b.txIndex||a.txid.localeCompare(b.txid));
  for(const r of ordered){
    const e=r.event;
    try{
      requireThat(byTx.get(r.txid).size===1,'Ambiguous transaction: multiple distinct signed events');
      requireThat(!seenTx.has(r.txid)&&!seenEvents.has(r.eventHash),'Duplicate transaction or signed event');
      const previous=owners.get(e.tokenId);
      if(e.type==='CLAIM'){
        requireThat(!previous,'Token already claimed');
        owners.set(e.tokenId,{tokenId:e.tokenId,status:'bound',ownerCommitment:e.ownerCommitment,lastEventTxid:r.txid,lastEventHash:r.eventHash,sequence:0});
      }else{
        requireThat(previous,'Missing claim ancestry');
        requireThat(previous.ownerCommitment===e.fromCommitment,'Signer is not current owner');
        requireThat(previous.lastEventTxid===e.previousTxid&&previous.lastEventHash===e.previousEventHash&&previous.sequence+1===e.sequence,'Stale transfer or replay');
        owners.set(e.tokenId,{...previous,ownerCommitment:e.toCommitment,lastEventTxid:r.txid,lastEventHash:r.eventHash,sequence:e.sequence});
      }
      seenTx.add(r.txid);seenEvents.add(r.eventHash);
    }catch(error){rejected.push({txid:r.txid,tokenId:e.tokenId,error:error.message})}
  }
  return {coverage:'supplied-records-only',owners:[...owners.values()].sort((a,b)=>a.tokenId-b.tokenId),rejected};
}
export async function verifyBundle(envelopes,manifestHash,chain,{atHeight}={}){
  requireThat(Array.isArray(envelopes)&&envelopes.length<=100000,'Invalid event bundle');
  const info=await verifyNetwork(chain);
  const height=integer(atHeight??info.blocks,GENESIS_HEIGHT,info.blocks,'snapshot height'),blockHash=hex(await chain.blockHash(height),32);
  const records=[],unresolved=[];
  for(const envelope of envelopes){
    if(![4,2].includes(envelope?.event?.version)||!['CLAIM','TRANSFER'].includes(envelope?.event?.type)){
      unresolved.push({txid:envelope?.txid??null,error:'Legacy or unsupported record: public event binding is not proven'});continue;
    }
    try{records.push(await verifyRecord(envelope,manifestHash,chain,{heightLimit:height}))}
    catch(error){unresolved.push({txid:envelope?.txid??null,error:error.message})}
  }
  requireThat(await chain.blockHash(height)===blockHash,'Chain changed during verification; rerun');
  return {...replayVerified(records),unresolved,context:{network:'mainnet',genesis:GENESIS,manifestHash,height,blockHash,eventSetHash:sha256Hex(Buffer.from(canonical(envelopes.map(e=>sha256Hex(Buffer.from(canonical(e)))).sort()))),coverage:'supplied-records-only'},records};
}
