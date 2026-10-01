// bloco1.test.js — gate do bloco ativo B2-2026-09-28 (DES-694) sobre index.html.
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
    'DAY_DEFS, EXECUTION_PROFILES, Workout, Storage, getAccSets, runLabel, runTargetFor, ' +
    'getISOWeekKey, getRunWeekContract, renderRunContractMarkup, runTargetLabel, ' +
    'getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup};')(sandbox);
} catch (e) { console.error('FAIL eval da camada de dados: ' + e.message); process.exit(1); }
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP,
        Workout, Storage, getAccSets, runLabel, runTargetFor, getISOWeekKey,
        getRunWeekContract, renderRunContractMarkup, runTargetLabel,
        getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup } = sandbox.__x;
ok(true, 'camada de dados avaliada');

// 3. Plano alimentar B2: cut v9c a 1850 kcal em todas as semanas (loops/dieta/contrato.md, 30/09).
ok(Object.keys(DIET_PLAN.weeks).length === B.semanas, 'DIET_PLAN cobre as 6 semanas');
const cutDiet = getDietWeekPlan(1, {});
ok(Object.values(DIET_PLAN.weeks).every(w => w === 'cut'), 'B2 nao tem diet break');
ok(cutDiet.phase === 'cut' && cutDiet.totalCalories === 1850,
   'W1 usa cut v9c a 1850 kcal');
ok(cutDiet.meals.every(m => m.calories == null && m.share == null),
   'nao inventa rateio de kcal por refeicao que o contrato nao define');
ok(cutDiet.protein_g === 205 && cutDiet.fat_g === 60
   && cutDiet.caloriesForCarbsAtFloors === 490 && cutDiet.carbsAtFloors_g === 122.5,
   'orcamento de carbo respeita os pisos diarios P/G e fecha as 1850 kcal');
const renderedDiet = renderDietPlanMarkup(cutDiet);
ok(renderedDiet.includes('Sem rateio de kcal/carbo por refeição')
   && renderedDiet.includes('30 g de whey é peso do pó')
   && renderedDiet.includes('mais carbo no pré significa menos no pós')
   && renderedDiet.includes('restam 490 kcal (≈122,5 g de carboidrato)'),
   'tela explica a distribuição pré/pós e mantém o orçamento diário');
ok(!renderedDiet.includes('C ~60 g') && !renderedDiet.includes('C ~80 g'),
   'tela não inventa alvos de carbo por refeição');
ok(cutDiet.meals.every(m => m.carbs_g == null),
   'cut mantém carbo sem rateio por refeição');
const meal = id => cutDiet.meals.find(item => item.id === id);
const preMeal = meal('pre_treino');
const postMeal = meal('pos_treino');
ok(JSON.stringify(preMeal.proteinRange_g) === '[25,35]'
   && JSON.stringify(postMeal.proteinRange_g) === '[25,35]',
   'pré e pós têm guia de 25–35 g de proteína por refeição');
ok((renderedDiet.match(/P 25–35 g · guia/g) || []).length === 2,
   'renderer mostra a faixa de proteína nos dois cards do entorno do treino');
ok(preMeal.calories == null && postMeal.calories == null
   && preMeal.carbs_g == null && postMeal.carbs_g == null,
   'guia de proteína não cria rateio de kcal/carbo');
ok(meal('cafe_manha').quantity === '2 ovos + 200 g de tomate-cereja + 500 ml de leite'
   && /rótulo|rotulo/i.test(meal('cafe_manha').uncertainty),
   'cafe informa quantidade e ressalva macros dependentes do leite/rótulo');
ok(meal('almoco').quantity === '400 g de mistura + 400 g de vegetais'
   && /composição|composicao/.test(meal('almoco').uncertainty),
   'almoco informa porcoes sem fingir medir macros da mistura');
ok(/2 copos/.test(meal('cafe_tarde').quantity) && /30 g/.test(meal('cafe_tarde').quantity)
   && /60 g\/dia/.test(meal('cafe_tarde').quantity)
   && /rótulo|rotulo/i.test(meal('cafe_tarde').uncertainty),
   'cafe da tarde informa 2 copos, 30 g cada, 60 g/dia e depende do rótulo');
ok(/25–35 g de proteína/.test(meal('pre_treino').quantity)
   && /25–35 g de proteína/.test(meal('pos_treino').quantity)
   && /rótulo|rotulo/i.test(meal('pre_treino').quantity)
   && /rótulo|rotulo/i.test(meal('pos_treino').quantity),
   'pre e pos mostram faixa de proteina e leitura por rotulo');
ok(DIET_PLAN.weekChanges[1].kind === 'change'
   && /1850 kcal/.test(DIET_PLAN.weekChanges[1].text)
   && /v9c/.test(DIET_PLAN.weekChanges[1].text)
   && html.includes('diet-plan-change'),
   'W1 do B2 destaca a entrada no cut v9c');
const cutW3 = getDietWeekPlan(3, { dietTdeeObserved: 2650 });
ok(cutW3.phase === 'cut' && cutW3.totalCalories === 1850 && /1850/.test(cutW3.calorieRule),
   'W3 usa o contrato fixo de 1850, nao TDEE − 550');
