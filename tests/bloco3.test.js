// bloco3.test.js — bloco vigente (B3-2026-11-09) sobre o index.html real.
// Decisão do Caio em 09/11/2026: séries de 8 alternando com semanas de força,
// 2 exercícios por treino, sem superset, sem top set, sem teste 5K na S6.
//   node tests/bloco3.test.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cut = src.indexOf('// ========== APP (Part 1 - Core + Home) ==========');
const _ls = new Map();
globalThis.localStorage = {
  getItem: k => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: k => _ls.delete(k)
};
const sandbox = {};
new Function('globalThis', src.slice(0, cut > 0 ? cut : src.length) + ';globalThis.__x = {' +
  'BLOCO_DES694, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES, Workout, Storage, getDietWeekPlan, runLabel, ' +
  'validateRunningPlanPayload, setApprovedRunningPlan, runTargetLabel};')(sandbox);
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP, Workout, Storage, getDietWeekPlan, runLabel } = sandbox.__x;

let fail = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };

ok(B.id === 'B3-2026-11-09' && B.inicio === '2026-11-09' && B.validoAte === '2026-12-20' && B.semanas === 6,
   'bloco vigente = B3-2026-11-09, 6 semanas até 20/12');
ok(Object.keys(WEEK_DATA).length === 6, 'WEEK_DATA tem 6 semanas');

const esperado = {
  1: ['Hipertrofia', 4, 8, 70, 3, 8, 62.5], 2: ['Forca', 4, 5, 80, 3, 5, 72.5],
  3: ['Hipertrofia', 4, 8, 72.5, 3, 8, 65], 4: ['Forca', 3, 4, 85, 3, 5, 75],
  5: ['Hipertrofia', 3, 8, 75, 2, 8, 65],   6: ['Forca', 3, 3, 87.5, 2, 5, 72.5]
};
for (const [wk, [theme, ps, pr, pp, ss, sr, sp]] of Object.entries(esperado)) {
  const w = WEEK_DATA[wk];
  ok(w.theme === theme && w.p.s === ps && w.p.r === pr && w.p.pct === pp
     && w.sec.s === ss && w.sec.r === sr && w.sec.pct === sp,
     `S${wk} = ${theme} ${ps}×${pr} @${pp}% · secundário ${ss}×${sr} @${sp}%`);
  ok(!w.topSets && !w.forceLadder && !w.deload && !w.specialRun,
     `S${wk} sem top set, escadinha, deload ou teste 5K`);
  ok(!!EP[w.theme], `S${wk}: tema ${w.theme} existe em EXECUTION_PROFILES`);
}
ok(Object.values(WEEK_DATA).every(w => w.p.r > 1 && w.sec.r > 1), 'sem singles');

const cfg = { oneRM: { squat: 150, bench: 110, deadlift: 200 }, oneRMHistory: [], currentWeek: 1, cycleId: `${B.id}:test` };
let erros = 0, maxEx = 0;
for (let wk = 1; wk <= 6; wk++) for (let d = 1; d <= DAY_DEFS.length; d++) {
  try {
    const w = Workout.generateWorkout({ ...cfg, currentWeek: wk }, d, new Date(2026, 10, 9 + (wk - 1) * 7, 12));
    maxEx = Math.max(maxEx, w.exercises.length);
    for (const ex of w.exercises) {
      if (ex.actual.topSet) { console.error(`  top set em S${wk}D${d}`); erros++; }
      if (!(ex.planned.weight > 0) || ex.planned.weight % 2.5 !== 0) { console.error(`  carga inválida S${wk}D${d}`); erros++; }
    }
  } catch (e) { console.error(`  S${wk}D${d}: ${e.message}`); erros++; }
}
ok(erros === 0, 'generateWorkout roda em 36 combinações, sem top set e com carga em passos de 2,5 kg');
ok(maxEx === 2, 'no máximo 2 exercícios de barra por treino');

const s1d1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 1, new Date(2026, 10, 9, 12));
ok(s1d1.exercises[0].lift === 'squat' && s1d1.exercises[0].planned.sets === 4
   && s1d1.exercises[0].planned.reps === 8 && s1d1.exercises[0].planned.weight === 105,
   'S1 D1: agacho 4×8 @70% de 150 = 105 kg');
const s6d4 = Workout.generateWorkout({ ...cfg, currentWeek: 6 }, 4, new Date(2026, 11, 14, 12));
ok(s6d4.running && s6d4.running.target.zone !== '5K Teste', 'S6 D4 é Long Run normal (teste 5K suspenso)');

for (let wk = 1; wk <= 6; wk++) {
  const d = getDietWeekPlan(wk);
  ok(d.totalCalories === 1600 && d.version === 'v9e', `dieta S${wk} = 1.600 kcal (v9e)`);
}

// Plano de corrida publicado (corrida-plan.json) vale no app real e chega nos treinos.
{
  const { validateRunningPlanPayload, setApprovedRunningPlan, runTargetLabel } = sandbox.__x;
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'corrida-plan.json'), 'utf8'));
  const res = validateRunningPlanPayload(plan);
  ok(res.ok, 'corrida-plan.json publicado é válido ' + JSON.stringify(res.errors));
  ok(plan.bloco_id === B.id, 'corrida-plan.json é do bloco vigente');
  if (plan.semana_iso === '2026-W46') {
    ok(setApprovedRunningPlan(plan), 'plano W46 aceito pelo consumidor');
    const dia = new Date(2026, 10, 10, 12);
    const t = d => Workout.generateWorkout({ ...cfg, currentWeek: 1 }, d, dia).running.target;
    ok(t(1).min === 35 && t(1).zone === 'Z3' && t(1).fcCap === 162, 'W46 D1 = 35 min Z3 contínuo, FC ≤ 162 ' + JSON.stringify(t(1)));
    ok(t(2).min === 44 && t(2).fcCap === 162, 'W46 D2 = intervalado 44 min ' + JSON.stringify(t(2)));
    ok(t(4).min === 58 && t(4).zone === 'Z2' && t(4).fcCap === 150, 'W46 D4 = longão 58 min Z2 ' + JSON.stringify(t(4)));
    ok(![1, 2, 4].some(d => /pendente/i.test(runTargetLabel(t(d)))), 'nenhuma sessão da W46 fica com duração pendente');
    setApprovedRunningPlan(null);
  }
  const d1z2Longo = JSON.parse(JSON.stringify(plan));
  d1z2Longo.sessoes[0] = { ...d1z2Longo.sessoes[0], zona: 'Z2', fc_cap: 150, min: 45 };
  ok(!validateRunningPlanPayload(d1z2Longo).ok, 'D1 em Z2 fora de 30 min continua recusado');
}

// Config que veio do B2 (celular do Caio) reinicia na S1 do B3 sem perder 1RM.
Storage.saveConfig({ oneRM: { squat: 150, bench: 110, deadlift: 200 }, oneRMHistory: [], currentWeek: 6, cycleId: 'B2-2026-09-28:phone' });
const mig = Storage.getConfig();
ok(mig.currentWeek === 1 && String(mig.cycleId).startsWith('B3-2026-11-09:') && mig.oneRM.squat === 150
   && mig.blocoMigratedFrom === 'B2-2026-09-28',
   'config do B2 migra para S1 do B3 preservando o 1RM');
ok(Storage.getConfig().cycleId === mig.cycleId, 'migração é determinística (mesmo cycleId em leituras seguidas)');

console.log(`\n=== ${fail ? 'FALHOU' : 'OK'}: ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
