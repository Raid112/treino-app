#!/usr/bin/env node
// Smoke test no navegador: abre o app como o celular abre e reprova erro de JS, tela que não
// renderiza ou layout vazando na lateral. Gate do deploy (.github/workflows/release.yml).
//
//   node tests/smoke.browser.mjs                 # usa o Chromium do playwright
//   CHROME_PATH=/caminho/chrome node tests/...  # usa um Chrome instalado
//   SMOKE_SHOTS=dir node tests/...               # salva um print por tela
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.env.SMOKE_SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); }

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(repo, rel);
  if (!file.startsWith(repo)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const falhas = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
// Galaxy A-series / Pixel: o app é consumido como PWA no Android.
const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// Sem rede externa: Worker/jsonbin/Garmin ficam fora; o app tem que abrir offline.
await ctx.route(url => !url.href.startsWith(base), route => route.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const externo = /Failed to load resource|net::ERR_FAILED|Failed to fetch|NetworkError/i;
page.on('pageerror', e => falhas.push(`erro JS: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !externo.test(m.text())) falhas.push(`console.error: ${m.text()}`); });

async function checaTela(nome, rotulo = nome) {
  await page.waitForTimeout(400);
  const vis = await page.locator(`#${nome}.screen`).isVisible();
  if (!vis) falhas.push(`${rotulo}: tela não ficou visível`);
  const texto = (await page.locator(`#${nome}.screen`).innerText().catch(() => '')).trim();
  if (vis && texto.length < 10) falhas.push(`${rotulo}: tela renderizou vazia`);
  // Texto que o Caio não deveria ver: quebra de JS, plano sem número, minuto fracionado,
  // caminho de arquivo, semana ISO (ele conta S1-S6 do bloco).
  const proibidos = [
    [/\bundefined\b|\bNaN\b|\[object Object\]/, 'texto quebrado'],
    [/Sem meta individual|por refeição não definidos/i, 'refeição sem a meta aprovada'],
    [/\b\d+[.,]\d+ ?min\b/i, 'minuto fracionado'],
    [/\bloops\/|\.md\b|\.json\b/, 'caminho de arquivo na tela'],
    [/(^|[\s·(])W\d{1,2}\b/, 'semana ISO (Wnn) em vez de S1-S6'],
  ];
  for (const [re, motivo] of proibidos) {
    const m = texto.match(new RegExp(`.{0,30}(?:${re.source}).{0,30}`, re.flags));
    if (m) falhas.push(`${rotulo}: ${motivo} ("${m[0].replace(/\s+/g, ' ').trim()}")`);
  }
  const vaza = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.right > w + 1; })
      .slice(0, 3).map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')}`);
  });
  if (vaza.length) falhas.push(`${rotulo}: elemento vaza a lateral da tela (${vaza.join(', ')})`);
  if (shots) { await mkdir(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, `${rotulo}.png`), fullPage: true }); }
}

try {
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const modal = page.locator('#passphrase-modal');
  if (await modal.isVisible()) {
    await checaTela('home');  // o modal do Garmin é a 1ª tela de um aparelho novo
    await page.click('#btn-passphrase-cancel');
  }
  for (const tela of ['home', 'history', 'diet', 'settings', 'home']) {
    await page.click(`.tab-item[data-screen="${tela}"]`);
    await checaTela(tela);
  }
  // Cada semana do bloco e cada sessão dela: é onde mudança de review costuma quebrar.
  for (let semana = 1; semana <= 6; semana++) {
    const atual = Number(await page.locator('#current-week').innerText());
    if (atual !== semana) { falhas.push(`semana ${semana}: navegação parou na ${atual}`); break; }
    await checaTela('home', `S${semana}-home`);
    const dias = await page.locator('#session-picker .session-card').evaluateAll(cs => cs.map(c => c.dataset.day));
    if (!dias.length) falhas.push(`S${semana}: nenhuma sessão no seletor`);
    for (const dia of dias) {
      await page.click(`#session-picker .session-card[data-day="${dia}"]`);
      await checaTela('workout', `S${semana}-D${dia}`);
      await page.evaluate(() => { localStorage.removeItem('wu_in_progress'); localStorage.removeItem('wu_active_screen'); });
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(500);
      if (await modal.isVisible()) await page.click('#btn-passphrase-cancel');
      if (Number(await page.locator('#current-week').innerText()) !== semana) {
        falhas.push(`S${semana}-D${dia}: semana não persistiu após recarregar`); break;
      }
    }
    if (semana < 6) await page.click('#btn-next-week');
  }
} catch (e) {
  falhas.push(`fluxo quebrou: ${e.message.split('\n')[0]}`);
  if (shots) await page.screenshot({ path: path.join(shots, 'falha.png'), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  server.close();
}

const unicas = [...new Set(falhas)];
if (unicas.length) {
  console.error(`SMOKE FALHOU (${unicas.length}):\n- ` + unicas.join('\n- '));
  process.exit(1);
}
console.log('SMOKE OK: home, histórico, dieta, ajustes abrem sem erro de JS e sem vazar a tela');
