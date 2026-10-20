import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(repo, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'index.html must contain its application script');
const cut = script.indexOf('// ========== CSV EXPORT ==========');
const dataLayer = script.slice(0, cut > 0 ? cut : script.length);
const store = new Map();
const sandbox = {
  localStorage: {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  }
};
new Function('globalThis', dataLayer + ';globalThis.__x = {' +
  'loadApprovedRunningPlan, setApprovedRunningPlan, validateRunningPlanPayload, getApplicableRunningPlan, ' +
  'isStrengthDeloadWeek: week => !!WEEK_DATA[Number(week)]?.deload, ' +
  'getApprovedRunningPlan: () => APPROVED_RUNNING_PLAN' +
'};')(sandbox);

const validPlan = {
  schema_version: 1, status: 'pronto', natureza: 'alvo_prescrito',
  approval: { state: 'approved', reference: 'synthetic-test-only', approved_at: '2026-10-12T12:00:00-03:00' },
  source: { review_run_id: 'synthetic-test-only', prep_sha256: 'a'.repeat(64) },
  semana_iso: '2026-W42', bloco_id: 'B2-2026-09-28', semana_bloco: 3, fase: 'base',
  faixa_volume_aprovada_min: [150, 160],
  sessoes: [
    { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 30, fc_cap: 150 },
    { dia_app: 'D2', papel: 'terra', zona: 'Z3', min: 40, fc_cap: 162 },
    { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 80, fc_cap: 150 }
  ],
  totais: { total_semanal_min: 150, total_z2_min: 110, total_z3_min: 40,
    total_intervalo_min: 0, agachamento_z2_min: 30, terra_z2_min: 0, long_run_z2_min: 80 },
  regra_long_run: 'total_z2_min - agachamento_z2_min - terra_z2_min',
  long_minimo_min: 30, long_minimo_excecao: null,
  excecao_deload: { aplica: false }
};

// In-memory synthetic fixture only: it is never written as corrida-plan.json or
// used to assert any real human approval in the source repository.
const week43BasePlan = {
  ...structuredClone(validPlan),
  semana_iso: '2026-W43', semana_bloco: 4, fase: 'base',
  faixa_volume_aprovada_min: [158.8, 166.1],
  sessoes: [
    { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 30, fc_cap: 150 },
    { dia_app: 'D2', papel: 'terra', zona: 'intervalado', min: 65.8, fc_cap: 162,
      segmentos: [
        { tipo: 'continuo', min: 15, zona: 'Z2', fc_cap: 150 },
        { tipo: 'intervalos', repeticoes: 4,
          forte: { min: 3, zona: 'intervalo', fc_cap: 162 },
          recuperacao: { min: 2, zona: 'Z2', fc_cap: 150 } },
        { tipo: 'continuo', min: 30.8, zona: 'Z2', fc_cap: 150 }
      ] },
    { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 63, fc_cap: 150 }
  ],
  totais: { total_semanal_min: 158.8, total_z2_min: 146.8, total_z3_min: 0,
    total_intervalo_min: 12, agachamento_z2_min: 30, terra_z2_min: 53.8, long_run_z2_min: 63 },
  regra_long_run: 'total_z2_min - agachamento_z2_min - terra_z2_min'
};

const { loadApprovedRunningPlan, setApprovedRunningPlan, validateRunningPlanPayload,
  getApplicableRunningPlan, isStrengthDeloadWeek, getApprovedRunningPlan } = sandbox.__x;

test('loads only a valid approved plan and stores it for the active consumer', async () => {
  const ok = await loadApprovedRunningPlan(async url => {
    assert.equal(url, './corrida-plan.json');
    return { ok: true, json: async () => structuredClone(validPlan) };
  });
  assert.equal(ok, true);
  assert.equal(getApprovedRunningPlan().semana_iso, '2026-W42');
});

test('W43 accepts a running base phase while the strength week is deload', () => {
  assert.equal(isStrengthDeloadWeek(4), true, 'W4 must remain deload for strength');
  assert.deepEqual(validateRunningPlanPayload(week43BasePlan), { ok: true, errors: [] });
  assert.equal(setApprovedRunningPlan(week43BasePlan), true);
  assert.equal(getApplicableRunningPlan(4, new Date(2026, 9, 21, 12))?.fase, 'base');
  assert.equal(getApplicableRunningPlan(4, new Date(2026, 9, 21, 12))?.semana_iso, '2026-W43');
  assert.equal(getApplicableRunningPlan(4, new Date(2026, 9, 21, 12))?.sessoes[1].segmentos.length, 3);
});

test('W43/base still enforces approval, approved volume range and zone heart-rate caps', () => {
  const missingApproval = structuredClone(week43BasePlan);
  missingApproval.approval.state = 'pending';
  assert.equal(setApprovedRunningPlan(missingApproval), false);

  const outsideRange = structuredClone(week43BasePlan);
  outsideRange.faixa_volume_aprovada_min = [160, 161];
  assert.equal(setApprovedRunningPlan(outsideRange), false);

  const wrongHeartRateCap = structuredClone(week43BasePlan);
  wrongHeartRateCap.sessoes[1].fc_cap = 150;
  assert.equal(setApprovedRunningPlan(wrongHeartRateCap), false);

  const wrongRecoveryZone = structuredClone(week43BasePlan);
  wrongRecoveryZone.sessoes[1].segmentos[1].recuperacao.zona = 'intervalo';
  assert.equal(setApprovedRunningPlan(wrongRecoveryZone), false);
});

test('unavailable or invalid fetch clears any previously cached in-memory approval', async () => {
  assert.equal(setApprovedRunningPlan(validPlan), true);
  assert.equal(await loadApprovedRunningPlan(async () => ({ ok: false, status: 503 })), false);
  assert.equal(getApprovedRunningPlan(), null);

  assert.equal(setApprovedRunningPlan(validPlan), true);
  assert.equal(await loadApprovedRunningPlan(async () => { throw new Error('offline'); }), false);
  assert.equal(getApprovedRunningPlan(), null);

  assert.equal(await loadApprovedRunningPlan(async () => ({ ok: true, json: async () => ({ status: 'pendente' }) })), false);
  assert.equal(getApprovedRunningPlan(), null);
});
