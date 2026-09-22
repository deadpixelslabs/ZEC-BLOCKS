/* Shared request and transaction primitives. No wallet secrets are stored here. */
(function (root) {
  'use strict';
  const flights = new Map();
  function singleFlight(key, work) {
    if (flights.has(key)) return flights.get(key);
    const job = Promise.resolve().then(work).finally(() => {
      if (flights.get(key) === job) flights.delete(key);
    });
    flights.set(key, job);
    return job;
  }
  async function requestJSON(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {...options, signal: controller.signal});
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok === false) {
        const error = new Error(body?.error || body?.message || `Service unavailable (HTTP ${response.status}).`);
        error.status = response.status;
        throw error;
      }
      if (body === null) throw new Error('The server returned an incomplete response. Please retry.');
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request took too long. Your last verified data is still available.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function writeVerified(storage, key, value) {
    const raw = JSON.stringify(value);
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) throw new Error('Transaction recovery could not be saved. Enable browser storage before continuing.');
  }
  function journal(storage, key) {
    function read() {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows)) throw new Error('Transaction recovery data is unreadable. Check your wallet history before continuing.');
      return rows;
    }
    return {
      read,
      put(row) {
        const rows = read(), index = rows.findIndex(x => x.id === row.id);
        const next = {...(index < 0 ? {} : rows[index]), ...row, updatedAt: Date.now()};
        if (index < 0) rows.push(next); else rows[index] = next;
        writeVerified(storage, key, rows); // Never evict a pending payment to make room.
        return next;
      },
      remove(id) { writeVerified(storage, key, read().filter(x => x.id !== id)); }
    };
  }
  function validSnapshot(value, arrayFields) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      arrayFields.every(key => Array.isArray(value[key]));
  }
  function matchesBaseRequest(row, tx) {
    const lower=value=>String(value||'').toLowerCase();
    try {
      return !!tx && /^0x[0-9a-f]{40}$/.test(lower(row.evm)) &&
        /^0x[0-9a-f]{40}$/.test(lower(row.target)) && /^0x[0-9a-f]+$/.test(lower(row.data)) &&
        lower(tx.from)===lower(row.evm) && lower(tx.to)===lower(row.target) &&
        lower(tx.input||tx.data)===lower(row.data) && tx.value!=null && BigInt(tx.value)===0n;
    } catch { return false; }
  }
  async function discoverBaseTransaction(row, provider, indexedCandidates=async()=>[]) {
    const validHash=value=>/^0x[0-9a-f]{64}$/i.test(value||'');
    // Nonce history is an optimization, not the only way out of recovery. Some
    // wallets omit it, and public RPCs may not serve historical account state.
    if(Number.isSafeInteger(row.nonce)&&row.nonce>=0&&Number.isSafeInteger(row.requestBlock)&&row.requestBlock>=0){
      try {
        let low=row.requestBlock,high=await provider.getBlockNumber();
        if(high>=low&&await provider.getTransactionCount(row.evm,high)>row.nonce){
          while(low<high){const mid=Math.floor((low+high)/2);if(await provider.getTransactionCount(row.evm,mid)>row.nonce)high=mid;else low=mid+1;}
          const block=await provider.send('eth_getBlockByNumber',['0x'+low.toString(16),true]);
          const tx=(block?.transactions||[]).find(x=>String(x.from||'').toLowerCase()===String(row.evm).toLowerCase()&&Number(x.nonce)===row.nonce);
          if(matchesBaseRequest(row,tx)&&validHash(tx.hash))return tx.hash.toLowerCase();
        }
      } catch { /* Continue with indexed evidence, independently checked on Base. */ }
    }
    // These are only hints. Never complete from a database status or current NFT
    // ownership alone. Verify the exact sender, contract, calldata and value.
    for(const hash of [...new Set(await indexedCandidates())].filter(validHash).slice(0,8)){
      const tx=await provider.getTransaction(hash);
      if(matchesBaseRequest(row,tx)&&String(tx.hash||'').toLowerCase()===hash.toLowerCase())return hash.toLowerCase();
    }
    return '';
  }
  function nftId(value) {
    const id=String(value||'').trim().replace(/^0x/i,'').toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(id)||/^0+$/.test(id))throw new Error('Paste the recipient’s ZEC BLOCKS receive link or full NFT receiving ID.');
    return id;
  }
  function receiveLink(owner,genesis) {
    return 'https://www.zecblocks.xyz/#portfolio/receive/'+nftId(genesis)+'/'+nftId(owner);
  }
  function parseNftRecipient(value,genesis) {
    const input=String(value||'').trim();
    if(/^(?:0x)?[0-9a-f]{64}$/i.test(input))return {owner:nftId(input),source:'id'};
    if(/^(u1|t1|t3|0x)/i.test(input))throw new Error('This is a payment address. Ask the recipient to open Portfolio → Receive NFT and share their receive link.');
    let url;try{url=new URL(input)}catch{throw new Error('Paste a ZEC BLOCKS receive link or full NFT receiving ID.')}
    const match=url.hash.match(/^#portfolio\/receive\/([0-9a-f]{64})\/([0-9a-f]{64})$/i);
    if(url.protocol!=='https:'||!['www.zecblocks.xyz','zecblocks.xyz'].includes(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||!match)throw new Error('Use a receive link from zecblocks.xyz. Other links are not supported.');
    if(nftId(match[1])!==nftId(genesis))throw new Error('This receive link belongs to a different collection.');
    return {owner:nftId(match[2]),source:'link'};
  }
  const api = {singleFlight, requestJSON, writeVerified, journal, validSnapshot, matchesBaseRequest, discoverBaseTransaction, receiveLink, parseNftRecipient};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MarketRuntime = api;
})(typeof window === 'undefined' ? globalThis : window);
