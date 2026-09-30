// The service worker adds the cross-origin isolation headers GitHub Pages can't send (the reader's several cores need them).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const on = {}, store = new Map(), key = k => String(k.url ?? k);
  const self = { registration: { scope: 'https://t.test/' }, location: { origin: 'https://t.test' }, addEventListener: (k, f) => { on[k] = f; }, skipWaiting() {}, clients: { claim() {} } };
  const caches = { open: async () => ({ match: async k => store.get(key(k))?.clone(), put: async (k, r) => { store.set(key(k), r); } }), has: async () => false, keys: async () => [], delete: async () => true };
  const fetch = async req => new Response('x', { status: 200, headers: { 'content-type': /\.m?js$/.test(key(req)) ? 'text/javascript' : 'text/html' } });
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), { self, caches, fetch, Response, Headers, URL, Map, Set, Promise, setTimeout, clearTimeout, console });
  return url => new Promise(resolve => on.fetch({ request: { method: 'GET', url, mode: url.endsWith('/') ? 'navigate' : 'cors', headers: new Headers() }, respondWith: p => resolve(Promise.resolve(p)) }));
}

test("every answer from Tally's own site is cross-origin isolated: the page, app files and the reader's files", async () => {
  const get = worker();
  for (const url of ['https://t.test/', 'https://t.test/js/ocr-worker.js', 'https://t.test/vendor/ort-wasm-simd-threaded.mjs', 'https://t.test/js/ocr-worker.js']) {   // the last one from the cache
    const res = await get(url);
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin', url);
    assert.equal(res.headers.get('cross-origin-embedder-policy'), 'credentialless', url);   // not require-corp: the feedback form's no-cors post must still work
    assert.equal(await res.text(), 'x');
  }
});
