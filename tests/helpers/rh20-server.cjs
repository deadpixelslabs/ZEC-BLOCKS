'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const config = require('../../rh20/mainnet.json');
const originalConfig = { ...config };
const sweepConfig = require('../../rh20/sweep.json');
const originalSweepConfig = { ...sweepConfig };
const holderConfig = require('../../rh20/holder-market.json');
const originalHolderConfig = {...holderConfig};
const api = require('../../api/rh20.js');
async function serve(chain) {
  let published = true;
  let holderPublished = !!chain.holderMarket;
  const holderAddress = chain.holderMarket ? await chain.holderMarket.getAddress() : null;
  const configuredHolder = () => ({...originalHolderConfig, contractAddress:holderPublished?holderAddress:null, deploymentTxHash:holderPublished?chain.holderReceipt?.hash:null, deploymentBlock:holderPublished?chain.holderReceipt?.blockNumber:null});
  let sweepPublished = !!chain.sweep;
  let sweepOverride = null;
  let overrideAddress = null;
  let holderState = { holders: 2, status: 'ready' };
  let priceState = { usd: '3000', status: 'ready' };
  const address = await chain.market.getAddress();
  const oldRPC = process.env.RH20_RPC_URL;
  process.env.RH20_RPC_URL = chain.url;
  const configured = () => ({ ...originalConfig, contractAddress: published ? overrideAddress || address : null, deploymentTxHash: published ? chain.marketReceipt.hash : null, deploymentBlock: published ? chain.marketReceipt.blockNumber : null });
  const sweepAddress = chain.sweep ? await chain.sweep.getAddress() : null;
  const configuredSweep = () => ({ ...originalSweepConfig, marketplaceAddress: configured().contractAddress, contractAddress: sweepPublished ? sweepOverride || sweepAddress : null, deploymentTxHash: sweepPublished ? chain.sweepReceipt?.hash : null, deploymentBlock: sweepPublished ? chain.sweepReceipt?.blockNumber : null });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('Cache-Control', 'no-store');
      if (url.pathname === '/rh20/holder-market.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(configuredHolder())); return; }
      if (url.pathname === '/rh20/sweep.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(configuredSweep())); return; }
      if (url.pathname === '/rh20/mainnet.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(configured())); return; }
      if (url.pathname === '/api/rh20-price') { res.setHeader('Content-Type', 'application/json'); if (priceState.error) { res.statusCode=503; res.end('{}'); return; } res.end(JSON.stringify({ pair:'ETH-USD',source:'Coinbase Exchange',updatedAt:new Date().toISOString(),...priceState })); return; }
      if (url.pathname === '/index-api/functions/v1/zecblocks-rh20-holders') {
        res.setHeader('Content-Type', 'application/json');
        if (url.searchParams.get('view') === 'market') {
          const blockNumber=Number(BigInt(await chain.provider.send('eth_blockNumber',[]))), offset=Number(url.searchParams.get('offset')||0), all=[];
          const selected = holderPublished && url.searchParams.get('market')?.toLowerCase() === holderAddress?.toLowerCase() ? chain.holderMarket : chain.market;
          let total=0n;
          do { const page=await selected.getListings('RHSC','0x0000000000000000000000000000000000000000',all.length,50,{blockTag:blockNumber}); total=page[1];all.push(...page[0]); } while(BigInt(all.length)<total);
          all.sort((a,b)=>a.price*b.amount<b.price*a.amount?-1:a.price*b.amount>b.price*a.amount?1:a.id<b.id?-1:1);
          res.end(JSON.stringify({chainId:4663,ticker:'RHSC',marketplaceAddress:selected===chain.holderMarket?holderAddress:configured().contractAddress,sort:'unit-price-asc',ids:all.slice(offset,offset+12).map(x=>x.id.toString()),offset,total:Number(total),blockNumber,updatedAt:new Date().toISOString(),status:'ready'}));return;
        }
        if (holderState.error) { res.statusCode = 503; res.end(JSON.stringify({ error: 'Fixture unavailable' })); return; }
        res.end(JSON.stringify({ ...holderState, chainId: 4663, ticker: 'RHSC', coreAddress: config.coreAddress, marketplaceAddress: configured().contractAddress, marketplaceAddresses:[configured().contractAddress,...(holderPublished?[holderAddress]:[])], blockNumber: 75380000, updatedAt: new Date().toISOString() })); return;
      }
      if (url.pathname === '/_fixture/rpc' || url.pathname === '/api/rh20') {
        let raw = ''; for await (const part of req) raw += part;
        req.body = JSON.parse(raw);
        if (url.pathname === '/_fixture/rpc') {
          const upstream = await fetch(chain.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw });
          res.setHeader('Content-Type', 'application/json'); res.end(await upstream.text()); return;
        }
        Object.assign(holderConfig, configuredHolder()); Object.assign(config, configured()); Object.assign(sweepConfig, configuredSweep());
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        await api(req, res); return;
      }
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.promises.readFile(file));
    } catch (error) { res.statusCode = error.code === 'ENOENT' ? 404 : 500; res.end(String(error.message)); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { setHolderPublished: value => {holderPublished=value;}, url: 'http://127.0.0.1:' + server.address().port, setSweepPublished: value => { sweepPublished = value; }, setSweepAddress: value => { sweepOverride = value; }, setPrice: value => { priceState = value; }, setHolders: value => { holderState = value; }, setPublished: value => { published = value; }, setAddress: value => { overrideAddress = value; }, close: async () => { Object.assign(holderConfig, originalHolderConfig); Object.assign(config, originalConfig); Object.assign(sweepConfig, originalSweepConfig); if (oldRPC === undefined) delete process.env.RH20_RPC_URL; else process.env.RH20_RPC_URL = oldRPC; await new Promise(resolve => server.close(resolve)); } };
}
module.exports = { serve };
