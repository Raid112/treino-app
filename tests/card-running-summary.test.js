// Cartão da home usa o renderizador real; a prescrição é simulada na fronteira runLabel.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/  updateHomeScreen\(\) \{([\s\S]*?)\n  \},\n\n  \/\/ Classifica o status/);
assert.ok(match);
const nodes = new Map();
const document = { getElementById(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', querySelectorAll: () => [] });
  return nodes.get(id);
} };
const Storage = { getConfig: () => ({ currentWeek: 1, oneRM: { squat: 150, bench: 110, deadlift: 200 } }), getCompletedRunMinutes: () => 0, isDayCompleted: () => false };
const WEEK_DATA = { 1: { block: 'B3', theme: 'Hipertrofia', p: { s: 4, r: 8, pct: 70 }, sec: { s: 3, r: 8, pct: 62.5 } } };
const DAY_DEFS = [
  { day: 1, type: 'combined', strength: { level: 'primary', lift: 'squat' } },
  { day: 2, type: 'running' },
  { day: 4, type: 'running' },
  { day: 6, type: 'accessories', name: 'Acessorios' }
];
const labels = { 1: '35min Z3 · FC ≤ 162', 2: '44min intervalado · FC ≤ 162', 4: '58min Z2 · FC ≤ 150' };
const render = new Function('document', 'Storage', 'WEEK_DATA', 'BLOCO_DES694', 'getApplicableRunningPlan', 'refreshCurrentWeekRunningTargets', 'DAY_DEFS', 'Workout', 'runLabel', 'dayDisplayName',
  `return ({ updateHomeScreen() {${match[1]}\n} });`)(document, Storage, WEEK_DATA, { corrida: { volumeTetoMin: 120 } }, () => null, () => {}, DAY_DEFS, { calcWeight: () => 105 }, dd => labels[dd.day], dd => `D${dd.day}`);
render.syncStatusInfo = () => ({ cls: 'ok', text: 'ok' });
render.updateHomeScreen();
const cards = nodes.get('session-picker').innerHTML;
assert.doesNotMatch(cards, /data-day="6"|7 exercicios/);
assert.match(cards, /data-day="1"/);
assert.match(cards, /data-day="2"/);
assert.match(cards, /data-day="4"/);
assert.equal(DAY_DEFS[3].type, 'accessories', 'definição histórica preservada');
assert.match(cards, /35min Z3<\/strong>/);
assert.match(cards, /44min intervalado<\/strong>/);
assert.doesNotMatch(cards, /FC ≤ 162/);
assert.match(cards, /58min Z2 · FC ≤ 150/);
assert.equal(labels[1], '35min Z3 · FC ≤ 162', 'prescrição original permanece intacta');
console.log('PASS FC 162 omitida somente nos cartões, zona e duração preservadas');
