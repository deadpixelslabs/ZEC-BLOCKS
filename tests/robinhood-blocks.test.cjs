'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const R=require('../collections/robinhood-blocks/renderer.cjs'),M=require('../collections/robinhood-blocks/manifest.json'),handler=require('../api/robinhood-blocks.js');
const sha=v=>createHash('sha256').update(v).digest('hex');
function request(query,method='GET',headers={}){const r={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},send(body){this.body=body;return this;},json(body){this.body=JSON.stringify(body);return this;},end(){this.body='';return this;}};handler({query,method,headers},r);return r;}
test('all 4,444 editions have stable, distinct unlabelled artwork, unique trait combinations and exact frequencies',()=>{
 assert.equal(M.rows.length,4444);const combos=new Set(),art=new Set(),ranks=new Set();const counts=R.CATEGORIES.map(c=>c.values.map(()=>0)),tierCounts={};
 for(let i=0;i<M.rows.length;i++){
  const row=M.rows[i];assert.equal(row.length,11);assert.deepEqual(R.pickTraits(i+1,row[0]),row.slice(1,8));
  row.slice(1,8).forEach((v,j)=>{assert(Number.isInteger(v)&&v>=0&&v<counts[j].length);counts[j][v]++;});
  combos.add(row.slice(1,8).join(','));art.add(sha(R.render(i+1,row,{labels:false})));assert.equal(sha(R.render(i+1,row)),row[10]);ranks.add(row[8]);
  const metadata=R.metadata(i+1,row);assert.equal(metadata.attributes.length,8);assert.equal(metadata.image,`https://www.zecblocks.xyz/robinhood-blocks/images/${i+1}.svg`);tierCounts[R.tier(row[8])]=(tierCounts[R.tier(row[8])]||0)+1;
 }
 assert.equal(combos.size,4444);assert.equal(art.size,4444);assert.equal(ranks.size,4444);assert.equal(Math.min(...ranks),1);assert.equal(Math.max(...ranks),4444);
 assert.deepEqual(counts,M.categories.map(c=>c.counts));assert.deepEqual(tierCounts,M.tiers);assert.deepEqual(M.tiers,{Uncommon:1111,Common:2666,Rare:445,Epic:178,Legendary:44});
 const sorted=M.rows.toSorted((a,b)=>a[8]-b[8]);for(let i=1;i<sorted.length;i++)assert(sorted[i-1][9]>=sorted[i][9]);
 for(const row of M.rows){const score=row.slice(1,8).reduce((s,v,i)=>s+4444/counts[i][v],0);assert.equal(Number(score.toFixed(6)),row[9]);}
});
test('endpoints return images and metadata, validate IDs, and implement HEAD, ETag and method guards',()=>{
 for(const id of ['1','4444','1.json','4444.json']){const r=request({kind:'metadata',id});assert.equal(r.code,200);assert.equal(JSON.parse(r.body).properties.edition,Number(id.replace('.json','')));}
 for(const id of ['0','4445','5000','01','1.5','../1','1.svg',[],['1'],undefined,'<script>'])assert.equal(request({kind:'metadata',id}).code,404);
 const image=request({kind:'image',id:'4444.svg'});assert.equal(image.code,200);assert.match(image.headers['Content-Type'],/image\/svg\+xml/);assert.match(image.body,/^<svg/);assert.equal(sha(image.body),M.rows[4443][10]);assert(!/<script|<foreignObject|href=|http(?!:\/\/www\.w3\.org)/.test(image.body));
 const json=request({kind:'metadata',id:'1'});assert.equal(request({kind:'metadata',id:'1'},'GET',{'if-none-match':json.headers.ETag}).code,304);assert.equal(request({kind:'metadata',id:'1'},'HEAD').body,'');assert.equal(request({kind:'metadata',id:'1'},'POST').code,405);assert.equal(request({},'OPTIONS').code,204);
 assert.equal(request({kind:'image',id:'1.json'}).code,404);assert.equal(request({kind:['catalog']}).code,404);
});
test('catalog, rarity summary and CSV cover the complete collection',()=>{
 const catalog=JSON.parse(request({kind:'catalog'}).body),summary=JSON.parse(request({kind:'summary'}).body);
 assert.equal(catalog.tokens.length,4444);assert.equal(catalog.categories.length,7);assert.equal(catalog.categories.reduce((s,c)=>s+c.values.length,0),46);assert.equal(Object.values(summary.tiers).reduce((a,b)=>a+b),4444);
 const csv=request({kind:'csv'});const lines=csv.body.trim().split('\r\n');assert.equal(lines.length,4445);assert(lines[0].includes('attributes[Material]'));assert(lines[4444].includes('4444.svg'));assert(lines[1].includes('White Gold'));assert.match(csv.headers['Content-Type'],/text\/csv/);
});
test('each trait changes rendered pixels, and all 4,444 rasterized artworks are different',{skip:!process.env.VERIFY_PIXELS},async()=>{
 const sharp=require('sharp');sharp.cache(false);const hashes=new Set();
 async function pixelHash(id,row){return sha(await sharp(Buffer.from(R.render(id,row,{labels:false}))).resize(180,180,{kernel:'nearest'}).raw().toBuffer());}
 for(let base=0;base<4444;base+=24){const h=await Promise.all(M.rows.slice(base,base+24).map((row,j)=>pixelHash(base+j+1,row)));for(const v of h){assert(!hashes.has(v),'Duplicate rendered artwork');hashes.add(v);}}
 assert.equal(hashes.size,4444);
 for(let c=0;c<7;c++){const variants=new Set();for(let v=0;v<R.CATEGORIES[c].values.length;v++){const row=[...M.rows[124]];row[c+1]=v;variants.add(await pixelHash(125,row));}assert.equal(variants.size,R.CATEGORIES[c].values.length,`Visually hidden trait in ${R.CATEGORIES[c].name}`);}
});
