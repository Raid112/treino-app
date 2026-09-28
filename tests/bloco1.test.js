// bloco1.test.js — gate do bloco B1-2026-09-07 (DES-694) sobre index.html.
//
// Complementa recalibragem.test.js: aquele testa a matematica de 1RM, este testa
// que os DADOS do plano obedecem o Esqueleto (loops/bloco/bloco.json no KpiMaster).
// Sem isso, uma edicao em WEEK_DATA/DAY_DEFS pode voltar a prescrever 4 dias de
// barra ou um single e nada acusa ate o joelho.
//
//   node tests/bloco1.test.js
//
// Sem deps. Extrai o <script> real do index.html, igual ao outro teste.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: <script> nao encontrado'); process.exit(1); }
const src = m[1];

let fail = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };

// The visible counter must describe the current six-week block, not the retired
// 24-week plan.
ok(html.includes('Semana <span id="current-week">1</span>/6'),
   'UI exibe Semana X/6');
ok(!html.includes('id="current-week">1</span>/24'),
   'UI nao exibe mais o denominador legado /24');
ok(html.includes("'date','day_num','day_type','day_name','week','cycle_id'"),
   'CSV exporta cycle_id para separar ciclos');
ok(html.includes('id="diet"') && html.includes('data-screen="diet"') && html.includes('Dieta'),
   'aba Dieta existe e aponta para a tela dedicada');

// 1. Sintaxe do bundle inteiro (pega erro de patch antes de chegar no celular)
try { new Function(src); ok(true, `sintaxe do <script> (${src.length} bytes)`); }
catch (e) { console.error('FAIL sintaxe: ' + e.message); process.exit(1); }

// 2. Camada de dados isolada do DOM. localStorage minimo porque Storage e real.
const cut = src.indexOf('// ========== CSV EXPORT ==========');
const dataLayer = src.slice(0, cut > 0 ? cut : src.length);
const _ls = new Map();
globalThis.localStorage = {
  getItem: k => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: k => _ls.delete(k)
};
const sandbox = {};
try {
  new Function('globalThis', dataLayer + ';globalThis.__x = {BLOCO_DES694, WEEK_DATA, ' +
    'DAY_DEFS, EXECUTION_PROFILES, Workout, Storage, getAccSets, runTargetLabel, ' +
    'getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan};')(sandbox);
} catch (e) { console.error('FAIL eval da camada de dados: ' + e.message); process.exit(1); }
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP,
        Workout, Storage, getAccSets, runTargetLabel,
        getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan } = sandbox.__x;
ok(true, 'camada de dados avaliada');

// 3. Plano alimentar B2: cut v9b a 1850 kcal em todas as semanas (loops/dieta/contrato.md, 28/09).
ok(Object.keys(DIET_PLAN.weeks).length === B.semanas, 'DIET_PLAN cobre as 6 semanas');
const breakDiet = getDietWeekPlan(1, {});
const sum = (key) => breakDiet.meals.reduce((acc, meal) => acc + (meal[key] || 0), 0);
ok(Object.values(DIET_PLAN.weeks).every(w => w === 'cut'), 'B2 nao tem diet break');
ok(breakDiet.phase === 'cut' && breakDiet.totalCalories === 1850,
   'W1 usa cut v9b a 1850 kcal');
ok(Math.abs(sum('calories') - 1850) <= 3 && sum('protein_g') === 205,
   'alocacao do cut fecha ~1850 kcal e 205 g P');
ok(['cafe_tarde','pre_treino','pos_treino'].every(id => {
  const meal = breakDiet.meals.find(item => item.id === id);
  return meal && meal.calories > 0 && meal.protein_g > 0;
}), 'cafe da tarde/pre/pos tem kcal e proteina');
const meal = id => breakDiet.meals.find(item => item.id === id);
ok(meal('cafe_manha').quantity === '2 ovos + 200 g de tomate-cereja + 500 ml de leite',
   'cafe da manha informa ovos, tomate e 500 ml de leite');
ok(meal('almoco').quantity === '400 g de mistura + 400 g de vegetais'
   && /meta da refeição/.test(meal('almoco').uncertainty),
   'almoco informa as duas porcoes e nao finge medir a proteina da mistura');
ok(/2 copos/.test(meal('cafe_tarde').quantity) && /30 g/.test(meal('cafe_tarde').quantity)
   && /60 g\/dia/.test(meal('cafe_tarde').quantity),
   'cafe da tarde informa 2 copos, 30 g por copo e 60 g/dia');
