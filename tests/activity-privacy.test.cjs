const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
const activityCode=script.slice(script.indexOf('function activityKind('),script.indexOf('const USDC_MARKET_ABI='));
const seller='a1b2c3d4'.repeat(8),buyer='e5f6a7b8'.repeat(8);

function fixture(events){
  const body={rows:[],_html:'',set innerHTML(s){this._html=s;this.rows=[]},get innerHTML(){return this._html+this.rows.map(r=>r.innerHTML).join('')},appendChild(row){this.rows.push(row)}};
  const filter={value:'all'};
  const context=vm.createContext({
    S:{events:[],verifiedAtomic:new Map(),serverActivity:events},
    $:id=>id==='activityBody'?body:id==='activityFilter'?filter:null,
    document:{createElement:()=>({innerHTML:''})},
    updateMarketMetrics(){},eventKey:e=>e.eventId,mergeEvent:(a,b)=>({...a,...b}),
    validPrice:v=>Number(v)>0?Number(v):0,
    esc:v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    short:(s,n)=>s.length>n*2?s.slice(0,n)+'…'+s.slice(-n):s
  });
  vm.runInContext(activityCode,context);
  return {context,body,filter,render(){vm.runInContext('renderActivity()',context);return body.innerHTML}};
}
function event(type,currency,i,asset='ZEC_BLOCK'){
  return {type,currency,asset,eventId:'event-'+i,tokenId:i,amount:210,price:.25,timestamp:1000+i,
    sellerCommitment:seller,buyerCommitment:buyer,fromCommitment:seller,toCommitment:buyer,
    txid:String(i).padStart(64,'9'),source:'supabase-activity'};
}

test('rendered ZEC and USDC activity contains no full, shortened, or attribute participant IDs',()=>{
  const events=[];
  for(const currency of ['ZEC','USDC'])for(const [i,type] of ['NOIR_SETTLED','SALE','OFFER','TRANSFER','SALE_CANCEL','ZB20_SETTLED','ZB20_LIST','ZB20_CANCEL'].entries())events.push(event(type,currency,events.length+1,i>4?'ZECS':'ZEC_BLOCK'));
  const f=fixture(events),html=f.render();
  for(const id of [seller,buyer,seller.slice(0,7),buyer.slice(0,7),seller.slice(-7),buyer.slice(-7)])assert.equal(html.includes(id),false,'participant ID leaked');
  assert.equal(f.body.rows.length,16);
  assert.match(html,/Hidden/);assert.doesNotMatch(html,/Shielded/);
  assert.match(html,/0.25 ZEC/);assert.match(html,/0.25 USDC/);assert.match(html,/210 ZECS/);
  assert.equal((html.match(/<td(?:\s|>)/g)||[]).length,16*6);
  assert.match(html,/title="9{63}1"/,'transaction references remain available');
  f.filter.value='sale';f.render();assert.equal(f.body.rows.length,4);
  for(const row of f.body.rows)assert.equal((row.innerHTML.match(/class="activityParty"/g)||[]).length,2);
});
test('one-party, absent and malformed participant fields cannot reveal identities or imply a second party',()=>{
  const e=event('SALE','ZEC',1),f=fixture([e]);
  e.sellerCommitment='private" data-owner="secret<script>alert(1)</script>';
  const html=f.render();assert.doesNotMatch(html,/secret|script>|data-owner/);
  assert.equal((html.match(/class="activityParty"/g)||[]).length,1);
  e.sellerCommitment='';assert.doesNotMatch(f.render(),/class="activityParty"/);
  e.type='TRANSFER';e.fromCommitment='';assert.equal((f.render().match(/class="activityParty"/g)||[]).length,1);
});
test('refresh and empty activity keep the new column layout and identity redaction',()=>{
  const f=fixture([event('NOIR_SETTLED','ZEC',1)]);f.render();
  f.context.S.serverActivity=[event('NOIR_SETTLED','USDC',2)];
  const html=f.render();assert.equal(f.body.rows.length,1);assert.doesNotMatch(html,/a1b2c3d|e5f6a7b/);
  f.context.S.serverActivity=[];assert.match(f.render(),/colspan="6"/);
  const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(page,/<th>Parties<\/th>/);assert.doesNotMatch(page,/<th>From<\/th>|<th>To<\/th>/);
});
