import {anchorFor,canonical,hex,integer,requireThat,sha256Hex,SUPPLY,GENESIS,GENESIS_HEIGHT} from './core.mjs';
import {verifyAnchor} from './verifier.mjs';
export function stateLeaf(row){
  integer(row.tokenId,1,SUPPLY,'token ID');
  requireThat(['bound','legacy','unresolved'].includes(row.status),'Invalid evidence status');
  if(row.status==='unresolved')requireThat(row.ownerCommitment===null&&row.lastEventTxid===null&&row.lastEventHash===null&&row.sequence===null,'Unresolved state must not assert ownership');
  else{hex(row.ownerCommitment,32);hex(row.lastEventTxid,32);hex(row.lastEventHash,32);integer(row.sequence,0,Number.MAX_SAFE_INTEGER,'sequence')}
  return ['ZB1:STATE_LEAF:v1',row.tokenId,row.status,row.ownerCommitment,row.lastEventTxid,row.lastEventHash,row.sequence];
}
const leafHash=row=>sha256Hex(Buffer.from(canonical(stateLeaf(row))));
const parent=(a,b)=>sha256Hex(Buffer.concat([Buffer.from('ZB1:STATE_NODE:v1|'),Buffer.from(a,'hex'),Buffer.from(b,'hex')]));
export function completeState(rows){
  const map=new Map();for(const row of rows){stateLeaf(row);requireThat(!map.has(row.tokenId),'Duplicate token in checkpoint');map.set(row.tokenId,row)}
  return Array.from({length:SUPPLY},(_,i)=>map.get(i+1)||{tokenId:i+1,status:'unresolved',ownerCommitment:null,lastEventTxid:null,lastEventHash:null,sequence:null});
}
function levels(rows){
  const tree=[rows.map(leafHash)];while(tree.at(-1).length>1){const p=tree.at(-1),next=[];for(let i=0;i<p.length;i+=2)next.push(parent(p[i],p[i+1]??p[i]));tree.push(next)}return tree;
}
function checkpointHash(context,root){return sha256Hex(Buffer.from('ZB1:CHECKPOINT:v1|'+canonical({context,root,count:SUPPLY})))}
function validateContext(c){
  requireThat(c?.network==='mainnet'&&c.genesis===GENESIS&&c.coverage==='supplied-records-only','Invalid checkpoint context');
  integer(c.height,GENESIS_HEIGHT,Number.MAX_SAFE_INTEGER,'height');hex(c.blockHash,32);hex(c.manifestHash,32);hex(c.eventSetHash,32);
}
export function buildCheckpoint(rows,context){
  validateContext(context);const state=completeState(rows),root=levels(state).at(-1)[0];
  return {schema:'zb1-checkpoint-1',context,root,count:SUPPLY,checkpointHash:checkpointHash(context,root),state};
}
export function membershipProof(checkpoint,tokenId){
  integer(tokenId,1,SUPPLY,'token ID');requireThat(checkpoint.state?.length===SUPPLY,'Complete state required');
  requireThat(checkpoint.state.every((row,i)=>row.tokenId===i+1),'Checkpoint positions must match token IDs');
  const tree=levels(checkpoint.state);requireThat(tree.at(-1)[0]===checkpoint.root,'Checkpoint state differs from root');
  let index=tokenId-1;const siblings=[];
  for(const level of tree.slice(0,-1)){siblings.push(level[index^1]??level[index]);index=Math.floor(index/2)}
  return {tokenId,leaf:checkpoint.state[tokenId-1],siblings};
}
export function verifyMembership(checkpoint,proof){
  try{
    validateContext(checkpoint.context);requireThat(checkpoint.schema==='zb1-checkpoint-1'&&checkpoint.count===SUPPLY,'Wrong checkpoint format');
    requireThat(proof.tokenId===proof.leaf.tokenId,'Wrong leaf position');integer(proof.tokenId,1,SUPPLY,'token ID');
    requireThat(checkpoint.checkpointHash===checkpointHash(checkpoint.context,hex(checkpoint.root,32)),'Wrong checkpoint commitment');
    let hash=leafHash(proof.leaf),index=proof.tokenId-1,width=SUPPLY,i=0;
    while(width>1){const sibling=hex(proof.siblings[i++],32);if(index%2===0&&index+1===width)requireThat(sibling===hash,'Wrong odd sibling');hash=index%2?parent(sibling,hash):parent(hash,sibling);index=Math.floor(index/2);width=Math.ceil(width/2)}
    return i===proof.siblings.length&&hash===checkpoint.root;
  }catch{return false}
}
export async function verifyCheckpointAnchor(checkpoint,txid,manifestHash,chain){
  requireThat(verifyMembership(checkpoint,membershipProof(checkpoint,1)),'Invalid checkpoint');
  requireThat(checkpoint.context.manifestHash===manifestHash,'Wrong checkpoint manifest');
  const height=checkpoint.context.height,hash=checkpoint.context.blockHash;
  requireThat(await chain.blockHash(height)===hash,'Checkpoint cutoff is not canonical');
  const anchor=await verifyAnchor(txid,anchorFor('CHECKPOINT',checkpoint.checkpointHash),chain);
  requireThat(anchor.height>height,'Checkpoint anchor must follow its cutoff block');
  requireThat(await chain.blockHash(height)===hash,'Chain changed during checkpoint verification');
  return {...anchor,checkpointHash:checkpoint.checkpointHash,anchored:true,coverage:checkpoint.context.coverage,proves:'Snapshot commitment and canonical cutoff, not history completeness or ownership legitimacy'};
}
