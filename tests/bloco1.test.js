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
    'renderCurrentWeekRunningTargets: typeof renderCurrentWeekRunningTargets === "function" ? renderCurrentWeekRunningTargets : null, ' +
    'CURRENT_WEEK_RUNNING_TARGETS: typeof CURRENT_WEEK_RUNNING_TARGETS === "undefined" ? null : CURRENT_WEEK_RUNNING_TARGETS, ' +
    'getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup, ' +
    'formatTopSetPrescription: typeof formatTopSetPrescription === "function" ? formatTopSetPrescription : null, ' +
    'renderExerciseSeriesOverview: typeof renderExerciseSeriesOverview === "function" ? renderExerciseSeriesOverview : null};')(sandbox);
} catch (e) { console.error('FAIL eval da camada de dados: ' + e.message); process.exit(1); }
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP,
        Workout, Storage, getAccSets, runTargetLabel,
        renderCurrentWeekRunningTargets, CURRENT_WEEK_RUNNING_TARGETS,
        getRunTimerTargetSeconds, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup,
        formatTopSetPrescription, renderExerciseSeriesOverview } = sandbox.__x;
ok(true, 'camada de dados avaliada');

// Os alvos temporarios sao publicos somente durante W41/2026 e carregam apenas
// as duas duracoes autorizadas — sem ledger de atividade nem KPIs pessoais.
ok(typeof renderCurrentWeekRunningTargets === 'function' && CURRENT_WEEK_RUNNING_TARGETS,
   'helper de alvos publicos temporarios esta disponivel');
if (typeof renderCurrentWeekRunningTargets === 'function' && CURRENT_WEEK_RUNNING_TARGETS) {
  const localDate = day => new Date(2026, 9, day, 12);
  const w41Start = renderCurrentWeekRunningTargets(localDate(5));
  ok(w41Start.includes('W41') && w41Start.includes('05–11 out 2026')
      && w41Start.includes('Z2') && w41Start.includes('47 min 33 s')
      && w41Start.includes('Z3') && w41Start.includes('44 min 48 s'),
     'W41 exibe explicitamente as duracoes restantes de Z2 e Z3');
  ok(renderCurrentWeekRunningTargets(localDate(11)).includes('W41'),
     'alvos continuam visiveis ate domingo 11/10/2026');
  ok(renderCurrentWeekRunningTargets(new Date(2026, 9, 4, 12)) === ''
      && renderCurrentWeekRunningTargets(new Date(2026, 9, 12, 0, 0, 1)) === '',
     'alvos ficam ocultos fora da janela W41 e expiram apos domingo');
  ok(renderCurrentWeekRunningTargets(new Date(2027, 9, 11, 12)) === '',
     'alvos nao reaparecem na W41 de outro ano');
  const allowedTargetFields = ['endsOn', 'isoWeek', 'isoYear', 'startsOn', 'z2Seconds', 'z3Seconds'];
  ok(JSON.stringify(Object.keys(CURRENT_WEEK_RUNNING_TARGETS).sort()) === JSON.stringify(allowedTargetFields),
     'dados publicos contem apenas semana, validade e alvos Z2/Z3 autorizados');
  ok(CURRENT_WEEK_RUNNING_TARGETS.isoYear === 2026 && CURRENT_WEEK_RUNNING_TARGETS.isoWeek === 41
      && CURRENT_WEEK_RUNNING_TARGETS.startsOn === '2026-10-05'
      && CURRENT_WEEK_RUNNING_TARGETS.endsOn === '2026-10-11'
      && CURRENT_WEEK_RUNNING_TARGETS.z2Seconds === 2853
      && CURRENT_WEEK_RUNNING_TARGETS.z3Seconds === 2688,
     'overlay e exatamente W41, 05–11/10, com as duracoes aprovadas');
  ok(html.includes('<div id="running-week-targets"></div>')
      && src.includes('refreshCurrentWeekRunningTargets();'),
     'home integra o card e atualiza/remove a exibicao ao retornar do background');
  ok(!w41Start.includes('kg') && !w41Start.includes('LB')
      && !/atividade|conclu[ií]d|executad|volume realizado/i.test(w41Start),
     'card de alvos nao expoe atividade executada nem KPIs pessoais');
}

// A tela deve deixar o top set visualmente distinto das séries de trabalho e
// contar ambos no volume prescrito, sem mutar os dados do treino.
const setUiCfg = { oneRM: { squat: 140, bench: 100, deadlift: 180 }, oneRMHistory: [], currentWeek: 2, cycleId: 'test-cycle' };
const deadliftDayS2 = Workout.generateWorkout(setUiCfg, 5);
const deadliftS2 = deadliftDayS2.exercises.find(e => e.lift === 'deadlift');
ok(typeof formatTopSetPrescription === 'function' && typeof renderExerciseSeriesOverview === 'function',
   'helpers de apresentação de top set e séries estão disponíveis para teste');
