'use strict';
(()=>{
 const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-US');let catalog=null,limit=24,filtered=[];const selectors=[];
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function show(token){
  $('detail-title').textContent=`ZEC BLOCKS #${token.id}`;$('detail-image').src=`/robinhood-blocks/images/${token.id}.svg`;$('detail-image').alt=`ZEC BLOCKS #${token.id}`;
  $('detail-rank').textContent=`${token.rarity} · Collection rank #${fmt(token.rank)} / 4,444`;$('detail-json').href=`/robinhood-blocks/metadata/${token.id}`;
  const traits=$('detail-traits');traits.replaceChildren();catalog.categories.forEach((c,i)=>{const value=token.traits[i],count=c.counts[value],d=el('div'),dd=el('dd','',c.values[value]);dd.append(el('small','',`${fmt(count)} blocks · ${(count/4444*100).toFixed(2)}%`));d.append(el('dt','',c.name),dd);traits.append(d);});
  if(!$('detail').open)$('detail').showModal();history.replaceState(null,'',`?token=${token.id}#collection`);
 }
 function close(){if($('detail').open)$('detail').close();history.replaceState(null,'',location.pathname+'#collection');}
 function paint(){
  const grid=$('grid');grid.replaceChildren();for(const token of filtered.slice(0,limit)){
   const card=el('button','card');card.type='button';card.setAttribute('aria-label',`View ZEC BLOCKS #${token.id}`);const image=el('img');image.src=`/robinhood-blocks/images/${token.id}.svg`;image.alt=`ZEC BLOCKS #${token.id}`;image.width=600;image.height=600;image.loading='lazy';
   const info=el('div','card-info'),foot=el('div','card-foot');foot.append(el('span','rarity',token.rarity),el('span','',`RANK #${fmt(token.rank)}`));info.append(el('strong','',`ZEC BLOCKS #${String(token.id).padStart(4,'0')}`),foot);card.append(image,info);card.addEventListener('click',()=>show(token));grid.append(card);
  }
  if(!filtered.length)grid.append(el('p','empty','No blocks match these filters.'));
  $('count').textContent=`${fmt(filtered.length)} / 4,444 blocks`;$('more').hidden=limit>=filtered.length;$('showing').textContent=`Showing ${fmt(Math.min(limit,filtered.length))} of ${fmt(filtered.length)}`;
 }
 function filter(){if(!catalog)return;const q=$('search').value.trim().replace(/^#/,'').toLowerCase(),rarity=$('rarity').value;filtered=catalog.tokens.filter(t=>(!q||String(t.id)===q||`zec blocks #${t.id}`===q)&&(!rarity||t.rarity===rarity)&&selectors.every((s,i)=>s.value===''||t.traits[i]===Number(s.value))).sort((a,b)=>$('sort').value==='rank'?a.rank-b.rank:a.id-b.id);limit=24;paint();}
 $('close').addEventListener('click',close);$('detail').addEventListener('cancel',e=>{e.preventDefault();close();});$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 $('search').addEventListener('input',filter);$('rarity').addEventListener('change',filter);$('sort').addEventListener('change',filter);$('more').addEventListener('click',()=>{limit+=24;paint();});
 $('reset').addEventListener('click',()=>{$('search').value='';$('rarity').value='';$('sort').value='id';selectors.forEach(s=>s.value='');filter();});
 $('traits-toggle').addEventListener('click',()=>{const open=$('trait-filters').hidden;$('trait-filters').hidden=!open;$('traits-toggle').setAttribute('aria-expanded',String(open));$('traits-toggle').textContent=open?'ALL TRAITS −':'ALL TRAITS +';});
 $('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('base-uri').value);$('copy-status').textContent='Base URI copied. Keep the trailing slash.';}catch{$('base-uri').focus();$('base-uri').select();$('copy-status').textContent='Select and copy the Base URI above.';}});
 fetch('/robinhood-blocks/catalog.json').then(r=>{if(!r.ok)throw Error('Unavailable');return r.json();}).then(data=>{
  catalog=data;data.categories.forEach((c,i)=>{const label=el('label');label.append(el('span','',c.name.toUpperCase()));const select=el('select');select.setAttribute('aria-label',c.name);const all=el('option','','All '+c.name.toLowerCase());all.value='';select.append(all);c.values.forEach((v,j)=>{const option=el('option','',`${v} (${fmt(c.counts[j])})`);option.value=String(j);select.append(option);});select.addEventListener('change',filter);selectors.push(select);label.append(select);$('trait-filters').append(label);});
  for(const name of ['Legendary','Epic','Rare','Uncommon','Common']){const row=el('div','tier'),n=data.tiers[name];row.append(el('strong','',name),el('span','',`${fmt(n)} blocks`),el('small','',`${(n/4444*100).toFixed(1)}%`));$('tiers').append(row);}
  filter();const raw=new URLSearchParams(location.search).get('token');if(raw&&/^[1-9]\d{0,3}$/.test(raw)){const t=data.tokens.find(t=>t.id===Number(raw));if(t)show(t);}
 }).catch(()=>{$('count').textContent='Collection temporarily unavailable';$('error').hidden=false;$('error').textContent='The catalog could not load. Reload the page to try again.';});
})();