ok(/alimentos à sua escolha/.test(meal('pre_treino').quantity)
   && /30 g de whey/.test(meal('pos_treino').quantity),
   'pre e pos deixam escolha de alimentos, mas fixam os alvos e 30 g de whey');
ok(DIET_PLAN.weekChanges[1].kind === 'change'
   && /1850 kcal/.test(DIET_PLAN.weekChanges[1].text)
   && html.includes('diet-plan-change'),
   'W1 do B2 destaca a entrada no cut v9b');
const cutW3 = getDietWeekPlan(3, { dietTdeeObserved: 2650 });
ok(cutW3.phase === 'cut' && cutW3.totalCalories === 1850 && /1850/.test(cutW3.calorieRule),
   'W3 usa o contrato fixo de 1850, nao TDEE − 550');
ok(cutW3.meals.map(m => m.calories).join(',') === '352,555,241,241,463',
   'W3 distribui 1850 kcal pelas refeicoes');

// 4. O plano bate com o Esqueleto
ok(Object.keys(WEEK_DATA).length === B.semanas, `WEEK_DATA tem ${B.semanas} semanas`);
ok(B.id === 'B2-2026-09-28', 'bloco = B2-2026-09-28');

const singles = Object.entries(WEEK_DATA)
  .filter(([, w]) => (w.p && w.p.r === 1) || (w.sec && w.sec.r === 1)).map(([k]) => k);
ok(B.forca.semSingles && singles.length === 0,
   'sem_singles: nenhuma semana com r=1 ' + JSON.stringify(singles));

const diasForca = DAY_DEFS.filter(d => d.type === 'strength' || d.type === 'combined');
ok(diasForca.length >= B.forca.sessoes[0] && diasForca.length <= B.forca.sessoes[1],
   `dias de forca = ${diasForca.length}, bloco pede ${JSON.stringify(B.forca.sessoes)}`);

const diasCorrida = DAY_DEFS.filter(d => d.type === 'running' || d.type === 'combined');
ok(diasCorrida.length === B.corrida.sessoesAlvo,
   `dias de corrida = ${diasCorrida.length}, alvo ${B.corrida.sessoesAlvo}`);

// Tema orfao quebra EXECUTION_PROFILES[w.theme].label na tela de treino e faz a
// super meta sumir em silencio. Por isso o bloco reusa chaves existentes.
const orfaos = [...new Set(Object.values(WEEK_DATA).map(w => w.theme))].filter(t => !EP[t]);
ok(orfaos.length === 0, 'todos os temas existem em EXECUTION_PROFILES ' + JSON.stringify(orfaos));

// 4. generateWorkout nao explode em nenhuma combinacao semana x dia
const cfg = { oneRM: { squat: 140, bench: 100, deadlift: 180 }, oneRMHistory: [], currentWeek: 1, cycleId: 'test-cycle' };
let erros = 0, comCorrida = 0, comBarra = 0;
for (let wk = 1; wk <= B.semanas; wk++) {
  for (let d = 1; d <= DAY_DEFS.length; d++) {
    try {
      const w = Workout.generateWorkout({ ...cfg, currentWeek: wk }, d);
      if (w.running) comCorrida++;
      if (w.exercises.length) comBarra++;
      if (w.running && w.running.target.zone === 'Z2'
          && w.running.target.fcCap !== B.corrida.fcCap) {
        console.error(`  fc_cap errado em W${wk}D${d}`); erros++;
      }
    } catch (e) { console.error(`  W${wk}D${d}: ${e.message}`); erros++; }
  }
}
ok(erros === 0, `generateWorkout em ${B.semanas * DAY_DEFS.length} combinacoes ` +
   `(${comBarra} com barra, ${comCorrida} com corrida)`);

const w6 = Workout.generateWorkout({ ...cfg, currentWeek: 6 }, 4);
ok(w6.running && w6.running.target.zone === '5K Teste', 'W6 D4 = teste de saida (5K)');
const w1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 4);
ok(w1.running.target.zone === 'Z2' && w1.running.target.min === B.corrida.sessaoMinimaMin,
   `W1 D4 = piso ${B.corrida.sessaoMinimaMin} min Z2`);
ok(getAccSets(4) === -1 && getAccSets(1) === 0, 'getAccSets: -1 no deload, 0 na base');

