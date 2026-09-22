/* ZB-1 deterministic renderer consensus source.
 * Input: lower-case source block hash, source height, token ID.
 * Output: a 600x600 SVG string. No network or server state is consulted.
 */
'use strict';

function escapeXml(value){
  return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function renderZb1Svg(sourceHash,sourceHeight,tokenId){
  if(typeof sourceHash!=='string'||!/^[0-9a-f]{64}$/.test(sourceHash)||!Number.isInteger(tokenId)||tokenId<1||tokenId>5000||sourceHeight!==3488573-tokenId)throw new Error('Invalid ZB-1 artwork source');
  const seed=String(sourceHash).toLowerCase()+':'+Number(sourceHeight);
  const label='ZB #'+Number(tokenId);
  const gold=['#d3a84f','#e9c56e','#b98a37','#f0d690'];
  const bg=['#080808','#0c0c0c','#11100e','#0a0a0a'];
  const dark=['#111','#141311','#181613','#1d1a15'];
  const hex=(seed+seed).replace(/[^0-9a-f]/g,'')||'0';
  const bits=[...hex].map(ch=>parseInt(ch,16).toString(2).padStart(4,'0')).join('');
  const grid=24,cell=20,pad=60;
  const bgc=bg[parseInt(hex[0]||'0',16)%bg.length];
  const g1=gold[parseInt(hex[1]||'0',16)%4],g2=gold[parseInt(hex[2]||'0',16)%4];
  const g3=gold[parseInt(hex[3]||'0',16)%4],d1=dark[parseInt(hex[4]||'0',16)%4];
  const rect=(x,y,w=1,h=1,fill=d1,opacity=1)=>`<rect x="${pad+x*cell}" y="${pad+y*cell}" width="${w*cell}" height="${h*cell}" fill="${fill}" opacity="${opacity}"/>`;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="${bgc}"/>`;
  for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
    const i=(x+y*grid)%bits.length;
    if(((x+y)%2===0&&bits[i]==='1')||((x+y)%5===0&&bits[(i+17)%bits.length]==='1'))svg+=rect(x,y,1,1,dark[(x+y)%4],.35);
  }
  for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
    const edge=x===0||y===0||x===grid-1||y===grid-1;
    const inner=x===2||y===2||x===grid-3||y===grid-3;
    if(edge)svg+=rect(x,y,1,1,(x+y)%3===0?g2:g1,.96);
    else if(inner&&((x+y)%2===0||bits[(x*7+y*11)%bits.length]==='1'))svg+=rect(x,y,1,1,g3,.88);
  }
  for(let y=0;y<16;y++)for(let x=0;x<8;x++){
    const i=(y*8+x)%bits.length,b1=bits[i]==='1',b2=bits[(i+29)%bits.length]==='1',b3=bits[(i+61)%bits.length]==='1';
    const ring=Math.max(Math.abs(x-3.5),Math.abs(y-7.5));
    const on=ring<=1.5?(b1||b2):ring<=3.5?((b1&&b2)||(b1&&((x+y)%2===0))):ring<=6.5?(b1&&b2&&(b3||((x+y)%3===0))):false;
    if(on){const fill=(x+y)%5===0?g3:(b2&&b3?g2:g1);svg+=rect(4+x,4+y,1,1,fill,.98)+rect(grid-5-x,4+y,1,1,fill,.98);}
  }
  const arm=3+(parseInt(hex[5]||'0',16)%4);
  svg+=rect(11,11-arm,2,arm*2+2,g2,.96)+rect(11-arm,11,arm*2+2,2,g2,.96)+rect(10,10,4,4,g1,1);
  return svg+`<text x="36" y="46" fill="#6d665a" font-size="14" font-family="monospace">ZEC BLOCKS / ${escapeXml(label)}</text><text x="36" y="568" fill="#45413b" font-size="11" font-family="monospace">${escapeXml(seed.slice(0,34).toUpperCase())}</text></svg>`;
}
