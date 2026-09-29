/* RHSC Sweep uses the existing market wallet lock and recovery journal. */
window.createRH20Sweep = function ({ S, E, $, same, bounded, guard, submit, connect, reader, identity, count, eth, unitEth, usdQuote, feeFor, deployMode }) {
  let quote = null, revision = 0, loading = false, expiryTimer;
  const MAX_LOTS = 20;
  const selectionHash = ids => E.keccak256(E.AbiCoder.defaultAbiCoder().encode(['uint256[]'], [ids]));
  async function init(read) {
    [S.sweepConfig, S.sweepArtifact] = await Promise.all(['/rh20/sweep.json', '/rh20/RH20Sweep.json'].map(read));
    const c = S.sweepConfig;
    if (c.chainId !== 4663 || !same(c.coreAddress, S.config.coreAddress) || !same(c.marketplaceAddress, S.config.contractAddress) || c.maxLots !== MAX_LOTS) throw Error('Unexpected Sweep settings.');
    if (c.contractAddress && (!E.isAddress(c.contractAddress) || !/^0x[0-9a-f]{64}$/i.test(c.deploymentTxHash || '') || !Number.isSafeInteger(c.deploymentBlock))) throw Error('Incomplete Sweep deployment receipt.');
    S.sweepInterface = new E.Interface(S.sweepArtifact.abi);
    if (!deployMode) {
      $('openSweep').onclick = guard(open);
      $('closeSweep').onclick = () => { reset(); $('sweepDialog').close(); };
      $('sweepDialog').addEventListener('cancel', reset);
      $('sweepCount').onchange = () => { reset(); paint(); };
      document.querySelectorAll('[data-sweep-count]').forEach(button => button.onclick = guard(async () => { $('sweepCount').value = button.dataset.sweepCount; await preview(); }));
      $('previewSweep').onclick = guard(preview);
      $('confirmSweep').onclick = guard(async () => {
        if (!S.account) { await connect(); await open(); return; }
        if (!quote) throw Error('Refresh your Sweep selection first.');
        await submit('sweep', { ...quote, lots: quote.lots.map(lot => ({ ...lot })) });
      });
    }
  }
  function reset() { ++revision; loading = false; quote = null; clearTimeout(expiryTimer); }
  function paint() {
    if (deployMode || !$('openSweep')) return;
    $('openSweep').disabled = !S.verified || S.busy || !!S.pending || !S.sweepInterface;
    $('previewSweep').disabled = loading || S.busy || !!S.pending || !S.verified;
    $('sweepCount').disabled = loading || S.busy;
    document.querySelectorAll('[data-sweep-count]').forEach(b => { b.disabled = loading || S.busy || !!S.pending; });
    $('previewSweep').textContent = loading ? 'Finding lots…' : 'Refresh selection';
    $('confirmSweep').disabled = !quote || loading || S.busy || !!S.pending || !S.verified || !S.sweepConfig?.contractAddress;
    $('confirmSweep').textContent = S.busy ? 'Check your wallet…' : !S.sweepConfig?.contractAddress ? 'Sweep activation pending' : !S.account ? 'Connect wallet to continue' : quote ? 'Buy ' + quote.lots.length + ' lots in one transaction' : 'Review a selection first';
    if (!quote) { $('sweepSummary').hidden = true; $('sweepLots').replaceChildren(); }
    else {
      $('sweepSummary').hidden = false;
      $('sweepAmount').textContent = count(quote.amount) + ' RHSC';
      $('sweepPrice').textContent = eth(quote.price) + ' ETH';
      $('sweepUsd').textContent = usdQuote(quote);
      $('sweepUnit').textContent = 'Average ≈ ' + unitEth(quote) + ' ETH / RHSC · ' + usdQuote(quote, true);
      $('sweepFee').textContent = eth(quote.lots.reduce((sum, lot) => sum + feeFor(BigInt(lot.price)), 0n)) + ' ETH';
    }
  }
  async function open() {
    $('sweepDialog').showModal();
    await preview();
  }
  async function preview() {
    reset();
    const run = revision, account = S.account, generation = S.generation;
    const n = Number($('sweepCount').value);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LOTS) { paint(); throw Error('Choose 1 to 20 whole lots.'); }
    if (!S.verified || S.busy || S.pending) { paint(); return; }
    loading = true; paint(); $('sweepMessage').textContent = 'Reading the cheapest available lots…';
    const check = () => { if (run !== revision || generation !== S.generation || account !== S.account) throw Error('Wallet or selection changed. Refresh your selection.'); };
    try {
      const provider = reader(), head = Number(BigInt(await bounded(provider.send('eth_blockNumber', []))));
      const market = new E.Contract(S.config.contractAddress, S.artifact.abi, provider);
      let block = null, total = null, previous = null;
      const chosen = [], seen = new Set(), started = Date.now();
      // Bounded pages from the global index, never just the visible market page.
      for (let offset = 0; chosen.length < n && offset < 300; offset += 12) {
        check(); if (Date.now() - started > 30000) throw Error('Selection took too long. Refresh to try again.');
        const response = await fetch('/index-api/functions/v1/zecblocks-rh20-holders?view=market&offset=' + offset, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Error('Sorted listings unavailable. Refresh your selection.');
        const board = await response.json(), updated = Date.parse(board.updatedAt);
        if (board.chainId !== 4663 || board.ticker !== 'RHSC' || !same(board.marketplaceAddress, S.config.contractAddress) || board.sort !== 'unit-price-asc' || board.status !== 'ready' || board.offset !== offset || !Number.isSafeInteger(board.total) || board.total < 0 || !Number.isSafeInteger(board.blockNumber) || board.blockNumber < 1 || board.blockNumber > head || !Number.isFinite(updated) || updated > Date.now() + 30000 || Date.now() - updated > 90000 || !Array.isArray(board.ids) || board.ids.length !== Math.min(12, Math.max(0, board.total - offset)) || board.ids.some(id => !/^[1-9][0-9]{0,77}$/.test(id) || BigInt(id) > E.MaxUint256 || seen.has(id))) throw Error('Sorted listings are syncing. Refresh your selection.');
        if (block !== null && (block !== board.blockNumber || total !== board.total)) throw Error('Market updated during selection. Refresh to get one complete snapshot.');
        block = board.blockNumber; total = board.total;
        for (const id of board.ids) { if (seen.has(id)) throw Error('Duplicate listing in selection.'); seen.add(id); }
        const lots = await bounded(Promise.all(board.ids.map(id => market.listings(id, { blockTag: block }))));
        check();
        for (const lot of lots) {
          if (lot.state !== 1n || lot.tick !== 'RHSC' || lot.amount <= 0n) throw Error('Listing snapshot changed. Refresh your selection.');
          if (previous && (previous.price * lot.amount > lot.price * previous.amount || (previous.price * lot.amount === lot.price * previous.amount && previous.id >= lot.id))) throw Error('Listing order could not be verified. Refresh your selection.');
          previous = lot;
          if (!same(lot.seller, account) && chosen.length < n) chosen.push({ id: lot.id.toString(), amount: lot.amount.toString(), price: lot.price.toString() });
        }
        if (offset + 12 >= total) break;
      }
      check();
      if (chosen.length !== n) throw Error('Only ' + chosen.length + ' eligible lots found. Choose fewer lots and refresh. Your own listings are excluded.');
      quote = { account, lots: chosen, amount: chosen.reduce((s,l) => s + BigInt(l.amount), 0n).toString(), price: chosen.reduce((s,l) => s + BigInt(l.price), 0n).toString(), deadline: Math.floor(Date.now() / 1000) + 600 };
      $('sweepLots').replaceChildren();
      for (const lot of chosen) {
        const row = document.createElement('div'); row.className = 'sweep-lot';
        for (const text of ['Lot #' + lot.id, count(lot.amount) + ' RHSC', eth(lot.price) + ' ETH']) { const span = document.createElement('span'); span.textContent = text; row.append(span); }
        $('sweepLots').append(row);
      }
      $('sweepMessage').textContent = 'Lowest price per RHSC · Snapshot block ' + count(block) + (account ? ' · Your own listings excluded.' : ' · Connect your wallet to check your eligible selection.');
      expiryTimer = setTimeout(() => { reset(); paint(); $('sweepMessage').textContent = 'Selection expired. Refresh before buying.'; }, 600000);
    } catch (e) { if (run === revision) { quote = null; $('sweepMessage').textContent = String(e.message || e); } }
    finally { if (run === revision) { loading = false; paint(); } }
  }
  async function validate(provider, address = S.sweepConfig?.contractAddress, blockTag = 'latest') {
    if (!address || E.keccak256(await bounded(provider.getCode(address, blockTag))) !== S.sweepArtifact.runtimeCodeHash) throw Error('Sweep contract verification failed. Checkout is disabled.');
  }
  async function prepare(args, provider, account, generation) {
    if (!same(args.account, account)) throw Error('Wallet changed. Review the Sweep selection again.');
    if (!S.sweepConfig?.contractAddress) throw Error('Sweep activation is pending.');
    if (!Number.isSafeInteger(args.deadline) || args.deadline <= Math.floor(Date.now() / 1000)) throw Error('Selection expired. Refresh before buying.');
    if (!Array.isArray(args.lots) || !args.lots.length || args.lots.length > MAX_LOTS || new Set(args.lots.map(x => x.id)).size !== args.lots.length) throw Error('Invalid Sweep selection.');
    await validate(provider);
    const market = new E.Contract(S.config.contractAddress, S.artifact.abi, provider);
    const blockTag = Number(BigInt(await bounded(provider.send('eth_blockNumber', []))));
    const current = await bounded(Promise.all(args.lots.map(lot => market.listings(lot.id, { blockTag }))));
    for (let i = 0; i < current.length; i++) {
      const lot = current[i], expected = args.lots[i];
      if (lot.state !== 1n || lot.tick !== 'RHSC' || same(lot.seller, account) || lot.amount !== BigInt(expected.amount) || lot.price !== BigInt(expected.price)) throw Error('A selected lot is no longer available. Refresh the selection before buying.');
    }
    const amount = current.reduce((s,l) => s + l.amount, 0n), price = current.reduce((s,l) => s + l.price, 0n);
    if (amount !== BigInt(args.amount) || price !== BigInt(args.price)) throw Error('Sweep totals changed. Review again.');
    await identity(account, generation);
    args.requestId = E.hexlify(crypto.getRandomValues(new Uint8Array(32)));
    return { to: S.sweepConfig.contractAddress, value: price, data: S.sweepInterface.encodeFunctionData('sweep', [args.lots.map(l => l.id), amount, args.deadline, args.requestId]) };
  }
  function verifiedEvent(receipt, record) {
    const events = receipt.logs.filter(log => same(log.address, record.to)).map(log => { try { return S.sweepInterface.parseLog(log); } catch (_) { return null; } });
    const a = record.args;
    return events.some(log => log?.name === 'Swept' && same(log.args.buyer, record.account) && log.args.requestId === a.requestId && log.args.selectionHash === selectionHash(a.lots.map(l => l.id)) && log.args.lots === BigInt(a.lots.length) && log.args.amount === BigInt(a.amount) && log.args.price === BigInt(a.price));
  }
  return { init, reset, paint, prepare, validate, verifiedEvent };
};