const w6Run = Workout.generateWorkout({ ...cfg, currentWeek: 6 }, 4);
ok(w6Run.cycleId === 'test-cycle', 'novo treino carrega cycleId ativo');
ok(w6Run.running.target.min === null, 'W6 5K continua sem meta de minutos');
ok(runTargetLabel(w6Run.running.target) === '5K · tempo livre', 'W6 5K nao renderiza minutos null');
ok(getRunTimerTargetSeconds(w6Run.running.target) === 0, 'timer do W6 5K nao multiplica minutos null');
ok(getRunTimerTargetSeconds({ min: 20 }) === 1200, 'timer normal converte minutos em segundos');
ok(resolveRunDuration('34.5', null) === 34.5, 'duracao real digitada e preservada');

// D2 (28/09/2026, divisao restaurada) carrega a unica sessao de qualidade da semana: Z3, FC <= 162.
const w1d2 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2);
ok(w1d2.running && w1d2.running.target.zone === 'Z3' && w1d2.running.target.fcCap === 162,
   `W1 D2 = qualidade Z3/162 (got ${JSON.stringify(w1d2.running && w1d2.running.target)})`);
ok(w1d2.exercises[0] && w1d2.exercises[0].lift === 'deadlift' && w1d2.exercises[0].type === 'secondary',
   'D2 carrega deadlift secondary (D5 continua primary)');
const w1d1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 1);
ok(w1d1.running.target.zone === 'Z2' && w1d1.running.target.fcCap === B.corrida.fcCap,
   'D1 continua Z2 (so D2 e qualidade)');
ok(diasForca.length === 4 && B.forca.sessoes[1] === 4,
   `divisao restaurada = 4 dias de barra (bloco amplo p/ ${JSON.stringify(B.forca.sessoes)})`);

// Top set perto da falha, generalizado no B2 pros 3 lifts (S2 terra, S3 supino,
// S5 agacho "da vez"): o lift da vez leva RPE9/90%, os outros dois RPE8/85%, cada
// um no dia em que ELE e primary. WEEK_DATA[week].topSets agora e array (nao mais
// o campo singular `topSet` do B1) — ver Workout.initTopSet.
const daVez = { 2: 'deadlift', 3: 'bench', 5: 'squat' };
const primaryDay = { squat: 1, bench: 3, deadlift: 5 };
for (const wk of [2, 3, 5]) {
  for (const lift of ['squat', 'bench', 'deadlift']) {
    const day = primaryDay[lift];
    const w = Workout.generateWorkout({ ...cfg, currentWeek: wk }, day);
    const ex = w.exercises.find(e => e.lift === lift);
    const expectedRpe = lift === daVez[wk] ? 9 : 8;
    const expectedPct = lift === daVez[wk] ? 90 : 85;
    ok(ex && ex.actual.topSet && ex.actual.topSet.reps === 3 && ex.actual.topSet.rpeTarget === expectedRpe,
       `S${wk} D${day} (${lift} primary) top set RPE${expectedRpe} ` + JSON.stringify(ex && ex.actual.topSet));
    ok(ex && ex.actual.topSet && ex.actual.topSet.weight === Workout.calcWeight(cfg.oneRM[lift], expectedPct),
       `S${wk} ${lift}: peso do top set = ${expectedPct}% do 1RM`);
  }
}

// Cada semana de forca leva exatamente 3 top sets (1 por lift, so no dia primary).
for (const wk of [2, 3, 5]) {
  let topSetCount = 0;
  for (let d = 1; d <= DAY_DEFS.length; d++) {
    const w = Workout.generateWorkout({ ...cfg, currentWeek: wk }, d);
    w.exercises.forEach(e => { if (e.actual.topSet) topSetCount++; });
  }
  ok(topSetCount === 3, `S${wk} tem exatamente 3 top sets (1 por lift) — achou ${topSetCount}`);
}

// D2 (deadlift secondary) nunca ganha top set, mesmo em semana de top set.
const w2d2 = Workout.generateWorkout({ ...cfg, currentWeek: 2 }, 2);
const w2d2Deadlift = w2d2.exercises.find(e => e.lift === 'deadlift');
ok(w2d2Deadlift && !w2d2Deadlift.actual.topSet, 'D2 (deadlift secondary) nao ganha top set mesmo em semana de top set');

// Semanas sem top set: S1 (hipertrofia), S4 (deload), S6 (taper/teste 5K).
for (const wk of [1, 4, 6]) {
  let topSetCount = 0;
  for (let d = 1; d <= DAY_DEFS.length; d++) {
    const w = Workout.generateWorkout({ ...cfg, currentWeek: wk }, d);
    w.exercises.forEach(e => { if (e.actual.topSet) topSetCount++; });
  }
  if (topSetCount !== 0) erros++;
  ok(topSetCount === 0, `S${wk} nao tem top set (achou ${topSetCount})`);
}
ok(erros === 0, 'nenhum top set vazou pra semana errada');

