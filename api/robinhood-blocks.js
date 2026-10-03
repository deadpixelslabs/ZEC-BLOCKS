'use strict';
const {createHash}=require('node:crypto');
const R=require('../collections/robinhood-blocks/renderer.cjs');
const M=require('../collections/robinhood-blocks/manifest.json');
const csvCell=v=>'"'+String(v).replaceAll('"','""')+'"';
const csv=()=>[['tokenID','name','description','file_name','external_url',...R.CATEGORIES.map(c=>`attributes[${c.name}]`),'attributes[Rarity]'].map(csvCell).join(','),...M.rows.map((row,i)=>{const m=R.metadata(i+1,row);return [i+1,m.name,m.description,`${i+1}.svg`,m.external_url,...m.attributes.map(a=>a.value)].map(csvCell).join(',');})].join('\r\n')+'\r\n';
const summary={name:M.name,supply:M.supply,categories:M.categories,tiers:M.tiers,baseURI:`${R.ORIGIN}${R.PREFIX}/metadata/`,rarityMethod:'Sum of 4444 / frequency across the seven visual traits. Rank ties use the artwork seed. These are collection ranks, not a promise of OpenSea rank.'};
module.exports=function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS'){res.setHeader('Allow','GET, HEAD, OPTIONS');return res.status(204).end();}
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD, OPTIONS');res.setHeader('Cache-Control','no-store');return res.status(405).json({error:'Method not allowed'});}
 const kind=req.query.kind;let body,type='application/json; charset=utf-8';
 if(kind==='metadata'||kind==='image'){
  const raw=req.query.id;const id=R.validId(raw);
  if(!id||(kind==='metadata'&&String(raw).endsWith('.svg'))||(kind==='image'&&String(raw).endsWith('.json'))){res.setHeader('Cache-Control','no-store');return res.status(404).json({error:'Token not found',supply:R.SUPPLY});}
  body=kind==='metadata'?JSON.stringify(R.metadata(id,M.rows[id-1])):R.render(id,M.rows[id-1]);
  if(kind==='image'){type='image/svg+xml; charset=utf-8';res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox");}
 }else if(kind==='summary')body=JSON.stringify(summary);
 else if(kind==='catalog')body=JSON.stringify({...summary,tokens:M.rows.map((row,i)=>({id:i+1,traits:row.slice(1,8),rank:row[8],rarity:R.tier(row[8])}))});
 else if(kind==='csv'){body=csv();type='text/csv; charset=utf-8';res.setHeader('Content-Disposition','attachment; filename="ZEC-BLOCKS-ROBINHOOD-4444-METADATA.csv"');}
 else{res.setHeader('Cache-Control','no-store');return res.status(404).json({error:'Not found'});}
 const etag='"'+createHash('sha256').update(body).digest('hex')+'"';
 res.setHeader('Content-Type',type);res.setHeader('ETag',etag);res.setHeader('Cache-Control','public, max-age=300, s-maxage=86400, stale-while-revalidate=3600');
 if(req.headers['if-none-match']===etag)return res.status(304).end();
 return res.status(200).send(req.method==='HEAD'?'':body);
};
