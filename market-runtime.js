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
  const api = {singleFlight, requestJSON, writeVerified, journal, validSnapshot};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MarketRuntime = api;
})(typeof window === 'undefined' ? globalThis : window);