// 5. Migracao de currentWeek — o caso que so aparece no celular dele.
// Sync.applyRemote() escreve o config direto no localStorage, entao a migracao
// TEM que estar no caminho de leitura: um jsonbin com semana 14 (plano antigo de
// 24) faria WEEK_DATA[week] === undefined e a home crasharia.
_ls.clear();
const legacyHistory = [{ date:'2026-09-01', dayNum:1, week:14, completed:true, marker:'legacy' }];
const legacyOneRMHistory = [{ lift:'squat', to:145 }];
_ls.set('wu_config', JSON.stringify({ oneRM: { squat: 140, bench: 100, deadlift: 180 },
                                      oneRMHistory: legacyOneRMHistory,
                                      currentWeek: 14, goal5kPace:'5:30', dietTdeeObserved:2650 }));
_ls.set('wu_history', JSON.stringify(legacyHistory));
_ls.set('wu_acc_weights', JSON.stringify({ 'Rosca Direta': 12 }));
_ls.set('wu_auth_passphrase', 'keep-me');
const migrado = Storage.getConfig();
ok(migrado.currentWeek === 1 && migrado.weekMigratedFrom === 14,
   `migracao 14 -> ${migrado.currentWeek}, avisa origem ${migrado.weekMigratedFrom}`);
ok(migrado.legacyWeek === 14 && migrado.cycleId,
   'migracao preserva semana legada e cria cycleId ativo');
ok(JSON.stringify(migrado.oneRMHistory) === JSON.stringify(legacyOneRMHistory) && migrado.goal5kPace === '5:30'
    && migrado.dietTdeeObserved === 2650,
   'migracao preserva oneRMHistory, meta de 5K e TDEE');
ok(JSON.stringify(Storage.getWorkouts()) === JSON.stringify(legacyHistory)
    && Storage.getAccWeights()['Rosca Direta'] === 12 && Storage.getPassphrase() === 'keep-me',
   'migracao preserva historico, accWeights e passphrase');
ok(!!WEEK_DATA[migrado.currentWeek], 'WEEK_DATA[semana migrada] existe (home nao crasha)');

// Config legado sem cycleId deve abrir W1 vazia mesmo se apontava para W6.
_ls.set('wu_config', JSON.stringify({ oneRM: { squat: 140, bench: 100, deadlift: 180 }, currentWeek: 6 }));
_ls.set('wu_history', JSON.stringify([
  { date:'2026-09-01', dayNum:1, week:6, completed:true },
  { date:'2026-09-02', dayNum:2, week:6, completed:true }
]));
const validLegacy = Storage.getConfig();
ok(validLegacy.currentWeek === 1 && validLegacy.legacyWeek === 6 && Storage.getCompletedDaysForWeek(1).length === 0,
   'config legado valido reinicia em W1 sem marcar treinos');
_ls.set('wu_config', JSON.stringify(migrado));
_ls.set('wu_history', JSON.stringify(legacyHistory));
_ls.set('wu_acc_weights', JSON.stringify({ 'Rosca Direta': 12 }));
_ls.set('wu_auth_passphrase', 'keep-me');

// A legacy record remains readable but cannot complete a day in the new active cycle.
_ls.set('wu_history', JSON.stringify([
  { date:'2026-09-01', dayNum:1, week:1, cycleId:'old-cycle', completed:true },
  { date:'2026-09-02', dayNum:1, week:1, completed:true },
  { date:'2026-09-03', dayNum:2, week:1, cycleId:migrado.cycleId, completed:true }
]));
ok(Storage.getWorkouts().length === 3, 'historico legado continua legivel');
ok(JSON.stringify(Storage.getCompletedDaysForWeek(1)) === JSON.stringify([2]),
   'completions filtradas pelo cycleId ativo');

const activeCycleId = migrado.cycleId;
const cycleRecords = [];
for (let day = 1; day <= 6; day++) {
  cycleRecords.push({ date:`2026-09-${10 + day}`, dayNum:day, week:1, cycleId:'old-cycle', completed:true });
  cycleRecords.push({ date:`2026-09-${20 + day}`, dayNum:day, week:1, cycleId:activeCycleId, completed:true });
}
_ls.set('wu_history', JSON.stringify(cycleRecords));
Storage.checkWeekAdvance();
ok(Storage.getConfig().currentWeek === 2,
   'advance de semana usa somente completions do ciclo ativo');

