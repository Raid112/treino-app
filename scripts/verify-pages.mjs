#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAGES_URL = 'https://raid112.github.io/treino-app/';
export const PAGES_ASSETS = ['index.html', 'sw.js', 'manifest.json', 'corrida-plan.json'];

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid Pages URL: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Pages URL must use HTTP or HTTPS: ${value}`);
  }
  if (url.search || url.hash) {
    throw new Error('Pages URL must not include a query string or fragment');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function byteMismatch(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let offset = 0;
  while (offset < limit && expected[offset] === actual[offset]) offset++;
  return `bytes differ (expected ${expected.length}, received ${actual.length}; first difference at offset ${offset})`;
}

/**
 * Check the public Pages root and compare its published app assets to local files.
 * All requests are retried as a group so a deploy can finish propagating between
 * attempts without accepting a mixed/partially published version.
 */
export async function verifyPages({
  baseUrl = PAGES_URL,
  sourceDir = process.cwd(),
  attempts = 1,
  delayMs = 1000,
  fetchImpl = globalThis.fetch,
  sleepImpl = sleep
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(`attempts must be a positive integer; received ${attempts}`);
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error(`delayMs must be a non-negative number; received ${delayMs}`);
  }
  if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime does not provide fetch');

  const targets = PAGES_ASSETS.map(name => ({
    name,
    url: name === 'index.html' ? base.href : new URL(name, base).href,
    expectedPath: path.join(sourceDir, name)
  }));
  const expected = new Map();
  for (const target of targets) {
    try {
      expected.set(target.name, await readFile(target.expectedPath));
    } catch (error) {
      throw new Error(`Cannot read local ${target.name} at ${target.expectedPath}: ${error.message}`, { cause: error });
    }
  }

  let lastFailures = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const failures = (await Promise.all(targets.map(async target => {
      try {
        const response = await fetchImpl(target.url, {
          redirect: 'follow',
          headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
          signal: AbortSignal.timeout(15_000)
        });
        if (response.status !== 200) {
          await response.body?.cancel();
          return `${target.name}: HTTP ${response.status} (expected 200)`;
        }
        const actual = Buffer.from(await response.arrayBuffer());
        const wanted = expected.get(target.name);
        return wanted.equals(actual) ? null : `${target.name}: ${byteMismatch(wanted, actual)}`;
      } catch (error) {
        return `${target.name}: request failed (${error.message})`;
      }
    }))).filter(Boolean);

    if (failures.length === 0) {
      return { baseUrl: base.href, attempts: attempt, checked: PAGES_ASSETS.slice() };
    }
    lastFailures = failures;
    if (attempt < attempts && delayMs > 0) await sleepImpl(delayMs);
  }

  throw new Error([
    `GitHub Pages verification failed after ${attempts} attempt${attempts === 1 ? '' : 's'} at ${base.href}:`,
    ...lastFailures.map(failure => `- ${failure}`)
  ].join('\n'));
}

function readPositiveInteger(value, option) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${option} must be a positive integer`);
  return parsed;
}

function readNonNegativeNumber(value, option) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${option} must be a non-negative number`);
  return parsed;
}

export function parseArgs(args, env = process.env) {
  const options = {
    baseUrl: env.PAGES_URL || PAGES_URL,
    sourceDir: process.cwd(),
    attempts: readPositiveInteger(env.PAGES_VERIFY_ATTEMPTS || '1', 'PAGES_VERIFY_ATTEMPTS'),
    delayMs: readNonNegativeNumber(env.PAGES_VERIFY_DELAY_MS || '1000', 'PAGES_VERIFY_DELAY_MS')
  };
  const optionNames = new Map([
    ['--url', 'baseUrl'],
    ['--source-dir', 'sourceDir'],
    ['--attempts', 'attempts'],
    ['--delay-ms', 'delayMs']
  ]);
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    const name = optionNames.get(option);
    if (!name) throw new Error(`Unknown option: ${option}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${option}`);
    if (name === 'attempts') options.attempts = readPositiveInteger(value, option);
    else if (name === 'delayMs') options.delayMs = readNonNegativeNumber(value, option);
    else options[name] = value;
    index++;
  }
  return options;
}

async function main() {
  try {
    const result = await verifyPages(parseArgs(process.argv.slice(2)));
    console.log(`PASS GitHub Pages at ${result.baseUrl} (verified on attempt ${result.attempts})`);
    for (const name of result.checked) console.log(`  ${name}: HTTP 200 and byte-identical`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