if (typeof formatTopSetPrescription === 'function' && typeof renderExerciseSeriesOverview === 'function') {
  const plannedBeforeRender = JSON.stringify(deadliftS2.planned);
  const topSetLabel = formatTopSetPrescription(deadliftS2.actual.topSet);
  const seriesOverview = renderExerciseSeriesOverview(deadliftS2, true);
  ok(topSetLabel === 'Top set — 1×3 @RPE 9', `top set tem rótulo e alvo próprios (${topSetLabel})`);
  ok(seriesOverview.includes('Séries de trabalho') && seriesOverview.includes('3×5'),
     'renderer separa o bloco de trabalho em 3×5');
  ok(seriesOverview.includes('Total prescrito') && seriesOverview.includes('4 séries')
     && seriesOverview.includes('1 top set + 3 de trabalho'),
     'renderer mostra total de 4 séries e sua composição');
  const blockedOverview = renderExerciseSeriesOverview(deadliftS2, false);
  ok(blockedOverview.includes('4 séries') && blockedOverview.includes('1 top set (desativado hoje) + 3 de trabalho')
     && blockedOverview.includes('Hoje: 3 séries de trabalho'),
     'total distingue prescrição completa de top set desativado por readiness');
  const noTopSet = Workout.generateWorkout({ ...setUiCfg, currentWeek: 1 }, 5).exercises.find(e => e.lift === 'deadlift');
  const normalOverview = renderExerciseSeriesOverview(noTopSet, false);
  ok(normalOverview.includes('Total prescrito') && normalOverview.includes('3 séries')
     && normalOverview.includes('3 séries de trabalho') && !normalOverview.includes('top set'),
     'sem top set, o total representa apenas as séries de trabalho');
  const benchS2 = deadliftDayS2.exercises.find(e => e.lift === 'bench');
  const benchOverview = benchS2 ? renderExerciseSeriesOverview(benchS2, false) : '';
  ok(benchS2 && benchS2.planned.sets === 2 && benchS2.planned.reps === 5 && !benchS2.actual.topSet,
     'supino do D5 mantém a prescrição normal de 2×5, sem top set');
  ok(benchOverview.includes('2×5') && benchOverview.includes('2 séries')
     && benchOverview.includes('2 séries de trabalho') && !benchOverview.includes('top set'),
     'renderer apresenta supino como 2 séries de trabalho, total 2');
  ok(JSON.stringify(deadliftS2.planned) === plannedBeforeRender,
     'renderer não altera a prescrição armazenada');
}

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
const cutS2 = getDietWeekPlan(2, {});
ok(cutS2.phase === 'cut' && cutS2.totalCalories === 1700
   && cutS2.protein_g === 205 && cutS2.fat_g === 60,
   'S2 mostra alvo operacional de 1700 kcal com os pisos P/G');
ok(cutS2.caloriesForCarbsAtFloors === 340 && cutS2.carbsAtFloors_g === 85,
   'S2 calcula somente o saldo diário de carbo nos pisos, sem rateio por refeição');
const renderedS2Diet = renderDietPlanMarkup(cutS2);
ok(renderedS2Diet.includes('Semana 2 (B2/S2)')
   && renderedS2Diet.includes('+30 min de Z2 em bicicleta/ergométrica')
   && renderedS2Diet.includes('fora do volume de corrida'),
   'S2 exibe a nota de bicicleta separada do volume de corrida');
const cutW3 = getDietWeekPlan(3, { dietTdeeObserved: 2650 });
ok(cutW3.phase === 'cut' && cutW3.totalCalories === 1850 && /1850/.test(cutW3.calorieRule),
   'W3 permanece no contrato fixo de 1850, nao TDEE − 550');
ok(cutW3.meals.every(m => m.calories == null),
   'W3 nao mostra kcal por refeicao sem rateio no contrato');
ok(getDietWeekPlan(1, {}).totalCalories === 1850
   && Object.keys(WEEK_DATA).length === B.semanas,
   'override de S2 nao altera W1 nem a prescricao de forca');
ok(DAY_DEFS.filter(d => d.type === 'running' || d.type === 'combined').length === 3,
   'nota de bicicleta nao cria nem soma uma sessao de corrida');
const invalidWeek = getDietWeekPlan(0, {});
ok(invalidWeek.phase === 'cut' && invalidWeek.totalCalories === 1850 && invalidWeek.week === 1,
   'semana invalida nao ressuscita o break encerrado');

// 4. O plano bate com o Esqueleto
ok(Object.keys(WEEK_DATA).length === B.semanas, `WEEK_DATA tem ${B.semanas} semanas`);
ok(B.id === 'B2-2026-09-28', 'bloco = B2-2026-09-28');
ok(WEEK_DATA[2].theme === 'Forca' && WEEK_DATA[2].p.s === 3 && WEEK_DATA[2].p.r === 5,
   'S2 mantém séries primárias de força em 3x5');

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