const beforeNewCycle = Storage.getConfig();
const oldCycleId = beforeNewCycle.cycleId;
Storage.startNewCycle();
const newCycle = Storage.getConfig();
ok(newCycle.currentWeek === 1 && newCycle.cycleId !== oldCycleId,
   'novo ciclo reinicia na semana 1 com outro cycleId');
ok(JSON.stringify(Storage.getWorkouts()).length > 0 && Storage.getPassphrase() === 'keep-me',
   'novo ciclo nao apaga historico nem passphrase');

_ls.clear();
_ls.set('wu_config', JSON.stringify({ oneRM: { squat: 1, bench: 1, deadlift: 1 },
                                      currentWeek: 3, cycleId: `${B.id}:stable` }));
const intacto = Storage.getConfig();
ok(intacto.currentWeek === 3 && intacto.weekMigratedFrom === undefined && intacto.cycleId === `${B.id}:stable`,
   'semana valida (cycleId do bloco ativo) passa intacta, sem aviso');
_ls.clear();

// Transicao de bloco (28/09/2026, B1 -> B2 e futuros resets): cycleId de um bloco
// anterior tem que reiniciar em W1, com cycleId novo do bloco ativo, preservando
// historico/oneRM/oneRMHistory/meta de 5K/TDEE do bloco anterior intactos.
const oldBlocoCycleId = 'B1-2026-09-07:phone-uuid-1';
const oldBlocoOneRMHistory = [{ lift:'squat', to:140, date:'2026-09-20' }];
_ls.set('wu_config', JSON.stringify({
  oneRM: { squat: 140, bench: 100, deadlift: 180 },
  oneRMHistory: oldBlocoOneRMHistory,
  currentWeek: 3, cycleId: oldBlocoCycleId, goal5kPace: '5:30', dietTdeeObserved: 2650
}));
_ls.set('wu_history', JSON.stringify([
  { date:'2026-09-20', dayNum:1, week:3, cycleId: oldBlocoCycleId, completed:true }
]));
const b2cfg = Storage.getConfig();
ok(b2cfg.currentWeek === 1, 'transicao B1->B2 reinicia na semana 1');
ok(b2cfg.cycleId !== oldBlocoCycleId && b2cfg.cycleId.startsWith(`${B.id}:`),
   `transicao gera cycleId novo do bloco ativo (${b2cfg.cycleId})`);
ok(b2cfg.blocoMigratedFrom === 'B1-2026-09-07' && b2cfg.blocoMigratedFromWeek === 3,
   'transicao registra o bloco e a semana de origem');
ok(JSON.stringify(b2cfg.oneRM) === JSON.stringify({ squat:140, bench:100, deadlift:180 }),
   'transicao de bloco preserva oneRM');
ok(JSON.stringify(b2cfg.oneRMHistory) === JSON.stringify(oldBlocoOneRMHistory),
   'transicao de bloco preserva oneRMHistory');
ok(b2cfg.goal5kPace === '5:30' && b2cfg.dietTdeeObserved === 2650,
   'transicao de bloco preserva meta de 5K e TDEE');
ok(Storage.getWorkouts().length === 1 && Storage.getWorkouts()[0].cycleId === oldBlocoCycleId,
   'historico do bloco anterior continua legivel (nao foi apagado)');
ok(Storage.getCompletedDaysForWeek(3, oldBlocoCycleId).length === 1,
   'completions do bloco anterior continuam consultaveis pelo cycleId antigo');

// Idempotencia: Sync.boot() reaplica o snapshot remoto pre-migracao sempre que o
// local nao esta dirty (applyRemote escreve direto no localStorage). Reaplicar o
// MESMO config B1 cru tem que produzir o MESMO cycleId novo, senao um treino
// salvo num boot anterior do B2 fica orfao no proximo boot.
_ls.set('wu_config', JSON.stringify({
  oneRM: { squat: 140, bench: 100, deadlift: 180 },
  oneRMHistory: oldBlocoOneRMHistory,
  currentWeek: 3, cycleId: oldBlocoCycleId, goal5kPace: '5:30', dietTdeeObserved: 2650
}));
const b2cfgAgain = Storage.getConfig();
ok(b2cfgAgain.cycleId === b2cfg.cycleId,
   'reaplicar o snapshot pre-migracao produz o mesmo cycleId (idempotente)');
_ls.clear();

console.log(`\n=== ${fail ? fail + ' FAIL' : 'TODOS VERDES'} ===`);
process.exit(fail ? 1 : 0);
