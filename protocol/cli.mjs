import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {anchorFor,canonical,sha256Hex,requireThat,eventMessage,signedEventHash,validateSignedEvent,validateEnvelope,receiptMessage,identityProfile,checkRestoredIdentity} from './core.mjs';
import {ReadOnlyRpc,verifyAnchor,verifyBundle} from './verifier.mjs';
import {buildCheckpoint,membershipProof,verifyMembership,verifyCheckpointAnchor} from './checkpoints.mjs';
import {renderZb1Svg} from './renderer-v1.js';
const root=dirname(fileURLToPath(import.meta.url));
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const output=async(p,value)=>{await mkdir(dirname(resolve(p)),{recursive:true});await writeFile(p,JSON.stringify(value,null,2)+'\n')};
export async function loadManifest(){
  const m=await json(join(root,'manifest.json'));
  for(const [file,hash] of Object.entries(m.files))requireThat(sha256Hex(await readFile(join(root,file)))===hash,'Frozen artifact differs: '+file);
  return {manifest:m,hash:sha256Hex(Buffer.from(canonical(m)))};
}
function node(){requireThat(process.env.ZCASH_RPC_URL,'Set ZCASH_RPC_URL to your own validating archival node');return new ReadOnlyRpc(process.env.ZCASH_RPC_URL,process.env.ZCASH_RPC_AUTH||'')}
export async function main(args){
  const [command,...a]=args,{manifest,hash}=await loadManifest();
  switch(command){
    case 'manifest': console.log(JSON.stringify({hash,manifest},null,2));break;
    case 'prepare-spec': await output(a[0]||'spec-anchor-request.json',{status:'awaiting-wallet-validation-and-approval',manifestHash:hash,anchor:anchorFor('SPEC',hash),networkFee:'Wallet calculated; not included in amountZat',warning:'This OP_RETURN output burns 1 zatoshi. It requires explicit custom-script support from the wallet. Do not substitute a receiving address or a private memo. This command sends nothing.'});break;
    case 'verify-spec': console.log(JSON.stringify(await verifyAnchor(a[0],anchorFor('SPEC',hash),node()),null,2));break;
    case 'signing-request': {const e=await json(a[0]);await output(a[1],{message:eventMessage(e,hash),signingMode:'derived',publicKey:e.publicKey});break}
    case 'prepare-event': {const e=await json(a[0]),h=validateSignedEvent(e,hash);await output(a[1],{event:e,eventHash:h,anchor:anchorFor('EVENT',h),status:'not-broadcast'});break}
    case 'receipt-request': {const e=await json(a[0]),h=validateSignedEvent(e,hash);await output(a[2],{message:receiptMessage(h,a[1],hash),signingMode:'derived',publicKey:e.publicKey});break}
    case 'finalize-event': {const envelope={event:await json(a[0]),txid:a[1],receiptSignature:a[2]};validateEnvelope(envelope,hash);await output(a[3],envelope);break}
    case 'verify': {await output(a[1],await verifyBundle(await json(a[0]),hash,node(),a[2]?{atHeight:Number(a[2])}:{}));break}
    case 'checkpoint': {
      const report=await verifyBundle(await json(a[0]),hash,node(),a[2]?{atHeight:Number(a[2])}:{}),checkpoint=buildCheckpoint(report.owners,report.context);
      await output(a[1],{...checkpoint,unresolvedRecords:report.unresolved,rejectedTransitions:report.rejected,anchorRequest:anchorFor('CHECKPOINT',checkpoint.checkpointHash),anchored:false});break;
    }
    case 'proof': await output(a[2],membershipProof(await json(a[0]),Number(a[1])));break;
    case 'verify-proof': {const ok=verifyMembership(await json(a[0]),await json(a[1]));console.log(JSON.stringify({membershipVerified:ok,proves:'Inclusion in this checkpoint, not completeness or legitimacy of its input history'}));requireThat(ok,'Invalid membership proof');break}
    case 'verify-checkpoint-anchor': console.log(JSON.stringify(await verifyCheckpointAnchor(await json(a[0]),a[1],hash,node()),null,2));break;
    case 'identity': await output(a[1],identityProfile(a[0]));break;
    case 'check-identity': console.log(JSON.stringify(checkRestoredIdentity(await json(a[0]),a[1]),null,2));break;
    case 'render': await writeFile(a[3],renderZb1Svg(a[0],Number(a[1]),Number(a[2])));break;
    default: throw new Error('Commands: manifest, prepare-spec [out], verify-spec txid, signing-request event out, prepare-event signed-event out, receipt-request signed-event txid out, finalize-event signed-event txid receipt-signature out, verify events out [height], checkpoint events out [height], proof checkpoint token out, verify-proof checkpoint proof, verify-checkpoint-anchor checkpoint txid, identity public-key out, check-identity profile public-key, render hash height token out.svg');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1});
