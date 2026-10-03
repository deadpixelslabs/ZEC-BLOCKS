'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const R=require('./renderer.cjs');
const digest=s=>createHash('sha256').update(s).digest('hex');
const rows=[],seenTraits=new Set(),seenArt=new Set();
for(let id=1;id<=R.SUPPLY;id++){
 let nonce=0,row,key,artHash;
 do{assert(nonce<10000);const traits=R.pickTraits(id,nonce);row=[nonce,...traits];key=traits.join(',');artHash=digest(R.render(id,row,{labels:false}));nonce++;}while(seenTraits.has(key)||seenArt.has(artHash));
 seenTraits.add(key);seenArt.add(artHash);rows.push(row);
}
const categories=R.CATEGORIES.map(c=>({name:c.name,values:c.values,counts:c.values.map(()=>0)}));
for(const row of rows)row.slice(1,8).forEach((v,i)=>categories[i].counts[v]++);
const ranks=rows.map((row,index)=>({index,score:row.slice(1,8).reduce((sum,v,i)=>sum+R.SUPPLY/categories[i].counts[v],0),tie:R.hash(index+1,row[0])})).sort((a,b)=>b.score-a.score||a.tie.localeCompare(b.tie));
for(let n=0;n<ranks.length;n++){const {index,score}=ranks[n];rows[index].push(n+1,Number(score.toFixed(6)));rows[index].push(digest(R.render(index+1,rows[index])));}
const tiers={};for(const row of rows){const t=R.tier(row[8]);tiers[t]=(tiers[t]||0)+1;}
const manifest={name:R.NAME,supply:R.SUPPLY,seed:R.SEED,sourceRendererCommit:'a9437807f35bc6fc96db334b265bc63845c97a18',origin:R.ORIGIN,prefix:R.PREFIX,categories,tiers,rows};
const body=JSON.stringify(manifest)+'\n';const dest=path.join(__dirname,'manifest.json');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(dest,'utf8'),body,'Frozen manifest differs');else fs.writeFileSync(dest,body);
const exportIndex=process.argv.indexOf('--export');
if(exportIndex>=0){const out=path.resolve(process.argv[exportIndex+1]);for(const d of ['images','metadata'])fs.mkdirSync(path.join(out,d),{recursive:true});for(let id=1;id<=R.SUPPLY;id++){fs.writeFileSync(path.join(out,'images',`${id}.svg`),R.render(id,rows[id-1]));fs.writeFileSync(path.join(out,'metadata',`${id}.json`),JSON.stringify(R.metadata(id,rows[id-1]))+'\n');}fs.writeFileSync(path.join(out,'collection-summary.json'),JSON.stringify({...manifest,rows:undefined},null,2)+'\n');}
console.log(JSON.stringify({supply:rows.length,uniqueTraitCombinations:seenTraits.size,uniqueUnlabelledArtworks:seenArt.size,tiers,categories,manifestSHA256:digest(body)},null,2));
