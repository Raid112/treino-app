import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyPages } from '../scripts/verify-pages.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, 'fixtures', 'pages');
const fixtureFiles = {
  '/': 'index.html',
  '/sw.js': 'sw.js',
  '/manifest.json': 'manifest.json',
  '/corrida-plan.json': 'corrida-plan.json'
};

async function startFixtureServer(overrideResponse = () => null, contentDir = fixtureDir) {
  const requests = [];
  const hitCounts = new Map();
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    requests.push(pathname);
    const hitCount = (hitCounts.get(pathname) ?? 0) + 1;
    hitCounts.set(pathname, hitCount);

    try {
      const override = await overrideResponse(pathname, hitCount);
      const fixtureName = fixtureFiles[pathname];
      const body = override?.body ?? (fixtureName ? await readFile(path.join(contentDir, fixtureName)) : 'not found');
      res.writeHead(override?.status ?? (fixtureName ? 200 : 404));
      res.end(body);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    requests,
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  };
}

async function withFixtureServer(overrideResponse, run, contentDir = fixtureDir) {
  const server = await startFixtureServer(overrideResponse, contentDir);
  try {
    await run(server);
  } finally {
    await server.close();
  }
}

test('accepts a published root and assets with byte-identical fixture contents', async () => {
  await withFixtureServer(undefined, async ({ url, requests }) => {
    const result = await verifyPages({ baseUrl: url, sourceDir: fixtureDir, attempts: 1, delayMs: 0 });
    assert.equal(result.attempts, 1);
    assert.deepEqual(result.checked, ['index.html', 'sw.js', 'manifest.json', 'corrida-plan.json']);
    assert.deepEqual([...requests].sort(), ['/corrida-plan.json', '/manifest.json', '/', '/sw.js'].sort());
  });
});

test('retries propagation until the served root matches the checked-out fixture', async () => {
  await withFixtureServer(async (pathname, hitCount) => {
    if (pathname === '/' && hitCount === 1) {
      return { status: 200, body: Buffer.from('stale publication') };
    }
    return null;
  }, async ({ url, requests }) => {
    const result = await verifyPages({ baseUrl: url, sourceDir: fixtureDir, attempts: 2, delayMs: 0 });
    assert.equal(result.attempts, 2);
    assert.equal(requests.filter(request => request === '/').length, 2);
  });
});

test('fails clearly when the public Pages root is not HTTP 200', async () => {
  await withFixtureServer(async pathname => pathname === '/' ? { status: 503, body: 'unavailable' } : null, async ({ url }) => {
    await assert.rejects(
      verifyPages({ baseUrl: url, sourceDir: fixtureDir, attempts: 2, delayMs: 0 }),
      error => {
        assert.match(error.message, /after 2 attempts/i);
        assert.match(error.message, /index\.html.*HTTP 503/i);
        return true;
      }
    );
  });
});

test('CLI verifies the actual repo files served locally', async () => {
  const repoDir = path.join(here, '..');
  await withFixtureServer(undefined, async ({ url }) => {
    const cliPath = path.join(repoDir, 'scripts', 'verify-pages.mjs');
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        cliPath,
        '--url', url,
        '--source-dir', repoDir,
        '--attempts', '1',
        '--delay-ms', '0'
      ], { cwd: repoDir });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
      child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
      child.once('error', reject);
      child.once('close', code => resolve({ code, stdout, stderr }));
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /PASS GitHub Pages at .*verified on attempt 1/);
    for (const name of ['index.html', 'sw.js', 'manifest.json', 'corrida-plan.json']) {
      assert.match(result.stdout, new RegExp(`${name}: HTTP 200 and byte-identical`));
    }
  }, repoDir);
});

test('rejects an asset whose response differs by even one byte', async () => {
  await withFixtureServer(async pathname => pathname === '/sw.js'
    ? { status: 200, body: Buffer.from("self.addEventListener('fetch', () => {});\n\n") }
    : null, async ({ url }) => {
    await assert.rejects(
      verifyPages({ baseUrl: url, sourceDir: fixtureDir, attempts: 1, delayMs: 0 }),
      error => {
        assert.match(error.message, /sw\.js.*bytes differ/i);
        return true;
      }
    );
  });
});

test('rejects a published running-plan JSON that differs from the checked-out source', async () => {
  await withFixtureServer(async pathname => pathname === '/corrida-plan.json'
    ? { status: 200, body: Buffer.from('{"status":"pronto"}') }
    : null, async ({ url }) => {
    await assert.rejects(
      verifyPages({ baseUrl: url, sourceDir: fixtureDir, attempts: 1, delayMs: 0 }),
      error => {
        assert.match(error.message, /corrida-plan\.json.*bytes differ/i);
        return true;
      }
    );
  });
});
