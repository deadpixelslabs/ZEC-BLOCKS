'use strict';
// Adapted from the original ZEC BLOCKS 24 x 24 SVG geometry at a9437807.
// This is a separate, hosted Robinhood collection. No blockchain hash is implied.
const {createHash}=require('node:crypto');
const SUPPLY=4444;
const ORIGIN='https://www.zecblocks.xyz';
const PREFIX='/robinhood-blocks';
const NAME='ZEC BLOCKS — Robinhood';
const SEED='ZEC BLOCKS|ROBINHOOD|4444|2026-10-03';
const CATEGORIES=[
 {name:'Material',values:['Classic Gold','Burnished Gold','Champagne Gold','Rose Gold','White Gold','Obsidian Gold'],weights:[44,23,15,9,6,3]},
 {name:'Background',values:['Void','Micro Grid','Checker Field','Diagonal Weave','Falling Pixels','Concentric Grid','Horizontal Scan','Crosshatch'],weights:[25,22,17,12,10,7,5,2]},
 {name:'Frame',values:['Classic','Double Wall','Stepped','Fortress','Corner Gates','Circuit','Segmented','Beaded'],weights:[30,22,16,12,8,6,4,2]},
 {name:'Core',values:['Cross','Diamond','Vault','Star','Halo','Twin Pillars','Hollow Cross','Citadel'],weights:[32,23,16,11,8,5,3,2]},
 {name:'Pattern',values:['Balanced','Dense','Sparse','Fragmented','Monolith'],weights:[40,25,20,10,5]},
 {name:'Ornament',values:['None','Corner Studs','Inner Dots','Side Rails','Runes','Corner Seals'],weights:[40,25,16,10,6,3]},
 {name:'Aura',values:['None','Square Orbit','Diamond Orbit','Cardinal Rays','Scattered Glints'],weights:[58,20,12,7,3]}
];
const PALETTES=[
 ['#d3a84f','#e9c56e','#b98a37','#f0d690'],
 ['#b98a37','#d3a84f','#826121','#e4bd68'],
 ['#dfc486','#f5dfac','#b49350','#fff0c7'],
 ['#c99170','#f0bd9d','#946245','#ffdac3'],
 ['#c5c1ac','#f0ead6','#8d8876','#fff9e8'],
 ['#78653d','#d3a84f','#4f442b','#e9c56e']
];
function hash(id,nonce=0){return createHash('sha256').update(`${SEED}|${id}|${nonce}`).digest('hex');}
function pickTraits(id,nonce=0){const bytes=Buffer.from(hash(id,nonce),'hex');return CATEGORIES.map((c,i)=>{let n=bytes.readUInt32BE(i*4)/4294967296*c.weights.reduce((a,b)=>a+b,0);for(let k=0;k<c.weights.length;k++){n-=c.weights[k];if(n<0)return k;}return c.weights.length-1;});}
function validId(value){if(typeof value!=='string'||!/^[1-9][0-9]{0,3}(?:\.json|\.svg)?$/.test(value))return null;const id=Number(value.replace(/\.(json|svg)$/,''));return id<=SUPPLY?id:null;}
function tier(rank){return rank<=44?'Legendary':rank<=222?'Epic':rank<=667?'Rare':rank<=1778?'Uncommon':'Common';}
function render(id,row,{labels=true}={}){
 if(!Number.isInteger(id)||id<1||id>SUPPLY||!Array.isArray(row))throw Error('Invalid artwork');
 const nonce=row[0],t=row.slice(1,8),h=hash(id,nonce),bits=[...h+h].map(c=>parseInt(c,16).toString(2).padStart(4,'0')).join('');
 const [g1,g2,g3,g4]=PALETTES[t[0]],cell=20,pad=60,grid=24;
 const rect=(x,y,w=1,hh=1,fill=g1,opacity=1)=>`<rect x="${pad+x*cell}" y="${pad+y*cell}" width="${w*cell}" height="${hh*cell}" fill="${fill}" opacity="${opacity}"/>`;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" shape-rendering="crispEdges"><rect width="600" height="600" fill="#080808"/>';
 // Background patterns are rendered, not cosmetic metadata labels.
 for(let y=1;y<23;y++)for(let x=1;x<23;x++){
  const b=bits[(x+y*24)%bits.length]==='1';let on=false;
  switch(t[1]){case 0:on=(x+y)%5===0&&b;break;case 1:on=(x+y)%2===0&&b;break;case 2:on=(Math.floor(x/2)+Math.floor(y/2))%2===0;break;case 3:on=(x-y+24)%5===0;break;case 4:on=x%3===0&&b;break;case 5:on=Math.max(Math.abs(x-11.5),Math.abs(y-11.5))%3===1.5;break;case 6:on=y%3===0;break;case 7:on=(x+y)%6===0||(x-y+24)%6===0;}
  if(on)svg+=rect(x,y,1,1,t[1]===0?'#181613':'#26231b',t[1]===0?.35:.55);
 }
 // A gold outer boundary and geometric inner frame retain the original identity.
 for(let y=0;y<24;y++)for(let x=0;x<24;x++){
  const edge=x===0||y===0||x===23||y===23,inner=x===2||y===2||x===21||y===21;
  let on=false,color=(x+y)%3===0?g2:g1,opacity=.96;
  if(edge){on=true;if(t[2]===4&&((x>7&&x<16)||(y>7&&y<16)))on=false;if(t[2]===6&&(x+y)%5===3)on=false;if(t[2]===7&&(x+y)%2===1)on=false;}
  else if(inner){
   switch(t[2]){case 0:on=(x+y)%2===0||bits[(x*7+y*11)%512]==='1';break;case 1:on=true;break;case 2:on=(x+y)%4!==3;break;case 3:on=(x+y)%3!==1;break;case 4:on=(x<7||x>16)&&(y<7||y>16);break;case 5:on=(x+y)%5!==0;break;case 6:on=(x+y)%6<4;break;case 7:on=(x+y)%2===0;}
   color=g3;opacity=.88;
  }
  if(on)svg+=rect(x,y,1,1,color,opacity);
 }
 if(t[2]===2)for(const [x,y] of [[1,1],[19,1],[1,19],[19,19]])svg+=rect(x,y,4,1,g2)+rect(x,y,1,4,g2);
 if(t[2]===3)for(const [x,y] of [[1,1],[20,1],[1,20],[20,20]])svg+=rect(x,y,3,3,g1);
 if(t[2]===5)for(let i=4;i<20;i+=5)svg+=rect(i,1,2,1,g2)+rect(22,i,1,2,g2);
 // Aura behind the seeded central block arrangement.
 for(let y=4;y<20;y++)for(let x=4;x<20;x++){
  const dx=Math.abs(x-11.5),dy=Math.abs(y-11.5),m=Math.max(dx,dy);let on=false;
  if(t[6]===1)on=m===7.5;
  if(t[6]===2)on=dx+dy===9;
  if(t[6]===3)on=(dx<1&&dy>4)||(dy<1&&dx>4);
  if(t[6]===4)on=bits[(x*19+y*13)%512]==='1'&&(x+y)%7===0&&m>5;
  if(on)svg+=rect(x,y,1,1,g4,.24);
 }
 // Mirrored seed pattern derives from the same construction as the original renderer.
 for(let y=0;y<16;y++)for(let x=0;x<8;x++){
  const i=y*8+x,b1=bits[i]==='1',b2=bits[(i+29)%512]==='1',b3=bits[(i+61)%512]==='1',ring=Math.max(Math.abs(x-3.5),Math.abs(y-7.5));
  let on=ring<=1.5?(b1||b2):ring<=3.5?((b1&&b2)||(b1&&(x+y)%2===0)):ring<=6.5?(b1&&b2&&(b3||(x+y)%3===0)):false;
  if(t[4]===1)on=on||(ring<=5.5&&b1&&b3);
  if(t[4]===2)on=on&&b3;
  if(t[4]===3)on=on&&(x+y)%3!==0;
  if(t[4]===4)on=on||(ring<=3.5&&(b1||b2));
  if(on){const fill=(x+y)%5===0?g3:(b2&&b3?g2:g1);svg+=rect(4+x,4+y,1,1,fill,.98)+rect(19-x,4+y,1,1,fill,.98);}
 }
 // Central silhouette is explicitly different for each Core trait.
 for(let y=5;y<=18;y++)for(let x=5;x<=18;x++){
  const dx=Math.abs(x-11.5),dy=Math.abs(y-11.5),mx=Math.max(dx,dy);let on=false;
  switch(t[3]){
   case 0:on=(dx<1&&dy<5)||(dy<1&&dx<5)||mx<2;break;
   case 1:on=dx+dy<=5;break;
   case 2:on=mx<=4.5&&(mx>=3.5||mx<=1.5);break;
   case 3:on=(dx<1&&dy<6)||(dy<1&&dx<6)||dx+dy<=5;break;
   case 4:on=dx+dy>=4&&dx+dy<=6;break;
   case 5:on=dx>=1.5&&dx<=2.5&&dy<=4.5;break;
   case 6:on=((dx<2&&dy<5)||(dy<2&&dx<5))&&mx>=1.5;break;
   case 7:on=dy<=3.5&&dx<=3.5&&(y>=11||x%3!==0);break;
  }
  const hole=(t[3]===2&&mx>1.5&&mx<3.5)||(t[3]===4&&dx+dy<4)||(t[3]===6&&mx<1.5);
  if(hole)svg+=rect(x,y,1,1,'#080808',1);
  if(on)svg+=rect(x,y,1,1,(x+y)%5===0?g2:g1,1);
 }
 if(t[5]===1)for(const [x,y] of [[3,3],[20,3],[3,20],[20,20]])svg+=rect(x,y,1,1,g4);
 if(t[5]===2)for(let i=5;i<20;i+=3)svg+=rect(i,3,1,1,g2)+rect(i,20,1,1,g2);
 if(t[5]===3)svg+=rect(3,8,1,8,g3)+rect(20,8,1,8,g3);
 if(t[5]===4)for(const x of [3,19])for(const y of [5,16])svg+=rect(x,y,2,1,g2)+rect(x,y+1,1,2,g2)+rect(x+1,y+2,1,1,g2);
 if(t[5]===5)for(const [x,y] of [[3,3],[18,3],[3,18],[18,18]])svg+=rect(x,y,3,1,g4)+rect(x,y+1,1,2,g4)+rect(x+2,y+1,1,2,g4)+rect(x+1,y+2,1,1,g4);
 if(labels)svg+=`<text x="36" y="43" fill="#a89161" font-size="12" font-family="monospace" shape-rendering="auto">ZEC BLOCKS / RH #${String(id).padStart(4,'0')}</text><text x="36" y="570" fill="#6d665a" font-size="10" font-family="monospace" shape-rendering="auto">ROBINHOOD COLLECTION / ${h.slice(0,16).toUpperCase()}</text>`;
 return svg+'</svg>';
}
function metadata(id,row){return {name:`ZEC BLOCKS #${id}`,description:'ZEC BLOCKS on Robinhood Chain. A collection of 4,444 unique geometric SVG artworks, evolving the original gold block design through seven visual traits. Artwork and metadata are hosted on zecblocks.xyz.',image:`${ORIGIN}${PREFIX}/images/${id}.svg`,external_url:`${ORIGIN}${PREFIX}/?token=${id}`,attributes:[...CATEGORIES.map((c,i)=>({trait_type:c.name,value:c.values[row[i+1]]})),{trait_type:'Rarity',value:tier(row[8])}],properties:{edition:id,collection_supply:SUPPLY,chain:'Robinhood Chain',project_rarity_rank:row[8],project_rarity_score:row[9],rarity_method:'Sum of supply / trait frequency for the seven visual traits; ties are ordered by artwork seed. Rarity tier is derived after ranking.',artwork_sha256:row[10]}};}
module.exports={SUPPLY,ORIGIN,PREFIX,NAME,SEED,CATEGORIES,hash,pickTraits,validId,tier,render,metadata};
