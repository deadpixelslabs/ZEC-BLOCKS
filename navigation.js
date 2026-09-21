(function(){
  const viewMap={market:'market',activity:'activity',portfolio:'portfolio',protocol:'protocol',mining:'market','usdc-market':'market','zec-market':'market','zecs-market':'market'};
  function currentView(){const h=(location.hash||'#market').slice(1);return viewMap[h]||'market'}
  function currentAsset(){return location.hash==='#zecs-market'?'zecs':'nft'}
  function currentRail(){return location.hash==='#zec-market'?'zec':'usdc'}
  function showRail(rail){
    document.querySelectorAll('[data-market-rail]').forEach(b=>b.classList.toggle('active',b.dataset.marketRail===rail));
    document.querySelectorAll('[data-market-rail-view]').forEach(v=>v.classList.toggle('active',v.dataset.marketRailView===rail));
    try{localStorage.setItem('zb1_market_rail',rail)}catch{}
  }
  function showAsset(asset){
    document.querySelectorAll('[data-market-asset]').forEach(b=>b.classList.toggle('active',b.dataset.marketAsset===asset));
    document.querySelectorAll('[data-market-asset-view]').forEach(v=>v.classList.toggle('active',v.dataset.marketAssetView===asset));
    if(asset==='nft'){
      let rail=currentRail();if(location.hash==='#market'){try{rail=localStorage.getItem('zb1_market_rail')||'usdc'}catch{rail='usdc'}}showRail(rail)
    }else if(typeof window.loadZecsMarketState==='function')window.loadZecsMarketState({account:true}).catch(()=>{});
  }
  function showView(name,scroll=false){
    document.querySelectorAll('[data-app-tab]').forEach(a=>a.setAttribute('aria-current',a.dataset.appTab===name?'page':'false'));
    if(typeof renderFeedStatus==='function')setTimeout(renderFeedStatus,0);
    document.querySelectorAll('.appView').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
    document.querySelectorAll('[data-app-tab]').forEach(a=>a.classList.toggle('active',a.dataset.appTab===name));
    if(name==='market')showAsset(currentAsset());if(scroll)window.scrollTo({top:0,behavior:'smooth'})
  }
  document.addEventListener('click',e=>{
    const ab=e.target.closest('[data-market-asset]');if(ab){e.preventDefault();const a=ab.dataset.marketAsset;history.replaceState(null,'',a==='zecs'?'#zecs-market':'#market');showView('market');showAsset(a);return}
    const rb=e.target.closest('[data-market-rail]');if(rb){e.preventDefault();const r=rb.dataset.marketRail;history.replaceState(null,'',r==='zec'?'#zec-market':'#market');showView('market');showAsset('nft');showRail(r);return}
    const tab=e.target.closest('[data-app-tab]');if(tab)setTimeout(()=>showView(tab.dataset.appTab,true),0)
  });
  window.addEventListener('hashchange',()=>showView(currentView(),true));
  document.addEventListener('DOMContentLoaded',()=>showView(currentView(),false));
  if(document.readyState!=='loading')showView(currentView(),false);
})();
