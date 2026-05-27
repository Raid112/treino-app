// Teste da logica pura de recalibragem de 1RM.
// Extrai o objeto `Workout` REAL do index.html (nao copia) e roda os casos da Camada 1 do TESTING.md.
// Rodar: node tests/recalibragem.test.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/const Workout = \{[\s\S]*?\n\};/);
if (!m) { console.error('NAO achei o objeto Workout no index.html'); process.exit(2); }
// eslint-disable-next-line no-eval
eval(m[0].replace('const Workout =', 'global.Workout =')); // expoe o objeto real como global

let pass = 0, fail = 0;
function check(id, desc, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${desc}` + (ok ? '' : `\n     esperado ${JSON.stringify(expected)}, obteve ${JSON.stringify(got)}`));
  ok ? pass++ : fail++;
}
function approx(id, desc, got, expected) { check(id, desc, got, expected); }

// L1 — Forca integral: 100x3 -> 100/0.93 = 107.52 -> 107.5
check('L1', 'estimate1RM(100,3) = 107.5', Workout.estimate1RM(100, 3), 107.5);

// L2 — recalibragem Forca x1.0
{
  const cfg = { oneRM: { squat: 100 }, oneRMHistory: [] };
  const e = Workout.recalibrate(cfg, 'squat', 107.5, 'Forca', { weight: 107.5, reps: 3, rpe: 9 });
  check('L2a', 'Forca sobe p/ 107.5', cfg.oneRM.squat, 107.5);
  check('L2b', 'factor integral 1.0', e.factor, 1.0);
  check('L2c', 'delta +7.5', e.delta, 7.5);
}

// L3 — Hipertrofia amortecida: 72x15 -> Epley 108; 1RM 100 -> 100+(108-100)*0.5 = 104
{
  const est = Workout.estimate1RM(72, 15);
  check('L3a', 'estimate1RM(72,15) Epley = 108', est, 108);
  const cfg = { oneRM: { bench: 100 }, oneRMHistory: [] };
  const e = Workout.recalibrate(cfg, 'bench', est, 'Hipertrofia', { weight: 72, reps: 15, rpe: 8 });
  check('L3b', 'Hipertrofia sobe metade -> 104', cfg.oneRM.bench, 104);
  check('L3c', 'factor amortecido 0.5', e.factor, 0.5);
}

// L4 — Monotonico (dia ruim): est < 1RM atual -> null, nao muda
{
  const cfg = { oneRM: { squat: 100 }, oneRMHistory: [] };
  const e = Workout.recalibrate(cfg, 'squat', 98, 'Hipertrofia', { weight: 60, reps: 12, rpe: 7 });
  check('L4a', 'dia ruim retorna null', e, null);
  check('L4b', '1RM inalterado', cfg.oneRM.squat, 100);
  check('L4c', 'oneRMHistory vazio', cfg.oneRMHistory.length, 0);
}

// L5 — Potencia amortecida (factor 0.5)
check('L5', 'recalibrationFactor(Potencia) = 0.5', Workout.recalibrationFactor('Potencia'), 0.5);

// L6 — Teste real desce (allowDescent)
{
  const cfg = { oneRM: { deadlift: 100 }, oneRMHistory: [] };
  const e = Workout.recalibrate(cfg, 'deadlift', 95, null, { weight: 95, reps: 1, rpe: 10 }, { allowDescent: true, source: 'teste_real' });
  check('L6a', '1RM baixa p/ 95', cfg.oneRM.deadlift, 95);
  check('L6b', 'delta -5', e.delta, -5);
  check('L6c', 'source teste_real', e.source, 'teste_real');
}

// L7 — Arredondamento 0.5 em varios casos
{
  const vals = [Workout.estimate1RM(100, 2), Workout.estimate1RM(100, 5), Workout.estimate1RM(83, 4), Workout.estimate1RM(57.5, 7)];
  const allHalf = vals.every(v => Number.isInteger(v * 2));
  check('L7', 'estimativas sempre multiplos de 0.5 ' + JSON.stringify(vals), allHalf, true);
}

// L8 — reps = 1 retorna o proprio peso
check('L8', 'estimate1RM(120,1) = 120', Workout.estimate1RM(120, 1), 120);

// L9 — entry NAO tem campo comment (comentario foi movido p/ o treino)
{
  const cfg = { oneRM: { squat: 100 }, oneRMHistory: [] };
  const e = Workout.recalibrate(cfg, 'squat', 110, 'Forca', { weight: 110, reps: 3, rpe: 9 });
  check('L9', "entry sem 'comment'", Object.prototype.hasOwnProperty.call(e, 'comment'), false);
}

// L10 — superMetaMode por tema
check('L10a', 'Hipertrofia -> reps', Workout.superMetaMode('Hipertrofia'), 'reps');
check('L10b', 'Forca -> carga', Workout.superMetaMode('Forca'), 'carga');
check('L10c', 'Potencia -> carga', Workout.superMetaMode('Potencia'), 'carga');
check('L10d', 'Deload -> null', Workout.superMetaMode('Deload'), null);

// Extra — rpeCap e initSuperMeta sem comment
check('Lx1', 'rpeCap(Hipertrofia) = 8', Workout.rpeCap('Hipertrofia'), 8);
check('Lx2', 'rpeCap(Forca) = 9', Workout.rpeCap('Forca'), 9);
{
  const sm = Workout.initSuperMeta('Forca', { s: 3, r: 3, pct: 90 }, 90);
  check('Lx3', 'initSuperMeta sem campo comment', Object.prototype.hasOwnProperty.call(sm, 'comment'), false);
  check('Lx4', 'initSuperMeta mode carga', sm.mode, 'carga');
  check('Lx5', 'focusSetIndex carga = 0', sm.focusSetIndex, 0);
}
{
  const sm = Workout.initSuperMeta('Hipertrofia', { s: 4, r: 12, pct: 70 }, 70);
  check('Lx6', 'focusSetIndex reps = ultima serie (3)', sm.focusSetIndex, 3);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
