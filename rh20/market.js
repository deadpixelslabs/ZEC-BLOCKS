(function () {
  'use strict';
  const E = window.ethers, $ = id => document.getElementById(id), holderDeployMode = document.body.dataset.mode === 'holder-deploy', sweepDeployMode = document.body.dataset.mode === 'sweep-deploy', deployMode = holderDeployMode || sweepDeployMode || document.body.dataset.mode === 'deploy';
  const S = { account: null, chain: null, wallet: null, wallets: [], generation: 0, busy: false, verified: false, refreshing: false, checking: false, pending: null, completed: null, offset: 0, ownedOffset: 0, total: 0n, ownedTotal: 0n, lots: [], owned: [], balance: 0n, allowance: 0n, credit: 0n, tab: 'buy' };
  const CORE = '0x4e89Bc6A7A218B338060d428f40d8f551efc8058', TREASURY = '0x81046ab56F41a78077662624aC4116465fDf00cc';
  const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
  const count = n => BigInt(n).toLocaleString('en-US'), eth = n => E.formatEther(n), short = a => a.slice(0, 6) + '…' + a.slice(-4);
  const feeFor = price => price * 300n / 10000n;
  const unitEth = lot => E.formatUnits(BigInt(lot.price) * 1000000000n / BigInt(lot.amount), 27);
  const usdText = value => '$' + (value > 0 && value < 0.00000001 ? value.toExponential(4) : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: value < 0.01 ? 10 : 6 }));
  const priceUsable = () => S.usd && Date.now() - Date.parse(S.usd.updatedAt) < 300000;
  const priceDelayed = () => S.usd?.status !== 'ready' || Date.now() - Date.parse(S.usd.updatedAt) > 90000;
  function usdQuote(lot, perToken = false) { if (!priceUsable()) return 'USD estimate unavailable'; const value = Number(eth(lot.price)) * Number(S.usd.usd) / (perToken ? Number(lot.amount) : 1); return '≈ ' + usdText(value) + (perToken ? ' / RHSC' : ' total') + (priceDelayed() ? ' · delayed rate' : ''); }
  const bounded = (promise, ms = 12000) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Connection delayed. Check again in a moment.')), ms); promise.then(x => { clearTimeout(timer); resolve(x); }, e => { clearTimeout(timer); reject(e); }); });
  const message = e => e?.code === 4001 || e?.code === 'ACTION_REJECTED' ? 'Request cancelled in your wallet.' : String(e?.shortMessage || e?.message || e).slice(0, 250);
  function status(text, kind = '') { $('status').textContent = text; $('status').className = 'status ' + kind; }
  function guard(fn) { return (...args) => Promise.resolve().then(() => fn(...args)).catch(e => status(message(e), 'error')); }
  const sweep = window.createRH20Sweep({ S, E, $, same, bounded, status, guard, render, submit, connect, reader, identity, count, eth, unitEth, usdQuote, feeFor, deployMode });
  const deploymentKind = holderDeployMode ? 'deployHolder' : sweepDeployMode ? 'deploySweep' : 'deploy';
  const holderMode = () => S.config === S.holderConfig;
  const previousMode = () => !deployMode && !holderMode() && !!S.holderConfig?.contractAddress;
  function artifactForRecord(record) { return record.kind === 'deployHolder' || same(record.to, S.holderConfig?.contractAddress) ? S.holderArtifact : record.kind === 'deploySweep' || same(record.to, S.oldSweepConfig?.contractAddress) ? S.oldSweepArtifact : S.legacyArtifact; }
  function indexQuery(offset) { return '/index-api/functions/v1/zecblocks-rh20-holders?view=market&offset=' + offset + '&market=' + S.config.contractAddress; }
  const deploymentConfig = () => sweepDeployMode ? S.sweepConfig : S.config;
  const deploymentArtifact = () => sweepDeployMode ? S.sweepArtifact : S.artifact;
  function theme(value) { document.documentElement.dataset.theme = value; $('theme').textContent = value === 'dark' ? '☀' : '☾'; $('theme').setAttribute('aria-label', 'Switch to ' + (value === 'dark' ? 'light' : 'dark') + ' theme'); try { localStorage.setItem('rh20-theme', value); } catch (_) {} }
  try { theme(localStorage.getItem('rh20-theme') === 'light' ? 'light' : 'dark'); } catch (_) { theme('dark'); }
  $('theme').onclick = () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = guard(async () => { await navigator.clipboard.writeText($(b.dataset.copy).textContent); status('Copied.'); }));
  function addWallet(provider, name) { if (!provider?.request || S.wallets.some(w => w.provider === provider)) return; S.wallets.push({ provider, name }); const o = document.createElement('option'); o.value = S.wallets.length - 1; o.textContent = String(name || 'Browser wallet').slice(0, 40); $('walletSelect').append(o); $('walletSelect').hidden = S.wallets.length < 2; }
  window.addEventListener('eip6963:announceProvider', e => addWallet(e.detail?.provider, e.detail?.info?.name));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  function legacyWallets() { for (const p of window.ethereum?.providers || (window.ethereum ? [window.ethereum] : [])) addWallet(p, p.isRabby ? 'Rabby' : p.isMetaMask ? 'MetaMask' : 'Browser wallet'); }
  legacyWallets();
  function reader() { return S.provider && S.chain === 4663 ? S.provider : S.publicReader; }
  function key(account = S.account) { return 'rh20-market:4663:' + account.toLowerCase(); }
  function load() {
    S.pending = null; S.completed = null;
    if (!S.account) return;
    let record;
    try { record = JSON.parse(localStorage.getItem(key()) || 'null'); } catch (_) { throw new Error('Enable site storage to keep transaction recovery available.'); }
    if (record) {
      if (!same(record.account, S.account) || record.chainId !== 4663 || !/^0x[0-9a-f]+$/i.test(record.data || '') || !['deploy', 'deployHolder', 'deploySweep', 'sweep', 'approve', 'list', 'buy', 'cancel', 'withdraw'].includes(record.kind)) throw new Error('Invalid transaction recovery record.');
      if (['deploy', 'deployHolder', 'deploySweep'].includes(record.kind) ? record.to !== null || record.data !== artifactForRecord(record)?.bytecode : ![CORE, S.legacyConfig.contractAddress, S.holderConfig.contractAddress, S.oldSweepConfig?.contractAddress].some(a => same(a, record.to))) throw new Error('Saved transaction targets a different deployment.');
      if (record.completed) S.completed = record; else S.pending = record;
    }
  }
  function save(record) { localStorage.setItem(key(record.account), JSON.stringify(record)); if (same(S.account, record.account)) S.pending = record; }
  function clear(record) { localStorage.removeItem(key(record.account)); if (same(S.account, record.account)) S.pending = null; }
  function receiptView(record) {
    if (!deployMode || !record?.contractAddress || record.kind !== deploymentKind) return;
    $('receipt').hidden = false; $('deployedAddress').textContent = record.contractAddress; $('deployedHash').textContent = record.hash; $('receiptLink').href = S.config.explorerUrl + '/tx/' + record.hash;
  }
  function render() {
    $('connect').textContent = S.account ? short(S.account) : 'Connect wallet'; $('connect').disabled = S.busy;
    $('walletSelect').disabled = S.busy;
    $('recovery').hidden = !S.pending;
    if (S.pending) { $('recoveryText').textContent = S.pending.hash ? 'Transaction saved. Check its confirmation without sending again.' : 'Your wallet request is unresolved. Paste its transaction hash from wallet activity to recover it. This page will not resend it.'; $('checkPending').hidden = !S.pending.hash; }
    if (deployMode) {
      $('deploy').disabled = !deploymentArtifact() || S.busy || !!S.pending || (S.completed?.kind === deploymentKind && !!S.completed.contractAddress) || !!deploymentConfig()?.contractAddress;
      $('deploy').textContent = deploymentConfig()?.contractAddress || (S.completed?.kind === deploymentKind && S.completed.contractAddress) ? (sweepDeployMode ? 'Sweep deployed' : 'Marketplace deployed') : S.busy ? 'Check your wallet…' : S.pending ? 'Deployment pending' : sweepDeployMode ? 'Deploy Sweep helper' : 'Deploy marketplace'; receiptView(S.completed); return;
    }
    $('badge').textContent = !S.config?.contractAddress ? 'Settlement deployment pending' : S.verified ? 'Robinhood Chain · ETH' : 'Checking market';
    $('balance').textContent = S.account && S.verified ? count(S.balance) : '—';
    $('credit').textContent = S.account && S.verified ? eth(S.credit) + ' ETH' : '—';
    $('withdraw').disabled = !S.verified || S.busy || !!S.pending || !S.account || S.credit === 0n;
    const ready = S.verified && !S.busy && !S.pending;
    const amount = parseAmount(false);
    $('sellAction').disabled = !ready || !S.config?.contractAddress || previousMode();
    $('sellAction').textContent = S.busy ? 'Check your wallet…' : S.pending ? 'Transaction pending' : !S.account ? 'Connect wallet to sell' : amount && S.allowance >= amount ? 'Create listing' : amount ? 'Approve ' + count(amount) + ' RHSC' : 'Approve RHSC';
    document.querySelectorAll('[data-trade]').forEach(b => { b.disabled = !ready; });
    $('prev').disabled = S.offset === 0; $('next').disabled = BigInt(S.offset + 12) >= S.total;
    $('ownedPrev').disabled = S.ownedOffset === 0; $('ownedNext').disabled = BigInt(S.ownedOffset + 12) >= S.ownedTotal;
    $('pageNumber').textContent = 'Page ' + (S.offset / 12 + 1); $('ownedPage').textContent = 'Page ' + (S.ownedOffset / 12 + 1);
    $('confirmBuy').disabled = !ready; sweep.paint();
  }
  async function validate(provider, market = S.config.contractAddress, blockTag = 'latest', artifact = S.artifact) {
    if (BigInt(await bounded(provider.send('eth_chainId', []))) !== 4663n) throw new Error('Switch to Robinhood Chain.');
    if (artifact === S.holderArtifact && E.keccak256(await bounded(provider.getCode(S.holderConfig.collectionAddress, blockTag))) !== S.nftArtifact.runtimeCodeHash) throw Error('NFT collection verification failed.');
    const coreCode = await bounded(provider.getCode(CORE, blockTag));
    if (E.keccak256(coreCode) !== S.coreArtifact.runtimeCodeHash) throw new Error('RH-20 contract verification failed. Trading is disabled.');
    if (market) {
      const code = await bounded(provider.getCode(market, blockTag));
      if (E.keccak256(code) !== artifact.runtimeCodeHash) throw new Error('Marketplace verification failed. Trading is disabled.');
    }
  }
  function card(lot, owned) {
    const card = document.createElement('article'); card.className = 'lot';
    const top = document.createElement('div'); top.className = 'lot-top';
    const symbol = document.createElement('span'); symbol.className = 'token-mark'; symbol.textContent = 'R';
    const label = document.createElement('span'); label.className = 'muted'; label.textContent = 'RH-20 · Lot #' + lot.id;
    top.append(symbol, label);
    const amount = document.createElement('h3'); amount.textContent = count(lot.amount) + ' RHSC';
    const unit = document.createElement('p'); unit.className = 'unit-price'; unit.textContent = '≈ ' + unitEth(lot) + ' ETH / RHSC';
    const unitUsd = document.createElement('p'); unitUsd.className = 'unit-usd'; unitUsd.textContent = usdQuote(lot, true);
    const price = document.createElement('strong'); price.className = 'price'; price.textContent = eth(lot.price) + ' ETH';
    const totalUsd = document.createElement('p'); totalUsd.className = 'total-usd muted'; totalUsd.textContent = 'Complete lot · ' + usdQuote(lot);
    const button = document.createElement('button'); button.dataset.trade = 'true'; button.className = owned ? 'button secondary wide' : 'button wide';
    if (owned || same(lot.seller, S.account)) { button.textContent = 'Cancel listing'; button.onclick = guard(() => submit('cancel', { id: lot.id.toString() })); }
    else { button.textContent = 'Buy Now'; button.onclick = () => reviewBuy(lot); }
    card.append(top, amount, unit, unitUsd, price, totalUsd, button); return card;
  }
  function paintLots(id, lots, owned) { const node = $(id); node.replaceChildren(); if (!lots.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = owned ? S.account ? 'No active listings in this wallet.' : 'Connect your wallet to manage listings.' : S.boardError || (S.config.contractAddress ? 'No RHSC listings yet. Be the first to list a lot.' : 'Listings open after the marketplace settlement contract is deployed.'); node.append(p); } else lots.forEach(lot => node.append(card(lot, owned))); }
  async function sortedBoard(market, offset, blockTag) {
    try {
      const response = await fetch(indexQuery(offset), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Sorted listings temporarily unavailable. Refresh to retry.');
      const board = await response.json();
      if (board.chainId !== 4663 || board.ticker !== 'RHSC' || !same(board.marketplaceAddress, S.config.contractAddress) || board.sort !== 'unit-price-asc' || board.offset !== offset || !Number.isSafeInteger(board.total) || board.total < 0 || !Array.isArray(board.ids) || board.ids.length > 12 || new Set(board.ids).size !== board.ids.length || board.ids.some(id => !/^[1-9][0-9]{0,77}$/.test(id)) || !Number.isSafeInteger(board.blockNumber) || board.blockNumber > blockTag) throw Error('Sorted listings verification delayed. Refresh to retry.');
      if (board.status !== 'ready' || !Number.isFinite(Date.parse(board.updatedAt)) || Date.now() - Date.parse(board.updatedAt) > 90000) throw Error('Sorted listings are syncing. Refresh in a moment.');
      // Read every displayed lot from the settlement contract. The index only
      // selects globally ordered IDs; it never supplies transaction prices.
      const lots = await Promise.all(board.ids.map(id => market.listings(id, { blockTag })));
      const active = lots.filter(lot => lot.state === 1n && lot.tick === 'RHSC' && lot.amount > 0n);
      active.sort((a, b) => { const left = a.price * b.amount, right = b.price * a.amount; return left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : 1; });
      S.boardError = null; S.boardOffset = offset; S.boardBlock = board.blockNumber; return [active, BigInt(board.total)];
    } catch (error) { S.boardError = message(error); return S.boardOffset === offset ? [S.lots, S.total] : [[], 0n]; }
  }
  async function refreshReference() {
    if (deployMode || S.priceRefreshing) return;
    S.priceRefreshing = true;
    try {
      const response = await fetch('/api/rh20-price', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Reference unavailable');
      const data = await response.json(), time = Date.parse(data.updatedAt);
      if (data.pair !== 'ETH-USD' || data.source !== 'Coinbase Exchange' || !['ready', 'delayed'].includes(data.status) || !Number.isFinite(Number(data.usd)) || Number(data.usd) <= 0 || !Number.isFinite(time) || time > Date.now() + 30000 || Date.now() - time > 300000) throw Error('Invalid reference');
      S.usd = data;
    } catch (_) { if (S.usd) S.usd.status = 'delayed'; }
    finally {
      S.priceRefreshing = false;
      $('priceSource').textContent = priceUsable() ? 'USD estimates · ETH/USD ' + usdText(Number(S.usd.usd)) + ' · Coinbase Exchange · ' + new Date(S.usd.updatedAt).toLocaleTimeString('en-US') + (priceDelayed() ? ' · Update delayed' : '') : 'USD estimates unavailable · Prices and settlement remain in ETH';
      paintLots('lots', S.lots, false); paintLots('ownedLots', S.owned, true); quote();
      if ($('buyDialog').open && S.selected) paintBuyPrices(S.selected); sweep.paint();
    }
  }
  async function refreshHolders() {
    if (deployMode || S.holdersRefreshing || !S.config?.contractAddress) return;
    S.holdersRefreshing = true;
    try {
      const response = await fetch('/index-api/functions/v1/zecblocks-rh20-holders', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Holder count unavailable');
      const data = await response.json();
      if (data.chainId !== 4663 || data.ticker !== 'RHSC' || !same(data.coreAddress, CORE) || ![data.marketplaceAddress, ...(data.marketplaceAddresses || [])].some(address => same(address, S.config.contractAddress)) || !['ready', 'indexing', 'delayed'].includes(data.status)) throw new Error('Invalid holder snapshot');
      if (data.holders === null) { $('holderHint').textContent = 'Syncing on-chain data'; return; }
      if (!Number.isSafeInteger(data.holders) || data.holders < 0 || data.holders > 21000000 || !Number.isSafeInteger(data.blockNumber) || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid holder count');
      $('holderCount').textContent = count(data.holders);
      const current = data.status === 'ready' && Date.now() - Date.parse(data.updatedAt) < 90000;
      $('holderHint').textContent = current ? 'Includes listed RHSC' : 'Update delayed';
      $('holderCount').title = 'Unique RHSC owners, including listed balances. Indexed through block ' + data.blockNumber + '. Refreshes every 20 seconds.';
    } catch (_) { $('holderHint').textContent = 'Update delayed'; }
    finally { S.holdersRefreshing = false; }
  }
  async function refresh() {
    if (!S.config) return;
    if (S.refreshing) { S.refreshAgain = true; return; }
    S.refreshing = true;
    const generation = S.generation, account = S.account, offset = S.offset, ownedOffset = S.ownedOffset;
    try {
      const provider = reader(), blockTag = Number(BigInt(await bounded(provider.send('eth_blockNumber', []))));
      await validate(provider, S.config.contractAddress, blockTag);
      const core = new E.Contract(CORE, S.coreArtifact.abi, provider), market = S.config.contractAddress ? new E.Contract(S.config.contractAddress, S.artifact.abi, provider) : null;
      const [balance, allowance, stats, board, owned, credit, sales, sellerBps] = await bounded(Promise.all([
        account ? core.balanceOf('RHSC', account, { blockTag }) : 0n,
        account && market ? core.allowance('RHSC', account, S.config.contractAddress, { blockTag }) : 0n,
        market ? market.stats('RHSC', { blockTag }) : [0n, 0n, 0n, 0n],
        market && !deployMode ? sortedBoard(market, offset, blockTag) : [[], 0n],
        market && account && !deployMode ? market.getListings('RHSC', account, ownedOffset, 12, { blockTag }) : [[], 0n],
        market && account ? market.claimable(account, { blockTag }) : 0n,
        market && !deployMode ? market.recentSales('RHSC', 0, 12, { blockTag }) : [[], 0n],
        holderMode() ? market && account ? market.sellerFeeBps(account, { blockTag }) : null : 300n
      ]));
      if (generation !== S.generation || account !== S.account || offset !== S.offset || ownedOffset !== S.ownedOffset) return;
      Object.assign(S, { sellerBps, balance, allowance, credit, verified: true, lots: board[0], total: board[1], owned: owned[0], ownedTotal: owned[1] });
      if (!deployMode) {
        if ($('sellerBenefit')) $('sellerBenefit').textContent = holderMode() ? !account ? 'Connect your wallet to check the seller fee. Hold at least 1 Robinhood Ordinal for 0% at settlement.' : sellerBps === 0n ? 'Robinhood Ordinal holder · Your current seller fee is 0%. Keep an NFT in this wallet until the sale settles.' : 'Your current seller fee is 3%. Sellers holding at least 1 Robinhood Ordinal at settlement pay 0%.' : previousMode() ? 'Previous marketplace · All sales retain the original 3% fee. Cancel old listings and relist in the current marketplace for holder benefits.' : 'Seller protocol fee: 3%. Network gas is separate.';
        quote();
        $('activeCount').textContent = count(stats[0]); $('listedAmount').textContent = count(stats[1]) + ' RHSC'; $('salesCount').textContent = count(stats[2]); $('volume').textContent = eth(stats[3]) + ' ETH';
        paintLots('lots', S.lots, false); paintLots('ownedLots', S.owned, true);
        $('sales').replaceChildren();
        if (!sales[0].length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Confirmed sales will appear here.'; $('sales').append(p); }
        for (const sale of sales[0]) { const row = document.createElement('div'); row.className = 'sale'; for (const text of ['Lot #' + sale.listingId, count(sale.amount) + ' RHSC', eth(sale.price) + ' ETH', new Date(Number(sale.timestamp) * 1000).toLocaleString('en-US')]) { const span = document.createElement('span'); span.textContent = text; row.append(span); } $('sales').append(row); }
        $('updated').textContent = S.boardError || 'Lowest price per RHSC · Indexed through block ' + count(S.boardBlock || blockTag);
      }
    } catch (e) { if (generation === S.generation) { S.verified = false; status(message(e), 'error'); } }
    finally { S.refreshing = false; render(); void refreshHolders(); void refreshReference(); if (S.refreshAgain) { S.refreshAgain = false; void refresh(); } }
  }
  async function updateAccount() {
    if (!S.wallet) return;
    const generation = ++S.generation;
    S.verified = false; S.account = null; S.pending = null; S.completed = null; S.balance = 0n; S.allowance = 0n; S.credit = 0n; S.sellerBps = null;
    if (!deployMode) { S.owned = []; paintLots('ownedLots', [], true); $('buyDialog').close(); sweep.reset(); $('sweepDialog').close(); }
    render();
    const [accounts, chain] = await Promise.all([S.wallet.request({ method: 'eth_accounts' }), S.wallet.request({ method: 'eth_chainId' })]);
    if (generation !== S.generation) return;
    S.account = accounts[0] ? E.getAddress(accounts[0]) : null; S.chain = Number(BigInt(chain)); S.ownedOffset = 0;
    S.provider = new E.BrowserProvider(S.wallet, 'any'); load(); render(); await refresh();
  }
  const walletChanged = guard(updateAccount);
  async function connect() {
    legacyWallets(); const selected = S.wallets[Number($('walletSelect').value || 0)];
    if (!selected) throw new Error('Open this page with MetaMask, Rabby, or another EVM browser wallet.');
    if (S.wallet?.removeListener) { S.wallet.removeListener('accountsChanged', walletChanged); S.wallet.removeListener('chainChanged', walletChanged); }
    S.wallet = selected.provider; S.wallet.on?.('accountsChanged', walletChanged); S.wallet.on?.('chainChanged', walletChanged);
    await S.wallet.request({ method: 'eth_requestAccounts' }); await updateAccount();
  }
  async function ensureChain() {
    if (!S.account) await connect();
    if (BigInt(await S.wallet.request({ method: 'eth_chainId' })) !== 4663n) {
      try { await S.wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] }); }
      catch (e) { if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e; await S.wallet.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x1237', chainName: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [S.config.rpcUrl], blockExplorerUrls: [S.config.explorerUrl] }] }); await S.wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] }); }
    }
    await updateAccount(); if (!S.account || S.chain !== 4663) throw new Error('Select Robinhood Chain in your wallet.');
  }
  function parseAmount(required = true) { const value = $('amount')?.value.trim() || ''; if (!/^[1-9][0-9]{0,7}$/.test(value) || BigInt(value) > 21000000n) { if (required) throw new Error('Enter a whole RHSC amount from 1 to 21,000,000.'); return null; } return BigInt(value); }
  function parsePrice() { const text = $('price').value.trim(); if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/.test(text)) throw new Error('Enter a total ETH price with up to 18 decimal places.'); const price = E.parseEther(text); if (price < 100n || price > E.MaxUint256) throw new Error('The total price must be at least 0.0000000000000001 ETH.'); return price; }
  function quote() {
    render();
    try {
      const price = parsePrice(), amount = parseAmount(false), bps = holderMode() ? S.sellerBps : 300n;
      if (bps == null) $('sellQuote').textContent = 'Connect your wallet to check the fee. Holder sellers pay 0%; other sellers pay 3%. Ownership is checked again at settlement.';
      else { const fee = bps === 0n ? 0n : feeFor(price); $('sellQuote').textContent = 'You receive ' + eth(price - fee) + ' ETH · fee ' + eth(fee) + ' ETH (' + bps / 100n + '%)' + (holderMode() ? ' · Based on current NFT ownership; checked again at sale.' : ''); }
      $('sellUnit').textContent = amount ? '≈ ' + unitEth({price,amount}) + ' ETH / RHSC · ' + usdQuote({price,amount},true) + ' · ' + usdQuote({price,amount}) : '';
    } catch (_) { $('sellUnit').textContent = ''; $('sellQuote').textContent = holderMode() ? 'Holder seller: 0%. Other seller: 3%. NFT ownership is checked at settlement. Network gas is separate.' : '3% is deducted from the sale price. Network gas is separate.'; }
  }
  function paintBuyPrices(lot) { $('buyPrice').textContent = eth(lot.price) + ' ETH'; $('buyUnit').textContent = '≈ ' + unitEth(lot) + ' ETH / RHSC · ' + usdQuote(lot, true); $('buyUsd').textContent = usdQuote(lot); }
  async function reviewBuy(lot) {
    const selected = { id: lot.id.toString(), amount: lot.amount.toString(), price: lot.price.toString() };
    S.selected = selected; $('buyAmount').textContent = count(lot.amount) + ' RHSC'; paintBuyPrices(lot);
    $('buyFee').textContent = holderMode() ? 'Checking seller fee…' : eth(feeFor(lot.price)) + ' ETH'; $('buyDialog').showModal();
    if (holderMode()) try {
      const market = new E.Contract(S.config.contractAddress, S.artifact.abi, reader());
      const fee = await bounded(market.feeForSeller(lot.seller, lot.price));
      if (S.selected === selected) $('buyFee').textContent = eth(fee) + ' ETH · seller eligibility checked at settlement';
    } catch (_) { if (S.selected === selected) $('buyFee').textContent = '0–3% · determined by seller NFT ownership at settlement'; }
  }
  async function identity(account, generation) { const [accounts, chain] = await Promise.all([S.wallet.request({ method: 'eth_accounts' }), S.wallet.request({ method: 'eth_chainId' })]); if (generation !== S.generation || !same(accounts[0], account) || BigInt(chain) !== 4663n) throw new Error('Wallet or network changed. Review the action again.'); }
  async function submit(kind, args = {}) {
    if (S.busy || !S.config) return;
    S.busy = true; render();
    let intent = null, walletRequested = false;
    try {
      if (!['deploy', 'deployHolder'].includes(kind) && !S.config.contractAddress) throw new Error('The marketplace settlement contract has not been published yet.');
      if (['deploy', 'deployHolder'].includes(kind) && S.config.contractAddress) throw new Error('The official marketplace is already deployed.');
      if (kind === 'deploySweep' && S.sweepConfig?.contractAddress) throw new Error('The official Sweep helper is already deployed.');
      await ensureChain();
      const account = S.account, generation = S.generation, provider = S.provider;
      const run = async () => {
        load(); if (S.pending || (['deploy', 'deployHolder', 'deploySweep'].includes(kind) && S.completed?.kind === kind && S.completed?.contractAddress)) throw new Error('Recover the saved transaction before continuing.');
        await validate(provider);
        const core = new E.Contract(CORE, S.coreArtifact.abi, provider), market = S.config.contractAddress ? new E.Contract(S.config.contractAddress, S.artifact.abi, provider) : null;
        let to = S.config.contractAddress, data, value = 0n;
        if (['deploy', 'deployHolder'].includes(kind)) { to = null; data = S.artifact.bytecode; }
        if (kind === 'deploySweep') { if (!S.sweepArtifact) throw Error('Sweep configuration unavailable.'); to = null; data = S.sweepArtifact.bytecode; }
        if (kind === 'sweep') ({ to, data, value } = await sweep.prepare(args, provider, account, generation));
        if (kind === 'approve' || kind === 'list') {
          if (previousMode()) throw Error('Create new listings in the current marketplace. Previous listings can still be cancelled here.');
          args.marketAddress = S.config.contractAddress;
          const amount = BigInt(args.amount), price = BigInt(args.price);
          const [balance, allowance] = await Promise.all([core.balanceOf('RHSC', account), core.allowance('RHSC', account, to)]);
          if (balance < amount) throw new Error('Your available RHSC balance is too low.');
          if (kind === 'approve') { to = CORE; data = S.coreInterface.encodeFunctionData('approve', ['RHSC', S.config.contractAddress, amount]); }
          else { if (allowance < amount) throw new Error('Approve this RHSC amount before creating the listing.'); args.requestId = E.hexlify(crypto.getRandomValues(new Uint8Array(32))); data = S.iface.encodeFunctionData('createListing', ['RHSC', amount, price, args.requestId]); }
        }
        if (kind === 'buy' || kind === 'cancel') {
          const lot = await market.listings(args.id);
          if (lot.state !== 1n || lot.tick !== 'RHSC') throw new Error('This RHSC listing is no longer available.');
          if (kind === 'buy') { if (same(lot.seller, account)) throw new Error('You cannot buy your own listing.'); if (lot.amount !== BigInt(args.amount) || lot.price !== BigInt(args.price)) throw new Error('Listing details changed. Review the market again.'); value = lot.price; }
          else if (!same(lot.seller, account)) throw new Error('Only the seller can cancel this listing.');
          data = S.iface.encodeFunctionData(kind === 'buy' ? 'buy' : 'cancelListing', [args.id]);
        }
        if (kind === 'withdraw') { if (await market.claimable(account) === 0n) throw new Error('No deferred ETH is available.'); data = S.iface.encodeFunctionData('withdraw', [account]); }
        const tx = { from: account, ...(to ? { to } : {}), data, value: E.toQuantity(value) };
        const gas = BigInt(await bounded(S.wallet.request({ method: 'eth_estimateGas', params: [tx] })));
        const [latest, pending] = await Promise.all(['latest', 'pending'].map(tag => S.wallet.request({ method: 'eth_getTransactionCount', params: [account, tag] })));
        if (BigInt(latest) !== BigInt(pending)) throw new Error('Confirm or resolve the pending transaction in your wallet before starting another.');
        await identity(account, generation);
        intent = { kind, account, chainId: 4663, to, data, value: value.toString(), nonce: Number(BigInt(pending)), args, createdAt: new Date().toISOString() };
        save(intent); render();
        walletRequested = true;
        const hash = await S.wallet.request({ method: 'eth_sendTransaction', params: [{ ...tx, chainId: '0x1237', nonce: E.toQuantity(intent.nonce), gas: E.toQuantity(gas * 120n / 100n) }] });
        if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('Wallet response did not include a transaction hash. Recover from wallet activity.');
        intent = { ...intent, hash }; save(intent);
        if (same(S.account, account) && S.chain === 4663) { status('Transaction submitted. Waiting for confirmation.'); await checkPending(undefined, true); }
      };
      if (!navigator.locks?.request) throw new Error('This browser cannot safely lock wallet actions across tabs. Use a current Chrome, Edge, Firefox, or Safari browser.');
      await navigator.locks.request(key(account), { ifAvailable: true }, async lock => { if (!lock) throw new Error('A wallet action is already open in another tab.'); await run(); });
    } catch (e) {
      // Only explicit rejection before a known hash is safe to discard. A timeout,
      // disconnect, RPC error or missing hash may follow a successful broadcast.
      if (intent && !intent.hash && (!walletRequested || e?.code === 4001 || e?.code === 'ACTION_REJECTED')) clear(intent);
      status(message(e) + (intent && S.pending ? ' Your transaction record is retained.' : ''), 'error');
    } finally { S.busy = false; if (!deployMode) { $('buyDialog').close(); $('sweepDialog').close(); sweep.reset(); } render(); await refresh(); }
  }
  async function canonicalReceipt(provider, receipt) {
    const block = await bounded(provider.send('eth_getBlockByNumber', [E.toQuantity(receipt.blockNumber), false]));
    if (!block || !same(block.hash, receipt.blockHash)) throw Error('Confirmation is not on the current chain. The recovery record is retained.');
  }
  function matches(tx, record) { return tx && same(tx.from, record.account) && (record.to === null ? tx.to === null : same(tx.to, record.to)) && (tx.data || tx.input).toLowerCase() === record.data.toLowerCase() && BigInt(tx.value) === BigInt(record.value) && Number(tx.nonce) === record.nonce && (tx.chainId == null || BigInt(tx.chainId) === 4663n); }
  async function checkPending(override, locked = false) {
    if (!S.pending || S.checking || S.chain !== 4663) return;
    if (!locked) {
      const account = S.account;
      return navigator.locks.request(key(account), { ifAvailable: true }, async lock => {
        if (!lock || !same(account, S.account)) return;
        load();
        return checkPending(override, true);
      });
    }
    const record = S.pending, generation = S.generation, provider = S.provider, hash = typeof override === 'string' ? override.trim() : record.hash;
    if (!/^0x[0-9a-f]{64}$/i.test(hash || '')) throw new Error('Paste the full transaction hash from your wallet activity.');
    S.checking = true;
    try {
      const tx = await bounded(provider.getTransaction(hash));
      if (!tx) { status('Transaction not visible yet. The recovery record is retained.'); return; }
      if (!matches(tx, record)) {
        // A mined replacement with the same sender and nonce conclusively consumes
        // this attempt. Merely finding another pending transaction is not enough.
        if (!same(tx.from, record.account) || Number(tx.nonce) !== record.nonce || (tx.chainId != null && BigInt(tx.chainId) !== 4663n)) throw new Error('This transaction does not match the saved wallet and nonce.');
        const replacement = await bounded(provider.getTransactionReceipt(hash));
        if (!replacement) throw new Error('Replacement transaction is not confirmed yet. The recovery record is retained.');
        await canonicalReceipt(provider, replacement);
        clear(record);
        if (generation === S.generation) status('A different transaction consumed the saved nonce. The previous attempt is resolved. Review current balances and listings before taking another action.');
        await refresh(); return;
      }
      const updated = { ...record, hash }; save(updated);
      const receipt = await bounded(provider.getTransactionReceipt(hash)); if (!receipt) { status('Waiting for confirmation.'); return; }
      await canonicalReceipt(provider, receipt);
      if (receipt.status !== 1) { clear(record); if (generation === S.generation) status('Transaction reverted. Network gas may have been charged.', 'error'); return; }
      if (['deploy', 'deployHolder', 'deploySweep'].includes(record.kind)) {
        if (!receipt.contractAddress) throw new Error('Deployment receipt has no contract address.');
        if (record.kind === 'deploySweep') {
          await validate(provider, S.legacyConfig.contractAddress, receipt.blockNumber, S.legacyArtifact);
          await sweep.validate(provider, receipt.contractAddress, receipt.blockNumber);
        } else await validate(provider, receipt.contractAddress, receipt.blockNumber, artifactForRecord(record));
        const completed = { ...updated, completed: true, contractAddress: receipt.contractAddress, deploymentBlock: receipt.blockNumber }; save(completed);
        if (same(S.account, record.account)) { S.pending = null; S.completed = completed; receiptView(completed); }
      } else if (record.kind === 'sweep') {
        await sweep.validate(provider, record.to, receipt.blockNumber);
        if (!sweep.verifiedEvent(receipt, record)) throw Error('Expected Sweep settlement event is missing. The recovery record is retained.');
        clear(record);
      } else {
        const iface = record.kind === 'approve' ? S.coreInterface : new E.Interface(artifactForRecord(record).abi);
        const events = receipt.logs.filter(log => same(log.address, record.to)).map(log => { try { return iface.parseLog(log); } catch (_) { return null; } }).filter(Boolean);
        const a = record.args;
        const found = events.some(log => record.kind === 'approve' ? log.name === 'Approval' && log.args.tokenId === E.id('RHSC') && same(log.args.account, record.account) && same(log.args.spender, S.coreInterface.decodeFunctionData('approve', record.data)[1]) && log.args.amount === BigInt(a.amount) : record.kind === 'list' ? log.name === 'Listed' && same(log.args.seller, record.account) && log.args.requestId === a.requestId && log.args.amount === BigInt(a.amount) && log.args.price === BigInt(a.price) : record.kind === 'buy' ? log.name === 'Bought' && log.args.id === BigInt(a.id) && same(log.args.buyer, record.account) && log.args.amount === BigInt(a.amount) && log.args.price === BigInt(a.price) : record.kind === 'cancel' ? log.name === 'Cancelled' && log.args.id === BigInt(a.id) && same(log.args.seller, record.account) : log.name === 'Withdrawn' && same(log.args.account, record.account));
        if (!found) throw new Error('Expected settlement event is missing. Your recovery record is retained.');
        clear(record);
      }
      if (generation === S.generation) { status(record.kind === 'deploySweep' ? 'Sweep helper deployed. Copy its address and transaction hash below for activation.' : record.kind === 'sweep' ? 'Sweep confirmed. All selected RHSC lots received in your wallet.' : ['deploy', 'deployHolder'].includes(record.kind) ? 'Deployment confirmed. Copy the address and transaction hash below to publish this marketplace.' : record.kind === 'approve' ? 'Approval confirmed. You can now create the listing.' : record.kind === 'list' ? 'Listing confirmed. Your RHSC lot is available to buy.' : record.kind === 'buy' ? 'Purchase confirmed. RHSC received in your wallet.' : record.kind === 'cancel' ? 'Listing cancelled. RHSC returned to your wallet.' : 'ETH withdrawal confirmed.', 'success'); }
      await refresh();
    } finally { S.checking = false; render(); }
  }
  $('connect').onclick = guard(connect);
  $('checkPending').onclick = guard(() => checkPending()); $('recover').onclick = guard(() => checkPending($('recoveryHash').value));
  $('refresh').onclick = guard(refresh);
  window.addEventListener('storage', e => { if (S.account && e.key === key()) { try { load(); render(); void refresh(); } catch (error) { S.verified = false; status(message(error), 'error'); render(); } } });
  if (deployMode) $('deploy').onclick = guard(() => submit(deploymentKind));
  else {
    $('sellForm').onsubmit = guard(async e => { e.preventDefault(); const amount = parseAmount(), price = parsePrice(); await submit(S.account && S.allowance >= amount ? 'list' : 'approve', { amount: amount.toString(), price: price.toString() }); });
    // Prevent native navigation synchronously, before the guarded async handler.
    const sellHandler = $('sellForm').onsubmit; $('sellForm').onsubmit = e => { e.preventDefault(); sellHandler(e); };
    $('amount').oninput = quote; $('price').oninput = quote;
    $('confirmBuy').onclick = guard(() => submit('buy', { ...S.selected })); $('closeDialog').onclick = () => $('buyDialog').close();
    $('withdraw').onclick = guard(() => submit('withdraw'));
    $('prev').onclick = () => { S.offset = Math.max(0, S.offset - 12); S.verified = false; render(); void refresh(); };
    $('next').onclick = () => { S.offset += 12; S.verified = false; render(); void refresh(); };
    $('ownedPrev').onclick = () => { S.ownedOffset = Math.max(0, S.ownedOffset - 12); void refresh(); };
    $('ownedNext').onclick = () => { S.ownedOffset += 12; void refresh(); };
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; document.querySelectorAll('[data-tab]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-selected', String(x === b)); }); document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== S.tab; }); });
  }
  function configureMarketView() {
    if (!S.holderConfig.contractAddress) return;
    $('marketTransition').hidden = false;
    $('marketViewLabel').textContent = holderMode() ? 'Current marketplace · Holder seller fee: 0%' : 'Previous marketplace · Seller fee: 3%';
    $('marketViewHint').textContent = holderMode() ? 'Old listings stay in the previous marketplace. Cancel there, then approve and relist here to use holder benefits.' : 'Manage, cancel or buy earlier listings here. New listings belong in the current marketplace.';
    if (holderMode()) {
      $('feeRate').textContent = '0% / 3%'; $('feeHint').textContent = 'Holder sellers / other sellers';
      $('buyFeeHint').textContent = 'Total payment · seller fee included (0% or 3%)';
      $('sweepFeeHint').textContent = 'Seller fees are 0% for Robinhood Ordinal holders and 3% otherwise, checked at settlement. No additional Sweep fee. Network gas is separate.';
      $('footerFee').textContent = 'Settlement in ETH on Robinhood Chain. Seller protocol fee: 0% when holding at least 1 Robinhood Ordinal at settlement; otherwise 3%. Gas and NFT mint fees are separate. Buyer pays the listed price.';
    } else {
      const tab = document.querySelector('[data-tab="sell"]'); if (tab) tab.hidden = true;
      $('sellAction').disabled = true;
    }
  }
  async function init() {
    const read = async url => { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error('Market configuration could not be loaded.'); return response.json(); };
    [S.legacyConfig, S.legacyArtifact, S.coreArtifact, S.holderConfig, S.holderArtifact, S.nftArtifact] = await Promise.all(['/rh20/mainnet.json', '/rh20/RH20Marketplace.json', '/rh20/RH20.json', '/rh20/holder-market.json', '/rh20/RH20HolderMarketplace.json', '/rh20/RobinhoodOrdinal.json'].map(read));
    if (S.holderConfig.chainId !== 4663 || !same(S.holderConfig.coreAddress, CORE) || !same(S.holderConfig.treasury, TREASURY) || !same(S.holderConfig.collectionAddress, '0x6e049af563A804Ef834b4f6d1c8958a488571b21') || S.holderConfig.feeBps !== 300 || S.holderConfig.holderFeeBps !== 0 || S.holderConfig.maxLots !== 20) throw Error('Unexpected holder marketplace settings.');
    if (S.holderConfig.contractAddress && (!E.isAddress(S.holderConfig.contractAddress) || !/^0x[0-9a-f]{64}$/i.test(S.holderConfig.deploymentTxHash || '') || !Number.isSafeInteger(S.holderConfig.deploymentBlock))) throw Error('Incomplete holder marketplace deployment receipt.');
    const useHolder = holderDeployMode || (!deployMode && S.holderConfig.contractAddress && new URLSearchParams(location.search).get('market') !== 'previous');
    S.config = useHolder ? S.holderConfig : S.legacyConfig; S.artifact = useHolder ? S.holderArtifact : S.legacyArtifact;
    if (S.config.chainId !== 4663 || !same(S.config.coreAddress, CORE) || !same(S.config.treasury, TREASURY) || S.config.feeBps !== 300 || S.config.rpcUrl !== 'https://rpc.mainnet.chain.robinhood.com' || S.config.explorerUrl !== 'https://robin.etherscan.io') throw new Error('Unexpected marketplace settings.');
    if (S.config.contractAddress && (!E.isAddress(S.config.contractAddress) || !/^0x[0-9a-f]{64}$/i.test(S.config.deploymentTxHash || '') || !Number.isSafeInteger(S.config.deploymentBlock))) throw new Error('Incomplete marketplace deployment receipt.');
    try { await sweep.init(read); } catch (e) { S.sweepInterface = null; S.sweepArtifact = null; if (sweepDeployMode) throw e; if (!deployMode) $('sweepMessage').textContent = message(e); }
    S.iface = new E.Interface(S.artifact.abi); S.coreInterface = new E.Interface(S.coreArtifact.abi);
    S.publicReader = new E.JsonRpcProvider(location.origin + '/api/rh20', 4663, { staticNetwork: true, batchMaxCount: 1, cacheTimeout: -1 });
    if (S.config.contractAddress) { $('marketContract').textContent = short(S.config.contractAddress); $('marketContract').href = S.config.explorerUrl + '/address/' + S.config.contractAddress; }
    else $('marketContract').textContent = 'Settlement deployment pending';
    if (!deployMode) configureMarketView();
    status(holderDeployMode ? 'Deploy the holder-fee marketplace with built-in Sweep. Your wallet signs one deployment transaction.' : sweepDeployMode ? 'Deploy one Sweep helper for the existing RHSC marketplace. Review the fixed settings below.' : deployMode ? 'Deploy one settlement contract. RH-20 and RHSC are already deployed.' : S.config.contractAddress ? 'Connect your wallet to trade RHSC.' : 'The marketplace is ready for settlement deployment. Trading opens after the contract is published.');
    await refresh(); render();
    const poll = async () => { if (!document.hidden && !S.busy) { if (S.pending?.hash) await guard(() => checkPending())(); await refresh(); } S.timer = setTimeout(poll, 20000); };
    S.timer = setTimeout(poll, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  }
  guard(init)();
})();
