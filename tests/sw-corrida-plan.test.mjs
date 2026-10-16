import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const planUrl = 'https://raid112.github.io/treino-app/corrida-plan.json';

function loadWorker(fetchImpl, seed = []) {
  const listeners = new Map();
  const cacheEntries = new Map(seed);
  let precacheAssets = [];
  const cache = {
    addAll: async assets => { precacheAssets = [...assets]; },
    put: async (request, response) => cacheEntries.set(request.url, response),
  };
  const caches = {
    open: async () => cache,
    match: async request => cacheEntries.get(typeof request === 'string' ? request : request.url),
    keys: async () => ['treino-v22', 'treino-v23'],
    delete: async () => true,
  };
  const self = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  vm.runInNewContext(source, { self, caches, URL, Request, Response, fetch: fetchImpl }, { filename: 'sw.js' });
  return { listeners, cacheEntries, precacheAssets: () => precacheAssets };
}

function dispatchFetch(worker, url = planUrl) {
  let responsePromise;
  worker.listeners.get('fetch')({
    request: new Request(url, { cache: 'no-store' }),
    respondWith: promise => { responsePromise = Promise.resolve(promise); },
  });
  assert.ok(responsePromise, 'fetch handler must call respondWith');
  return responsePromise;
}

test('precache includes corrida-plan.json for first-install offline behavior', async () => {
  const worker = loadWorker(async () => new Response('{}'));
  let waitPromise;
  worker.listeners.get('install')({ waitUntil: promise => { waitPromise = promise; } });
  await waitPromise;
  assert.ok(worker.precacheAssets().includes('./corrida-plan.json'));
});

test('network-first refresh returns and caches the latest approved-plan bytes', async () => {
  const worker = loadWorker(async request => {
    assert.equal(request.cache, 'no-store');
    return new Response('approved-v2', { status: 200 });
  });
  const response = await dispatchFetch(worker);
  assert.equal(await response.text(), 'approved-v2');
  assert.equal(await worker.cacheEntries.get(planUrl).text(), 'approved-v2');
});

test('offline request falls back to the cached plan', async () => {
  const worker = loadWorker(async () => { throw new Error('offline'); }, [
    [planUrl, new Response('cached-plan', { status: 200 })],
  ]);
  const response = await dispatchFetch(worker);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'cached-plan');
});

test('non-OK network response stays fail-closed instead of reviving cached approval', async () => {
  const worker = loadWorker(async () => new Response('upstream unavailable', { status: 503 }), [
    [planUrl, new Response('stale-approved-plan', { status: 200 })],
  ]);
  const response = await dispatchFetch(worker);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'upstream unavailable');
  assert.equal(await worker.cacheEntries.get(planUrl).text(), 'stale-approved-plan');
});