ok(cutW3.meals.every(m => m.calories == null),
   'W3 nao mostra kcal por refeicao sem rateio no contrato');
const invalidWeek = getDietWeekPlan(0, {});
ok(invalidWeek.phase === 'cut' && invalidWeek.totalCalories === 1850 && invalidWeek.week === 1,
   'semana invalida nao ressuscita o break encerrado');

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
const contractW40Date = new Date(2026, 8, 30, 12);
const afterContractW40Date = new Date(2026, 9, 5, 12);
ok(getISOWeekKey(contractW40Date) === '2026-W40' && getISOWeekKey(afterContractW40Date) === '2026-W41',
   'chave ISO da semana troca de W40 para W41 na segunda-feira');
const contractW40SundayEndDate = new Date(2026, 9, 4, 23, 59);
const contractW41MondayStartDate = new Date(2026, 9, 5, 0, 1);
ok(getISOWeekKey(contractW40SundayEndDate) === '2026-W40'
   && getISOWeekKey(contractW41MondayStartDate) === '2026-W41',
   'semana ISO respeita a virada local domingo 23:59 → segunda 00:01');
const w40SundayWorkout = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2, contractW40SundayEndDate);
const w41MondayWorkout = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2, contractW41MondayStartDate);
ok(w40SundayWorkout.running.target.min === 40
   && w40SundayWorkout.date === '2026-10-04'
   && w40SundayWorkout.id === '2026-10-04-d2',
   'treino de domingo W40 mantém contrato e data/id locais');
ok(w41MondayWorkout.running.target.min === B.corrida.sessaoMinimaMin
   && w41MondayWorkout.date === '2026-10-05'
   && w41MondayWorkout.id === '2026-10-05-d2',
   'treino de segunda 00:01 usa W41 e data/id locais');
const runContractW40 = getRunWeekContract(contractW40Date);
ok(runContractW40 && runContractW40.blockId === 'B2-2026-09-28'
   && runContractW40.volumeTargetMin === 137
   && runContractW40.doneLooksLike.sessionsMin === 3
   && runContractW40.doneLooksLike.volumeMin === 123.3
   && runContractW40.doneLooksLike.fcAvgMax === 150,
   'espelho W40 inclui alvo semanal e limiares do contrato');
const runContractMarkup = renderRunContractMarkup(runContractW40);
ok(runContractMarkup.includes('alvo 137 min') && runContractMarkup.includes('≥123,3 min e ≥3 estímulos')
   && runContractMarkup.includes('FC média ≤150 bpm'),
   'resumo da home mostra o contrato semanal sem chamar o teto de meta');
ok(getRunWeekContract(afterContractW40Date) === null,
   'nenhum contrato estático é apresentado depois do fim da W40');
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
const w1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 4, afterContractW40Date);
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

// Espelho temporario do contrato vivo de 2026-W40; fora da semana volta ao guardrail do bloco.
const w1d2 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2, contractW40Date);
ok(w1d2.running && w1d2.running.target.min === 40 && w1d2.running.target.zone === 'Z3'
   && w1d2.running.target.fcCap === 162 && w1d2.running.target.minEhPiso === false,
   `W1 D2 = 40 min Z3/162, alvo de sessao (got ${JSON.stringify(w1d2.running && w1d2.running.target)})`);
ok(runLabel(DAY_DEFS[1], WEEK_DATA[1], contractW40Date) === '40 min Z3 · FC ≤ 162 · TE aeróbico 3–4',
   'card do Terra + Corrida mostra 40 min, zona, teto de FC e TE do contrato W40');
ok(w1d2.running.note.includes('joelho ≥3/10') && w1d2.running.note.includes('30 min Z2')
   && w1d2.running.note.includes('Regra manual')
   && w1d2.running.note.includes('o app não detecta dor/recovery')
   && w1d2.running.note.includes('nem altera o treino automaticamente'),
   'nota informa gatilho e deixa claro que a adaptação não é automatizada pelo app');
ok(runTargetLabel(w1d2.running.target) === '40 min'
   && getRunTimerTargetSeconds(w1d2.running.target) === 2400,
   'timer do contrato W40 usa 40 min, nao o piso antigo de 20');
ok(w1d2.exercises[0] && w1d2.exercises[0].lift === 'deadlift' && w1d2.exercises[0].type === 'secondary',
   'D2 carrega deadlift secondary (D5 continua primary)');
const w1d1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 1, contractW40Date);
ok(w1d1.running.target.min === 45 && w1d1.running.target.zone === 'Z2'
   && w1d1.running.target.fcCap === 150,
   'W1 D1 Agacho + Corrida = 45 min Z2/150');
const w1d4 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 4, contractW40Date);
ok(w1d4.running.target.min === 52 && w1d4.running.target.zone === 'Z2'
   && w1d4.running.target.fcCap === 150,
   'W1 D4 Long Run = 52 min Z2/150');
const w41d2 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2, afterContractW40Date);
ok(w41d2.running.target.min === B.corrida.sessaoMinimaMin
   && w41d2.running.target.zone === 'Z3' && w41d2.running.target.fcCap === 162
   && w41d2.running.target.minEhPiso === true,
   'W40 snapshot expira na W41 e nao vaza para outra semana');
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
