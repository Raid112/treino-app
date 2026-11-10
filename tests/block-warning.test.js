// Exercita o método real de renderização da home com DOM mínimo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/  updateHomeScreen\(\) \{([\s\S]*?)\n  \},\n\n  \/\/ Classifica o status/);
assert.ok(match, 'método updateHomeScreen encontrado');
let config;
const nodes = new Map();
const document = { getElementById(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', querySelectorAll: () => [] });
  return nodes.get(id);
} };
const Storage = { getConfig: () => config, getCompletedRunMinutes: () => 0 };
const WEEK_DATA = { 1: { block: 'B3', theme: 'Hipertrofia' }, 6: { block: 'B3', theme: 'Forca', deload: true } };
const BLOCO_DES694 = { id: 'B3-2026-11-09', corrida: { volumeTetoMin: 120 } };
const render = new Function('document', 'Storage', 'WEEK_DATA', 'BLOCO_DES694', 'getApplicableRunningPlan', 'refreshCurrentWeekRunningTargets', 'DAY_DEFS',
  `return ({ updateHomeScreen() {${match[1]}\n} });`)(document, Storage, WEEK_DATA, BLOCO_DES694, () => null, () => {}, []);
render.syncStatusInfo = () => ({ cls: 'ok', text: 'ok' });
const base = { oneRM: { squat: 150, bench: 110, deadlift: 200 }, currentWeek: 1 };
function summary(overrides) {
  config = { ...base, ...overrides };
  render.updateHomeScreen();
  return nodes.get('week-summary').innerHTML;
}
const target = { blocoMigratedFrom: 'B2-2026-09-28', blocoMigratedFromWeek: 6 };
let out = summary(target);
assert.match(out, /Semana 1 — B3/);
assert.doesNotMatch(out, /B2-2026-09-28|encerrado|novo bloco/);
out = summary({ ...target, weekMigratedFrom: 12 });
assert.match(out, /Semana 12 era do plano de 24 semanas/);
out = summary({ ...target, currentWeek: 6 });
assert.match(out, /Semana de deload/);
out = summary({ blocoMigratedFrom: 'B1-2026-09-07', blocoMigratedFromWeek: 3 });
assert.match(out, /Bloco B1-2026-09-07 encerrado/);
console.log('PASS aviso B2 → B3 oculto; demais avisos e semana preservados');
