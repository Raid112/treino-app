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
  new Function('globalThis', dataLayer + ';globalThis.__x = {' +
    'BLOCO_DES694, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES, Workout, Storage, getAccSets, ' +
    'validateRunningPlanPayload: typeof validateRunningPlanPayload === "function" ? validateRunningPlanPayload : null, ' +
    'setApprovedRunningPlan: typeof setApprovedRunningPlan === "function" ? setApprovedRunningPlan : null, ' +
    'getRunSummaryStatus: typeof getRunSummaryStatus === "function" ? getRunSummaryStatus : null, ' +
    'hasRunDuration: typeof hasRunDuration === "function" ? hasRunDuration : null, ' +
    'refreshInProgressRunTarget: typeof refreshInProgressRunTarget === "function" ? refreshInProgressRunTarget : null, ' +
    'runLabel, runTargetFor, runTargetLabel, ' +
    'renderCurrentWeekRunningTargets: typeof renderCurrentWeekRunningTargets === "function" ? renderCurrentWeekRunningTargets : null, ' +
    'CURRENT_WEEK_RUNNING_TARGETS: typeof CURRENT_WEEK_RUNNING_TARGETS === "undefined" ? null : CURRENT_WEEK_RUNNING_TARGETS, ' +
    'getRunTimerTargetSeconds, isRunTargetReached: typeof isRunTargetReached === "function" ? isRunTargetReached : null, ' +
    'getElapsedRunSeconds: typeof getElapsedRunSeconds === "function" ? getElapsedRunSeconds : null, ' +
    'shouldResumeRunTimer: typeof shouldResumeRunTimer === "function" ? shouldResumeRunTimer : null, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup, ' +
    'formatTopSetPrescription: typeof formatTopSetPrescription === "function" ? formatTopSetPrescription : null, ' +
    'renderExerciseSeriesOverview: typeof renderExerciseSeriesOverview === "function" ? renderExerciseSeriesOverview : null};')(sandbox);
} catch (e) { console.error('FAIL eval da camada de dados: ' + e.message); process.exit(1); }
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP,
        Workout, Storage, getAccSets, validateRunningPlanPayload, setApprovedRunningPlan,
        getRunSummaryStatus, hasRunDuration,
        refreshInProgressRunTarget, runLabel, runTargetFor, runTargetLabel,
        renderCurrentWeekRunningTargets, CURRENT_WEEK_RUNNING_TARGETS,
        getRunTimerTargetSeconds, isRunTargetReached, getElapsedRunSeconds, shouldResumeRunTimer, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup,
        formatTopSetPrescription, renderExerciseSeriesOverview } = sandbox.__x;
ok(true, 'camada de dados avaliada');
ok(/const saved = Storage\.getInProgress\(\);\s*if \(saved\) \{\s*if \(refreshInProgressRunTarget\(saved\)\) Storage\.saveInProgress\(saved\);/.test(src),
   'boot migra e persiste alvos de corrida de treino salvo do bloco ativo');
ok(/if \(shouldResumeRunTimer\(saved\.running\)\) this\.startRunTimer\(\)/.test(src),
   'boot retoma timer de corrida pela marca de início persistida');
ok(!src.includes('if (!Number.isFinite(w.running.actual.duration) && Number.isFinite(w.running.target.min))'),
   'finalizar não grava duração prescrita como duração realizada');
ok(!/:\s*this\.runTimerElapsed\s*;/.test(src),
   'duração sem timer ativo não reutiliza elapsed antigo de outra corrida');

// O card temporario W41 espelha apenas o contrato agregado; nao mapeia dias, sessoes nem zonas.
ok(typeof renderCurrentWeekRunningTargets === 'function' && CURRENT_WEEK_RUNNING_TARGETS,
   'helper de alvos publicos temporarios esta disponivel');
if (typeof renderCurrentWeekRunningTargets === 'function' && CURRENT_WEEK_RUNNING_TARGETS) {
  const localDate = day => new Date(2026, 9, day, 12);
  const w41Start = renderCurrentWeekRunningTargets(localDate(5));
  ok(w41Start.includes('W41') && w41Start.includes('05–11 out 2026')
      && w41Start.includes('Alvo semanal') && w41Start.includes('144 min 24 s')
      && w41Start.toLowerCase().includes('mínimo') && w41Start.includes('130 min'),
     'W41 exibe somente o alvo agregado e o mínimo do contrato');
  ok(!/Z2|Z3|S1|S2|S3|restantes|saldo/i.test(w41Start),
     'card nao atribui zonas/sessoes nem alega saldo de execucao');
  ok(renderCurrentWeekRunningTargets(localDate(11)).includes('W41'),
     'alvos continuam visiveis ate domingo 11/10/2026');
  ok(renderCurrentWeekRunningTargets(localDate(12)) === ''
      && renderCurrentWeekRunningTargets(new Date(2026, 9, 4, 12)) === '',
     'alvos ficam ocultos fora da janela W41 e expiram apos domingo');
  ok(renderCurrentWeekRunningTargets(new Date(2027, 9, 11, 12)) === '',
     'alvos nao reaparecem na W41 de outro ano');
  const allowedTargetFields = ['completionThresholdSeconds', 'endsOn', 'isoWeek', 'isoYear', 'startsOn', 'weeklyTargetSeconds'];
  ok(JSON.stringify(Object.keys(CURRENT_WEEK_RUNNING_TARGETS).sort()) === JSON.stringify(allowedTargetFields),
     'dados publicos contem somente janela e alvos semanais agregados');
  ok(CURRENT_WEEK_RUNNING_TARGETS.isoYear === 2026 && CURRENT_WEEK_RUNNING_TARGETS.isoWeek === 41
      && CURRENT_WEEK_RUNNING_TARGETS.startsOn === '2026-10-05'
      && CURRENT_WEEK_RUNNING_TARGETS.endsOn === '2026-10-11'
      && CURRENT_WEEK_RUNNING_TARGETS.weeklyTargetSeconds === 8664
      && CURRENT_WEEK_RUNNING_TARGETS.completionThresholdSeconds === 7800,
     'overlay corresponde a W41: 144.4 min de alvo e minimo 130 min');
  ok(html.includes('<div id="running-week-targets"></div>')
      && src.includes('refreshCurrentWeekRunningTargets();'),
     'home integra o card e atualiza/remove a exibicao ao retornar do background');
  ok(!JSON.stringify(CURRENT_WEEK_RUNNING_TARGETS).match(/activity|completed|weight|kpi|zone|session/i),
     'card de alvos nao expoe execucao nem dados pessoais');
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
ok(w1.running.target.zone === 'Z2' && w1.running.target.min === null
   && w1.running.target.minEhPiso === false,
   'W1 D4 Long Run mantém Z2 sem duplicar alvo de duração');
ok(getAccSets(4) === -1 && getAccSets(1) === 0, 'getAccSets: -1 no deload, 0 na base');

const w6Run = Workout.generateWorkout({ ...cfg, currentWeek: 6 }, 4);
ok(w6Run.cycleId === 'test-cycle', 'novo treino carrega cycleId ativo');
ok(w6Run.running.target.min === null, 'W6 5K continua sem meta de minutos');
ok(runTargetLabel(w6Run.running.target) === '5K · tempo livre', 'W6 5K nao renderiza minutos null');
ok(getRunTimerTargetSeconds(w6Run.running.target) === 0, 'timer do W6 5K nao multiplica minutos null');
ok(getRunTimerTargetSeconds({ min: 20 }) === 1200, 'timer normal converte minutos em segundos');
ok(typeof hasRunDuration === 'function', 'helper de duração registrada está disponível para teste');
if (typeof hasRunDuration === 'function') {
  ok(!hasRunDuration(null) && !hasRunDuration(undefined) && !hasRunDuration('') && !hasRunDuration(0),
     'duração ausente ou não positiva não conta como corrida registrada');
  ok(hasRunDuration(31.5) && hasRunDuration('31.5'),
     'duração positiva numérica ou textual é reconhecida');
}
ok(resolveRunDuration('34.5', null) === 34.5, 'duracao real digitada e preservada');
ok(typeof shouldResumeRunTimer === 'function'
   && shouldResumeRunTimer({ timerStartedAt: 10000, actual: { completed: false } }, 70000)
   && !shouldResumeRunTimer({ timerStartedAt: 80000, actual: { completed: false } }, 70000)
   && !shouldResumeRunTimer({ timerStartedAt: 10000, actual: { completed: true } }, 70000),
   'retomada exige timer iniciado, não futuro e ainda não concluído');
ok(typeof getElapsedRunSeconds === 'function'
   && getElapsedRunSeconds(10000, 70000) === 60
   && getElapsedRunSeconds(80000, 70000) === 0,
   'timer deriva segundos decorridos da marca persistida e rejeita timestamps futuros');
ok(resolveRunDuration('', null, 90) === 2 && resolveRunDuration('', null, 0) === null,
   'duração real usa timer decorrido quando existe e permanece null sem evidência');

// D2 (28/09/2026, divisao restaurada) carrega a unica sessao de qualidade da semana: Z3, FC <= 162.
const w1d2 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 2);
ok(w1d2.running && w1d2.running.target.zone === 'Z3' && w1d2.running.target.fcCap === 162,
   `W1 D2 = qualidade Z3/162 (got ${JSON.stringify(w1d2.running && w1d2.running.target)})`);
ok(w1d2.exercises[0] && w1d2.exercises[0].lift === 'deadlift' && w1d2.exercises[0].type === 'secondary',
   'D2 carrega deadlift secondary (D5 continua primary)');
const w1d1 = Workout.generateWorkout({ ...cfg, currentWeek: 1 }, 1);
ok(w1d1.running.target.zone === 'Z2' && w1d1.running.target.fcCap === B.corrida.fcCap,
   'D1 continua Z2 (so D2 e qualidade)');
const w2d1 = Workout.generateWorkout({ ...cfg, currentWeek: 2 }, 1);
ok(w2d1.running && w2d1.running.target.min === 30
   && w2d1.running.target.minEhPiso === false
   && w2d1.running.target.zone === 'Z2' && w2d1.running.target.fcCap === B.corrida.fcCap,
   `W2 D1 Squat prescreve 30 min Z2/FC ≤ ${B.corrida.fcCap}`);
ok(runLabel(DAY_DEFS[0], WEEK_DATA[2]) === '30min Z2 · FC ≤ 150',
   'cartão W2 D1 mostra 30 min Z2 sem alterar o alvo global de sessão');
const w2d2Quality = Workout.generateWorkout({ ...cfg, currentWeek: 2 }, 2);
ok(w2d2Quality.running && w2d2Quality.running.target.min === B.corrida.sessaoMinimaMin
   && w2d2Quality.running.target.zone === 'Z3' && w2d2Quality.running.target.fcCap === 162,
   'W2 D2 mantém a qualidade Z3/162 no deadlift');
const w2d4 = Workout.generateWorkout({ ...cfg, currentWeek: 2 }, 4);
ok(w2d4.running && w2d4.running.target.zone === 'Z2'
   && w2d4.running.target.fcCap === B.corrida.fcCap,
   'W2 D4 Long Run permanece Z2/FC ≤ 150');
ok(w2d4.running && w2d4.running.target.min === null
   && w2d4.running.target.minEhPiso === false,
   'W2 D4 não inventa alvo de duração enquanto o contrato não é lido pelo app');
ok(runLabel(DAY_DEFS[3], WEEK_DATA[2]).includes('duração pendente da review'),
   'card W2 D4 sinaliza que a duração do Long Run depende do contrato');
ok(runTargetLabel(w2d4.running.target) === 'Duração pendente da review'
   && getRunTimerTargetSeconds(w2d4.running.target) === 0,
   'W2 D4 não mostra nem inicia contagem regressiva com duração inventada');

// Payload sintético para validar o consumidor; não é prescrição real nem deve ser publicado.
const planContractHelpersAvailable = typeof validateRunningPlanPayload === 'function'
  && typeof setApprovedRunningPlan === 'function';
ok(planContractHelpersAvailable, 'validador e injetor do contrato aprovado de corrida disponíveis');
if (planContractHelpersAvailable) {
  const syntheticRunPlan = {
    schema_version: 1, status: 'pronto', natureza: 'alvo_prescrito',
    approval: { state: 'approved', reference: 'synthetic-test-only', approved_at: '2026-10-12T12:00:00-03:00' },
    source: { review_run_id: 'synthetic-test-only', prep_sha256: 'a'.repeat(64) },
    semana_iso: '2026-W42',
    bloco_id: B.id, semana_bloco: 3, fase: 'base',
    faixa_volume_aprovada_min: [150, 160],
    sessoes: [
      { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 30, fc_cap: 150 },
      { dia_app: 'D2', papel: 'terra', zona: 'Z3', min: 40, fc_cap: 162 },
      { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 80, fc_cap: 150 }
    ],
    totais: { total_semanal_min: 150, total_z2_min: 110, total_z3_min: 40,
      agachamento_z2_min: 30, long_run_z2_min: 80 },
    regra_long_run: 'total_z2_min - agachamento_z2_min',
    long_minimo_min: 30, long_minimo_excecao: null,
    excecao_deload: { aplica: false }
  };
  const planCheck = validateRunningPlanPayload(syntheticRunPlan);
  ok(planCheck && planCheck.ok, 'contrato sintético válido fecha zonas, dias, soma e regra do Long Run');
  const wrongSum = structuredClone(syntheticRunPlan);
  wrongSum.totais.total_z2_min = 111;
  ok(!validateRunningPlanPayload(wrongSum).ok, 'contrato rejeita total Z2 que não fecha com sessões');
  const wrongMapping = structuredClone(syntheticRunPlan);
  wrongMapping.sessoes[1].dia_app = 'D1';
  ok(!validateRunningPlanPayload(wrongMapping).ok, 'contrato rejeita dia/papel duplicado ou fora do mapa explícito');
  const unapproved = structuredClone(syntheticRunPlan);
  unapproved.approval.state = 'pending';
  ok(!validateRunningPlanPayload(unapproved).ok, 'contrato sem aprovação explícita não fica utilizável');
  const approvalWithoutZone = structuredClone(syntheticRunPlan);
  approvalWithoutZone.approval.approved_at = '2026-10-12T12:00:00';
  ok(!validateRunningPlanPayload(approvalWithoutZone).ok, 'aprovação sem fuso horário é rejeitada');
  const publicSeed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'corrida-plan.json'), 'utf8'));
  ok(publicSeed.status === 'pendente' && publicSeed.sessoes.length === 0
     && !validateRunningPlanPayload(publicSeed).ok,
     'artefato publicado inicial fica pendente e não inventa alvos semanais');

  ok(setApprovedRunningPlan(syntheticRunPlan), 'payload sintético válido aceito pelo leitor do PWA');
  const planDate = new Date(2026, 9, 12, 12);
  const planW3d1 = Workout.generateWorkout({ ...cfg, currentWeek: 3 }, 1, planDate);
  const planW3d2 = Workout.generateWorkout({ ...cfg, currentWeek: 3 }, 2, planDate);
  const planW3d4 = Workout.generateWorkout({ ...cfg, currentWeek: 3 }, 4, planDate);
  ok(planW3d1.running.target.min === 30 && planW3d1.running.target.zone === 'Z2'
     && !planW3d1.running.target.minEhPiso,
     'consumidor usa D1 Z2 exato do contrato aprovado');
  ok(planW3d2.running.target.min === 40 && planW3d2.running.target.zone === 'Z3'
     && planW3d2.running.target.fcCap === 162,
     'consumidor usa D2 Z3 exato do contrato aprovado');
  ok(planW3d4.running.target.min === 80 && planW3d4.running.target.zone === 'Z2'
     && getRunTimerTargetSeconds(planW3d4.running.target) === 4800,
     'consumidor aplica D4 Long Run Z2 exato e timer correspondente');
  ok(runLabel(DAY_DEFS[3], WEEK_DATA[3], 3, planDate) === '80min Z2 · FC ≤ 150',
     'rótulo visível do cartão usa duração/zona do plano aprovado');
  const staleW3d4 = Workout.generateWorkout({ ...cfg, currentWeek: 3 }, 4, new Date(2026, 9, 19, 12));
  const wrongWeekW3d4 = Workout.generateWorkout({ ...cfg, currentWeek: 2 }, 4, planDate);
  ok(staleW3d4.running.target.min === null && wrongWeekW3d4.running.target.min === null,
     'contrato antigo ou de outra semana do bloco não alimenta D4');
  const wrongPhasePlan = { ...syntheticRunPlan, fase: 'deload' };
  ok(!validateRunningPlanPayload(wrongPhasePlan).ok,
     'fase deload não pode ser publicada para semana 3 de base');

  ok(typeof isRunTargetReached === 'function'
     && isRunTargetReached(4801, 4800.6)
     && !isRunTargetReached(4800, 4800.6),
     'timer reconhece o cruzamento de alvo fracionário sem exigir igualdade impossível');

  const syntheticDeload = {
    ...syntheticRunPlan, semana_iso: '2026-W43', semana_bloco: 4,
    fase: 'deload', faixa_volume_aprovada_min: null,
    sessoes: [
      { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 20, fc_cap: 150 },
      { dia_app: 'D2', papel: 'terra', zona: 'Z2', min: 25, fc_cap: 150 },
      { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 30, fc_cap: 150 }
    ],
    totais: { total_semanal_min: 75, total_z2_min: 75, total_z3_min: 0,
      agachamento_z2_min: 20, long_run_z2_min: 30 },
    regra_long_run: 'seguir_distribuicao_exata_da_review',
    excecao_deload: { aplica: true, regra: 'seguir_distribuicao_exata_da_review' }
  };
  ok(validateRunningPlanPayload(syntheticDeload).ok,
     'deload sintético valida distribuição explícita sem aplicar a fórmula regular');
  const blankDeloadException = {
    ...syntheticDeload,
    long_minimo_excecao: '   ',
    sessoes: syntheticDeload.sessoes.map(session => session.dia_app === 'D4'
      ? { ...session, min: 25 } : session),
    totais: { total_semanal_min: 70, total_z2_min: 70, total_z3_min: 0,
      agachamento_z2_min: 20, long_run_z2_min: 25 }
  };
  ok(!validateRunningPlanPayload(blankDeloadException).ok,
     'exceção de deload em branco não libera Long Run abaixo do piso');
  ok(!validateRunningPlanPayload({ ...syntheticDeload, semana_iso: '2026-W45', semana_bloco: 6 }).ok,
     'W6 com teste 5K rejeita payload de Long Run incompatível');
  const deloadDate = new Date(2026, 9, 19, 12);
  ok(setApprovedRunningPlan(syntheticDeload)
     && Workout.generateWorkout({ ...cfg, currentWeek: 4 }, 4, deloadDate).running.target.min === 30,
     'consumidor usa o D4 explícito do deload aprovado da semana 4');
  setApprovedRunningPlan(null);
}
ok(typeof getRunSummaryStatus === 'function', 'helper do resumo da corrida está disponível');
if (typeof getRunSummaryStatus === 'function') {
  const d4SemTempo = getRunSummaryStatus(w2d4.running.target, null);
  const d4ComTempo = getRunSummaryStatus(w2d4.running.target, 38.2);
  const d1Concluida = getRunSummaryStatus(w2d1.running.target, 30);
  const w6Teste = getRunSummaryStatus(w6Run.running.target, 32.5);
  const w6SemTempo = getRunSummaryStatus(w6Run.running.target, null);
  ok(d4SemTempo.planLabel === 'Duração pendente da review'
     && d4SemTempo.actualLabel === 'tempo não informado' && !d4SemTempo.completed,
     'resumo W2 D4 não inventa 0 min nem marca corrida sem registro como concluída');
  ok(d4ComTempo.actualLabel === '38.2min · sem verificação'
     && d4ComTempo.statusClass === '' && !d4ComTempo.completed,
     'resumo W2 D4 não declara conclusão sem o piso canônico disponível');
  ok(d1Concluida.completed && d1Concluida.statusClass === 'ok'
     && d1Concluida.actualLabel === '30min ✓',
     'resumo com alvo de duração conhecido compara a corrida ao plano');
  ok(w6Teste.planLabel === '5K · tempo livre' && w6Teste.completed
     && w6Teste.statusClass === 'ok' && w6Teste.actualLabel === '32.5min ✓',
     'W6 preserva o resultado livre do teste 5K com duração registrada');
  ok(w6SemTempo.actualLabel === 'tempo não informado ⚠' && !w6SemTempo.completed,
     'W6 5K sem tempo registrado não é marcada como concluída');
}
ok(typeof refreshInProgressRunTarget === 'function',
   'helper de migração do alvo de corrida em treino salvo está disponível');
if (typeof refreshInProgressRunTarget === 'function') {
  const staleD1 = {
    week: 2, dayNum: 1, cycleId: `${B.id}:stale-d1`,
    running: {
      target: { min: 20, zone: 'Z2', fcCap: 150, minEhPiso: true, tipo: 'base' },
      actual: { completed: false, duration: 25, hr: 140, pace: 8.2 },
      note: 'progresso que deve ser preservado'
    }
  };
  const d1Actual = staleD1.running.actual;
  ok(refreshInProgressRunTarget(staleD1)
     && staleD1.running.target.min === 30
     && staleD1.running.target.minEhPiso === false
     && staleD1.running.target.zone === 'Z2'
     && staleD1.running.actual === d1Actual,
     'W2 D1 salvo migra para 30 min Z2 sem perder execução registrada');

  const staleD2 = {
    week: 2, dayNum: 2, cycleId: `${B.id}:stale-d2`,
    running: { target: { min: 20, zone: 'Z2', fcCap: 150, minEhPiso: true, tipo: 'base' },
      actual: { completed: false, duration: null, hr: null, pace: null } }
  };
  ok(refreshInProgressRunTarget(staleD2)
     && staleD2.running.target.zone === 'Z3' && staleD2.running.target.fcCap === 162,
     'W2 D2 salvo migra para Z3 no treino de terra');

  const staleD4 = {
    week: 2, dayNum: 4, cycleId: `${B.id}:stale-d4`,
    running: { target: { min: 20, zone: 'Z2', fcCap: 150, minEhPiso: true, tipo: 'longa' },
      actual: { completed: false, duration: 54, hr: 145, pace: 8.1 } }
  };
  ok(refreshInProgressRunTarget(staleD4)
     && staleD4.running.target.min === null
     && staleD4.running.target.zone === 'Z2'
     && staleD4.running.actual.duration === 54
     && !getRunSummaryStatus(staleD4.running.target, staleD4.running.actual.duration).completed,
     'W2 D4 salvo mantém tempo realizado mas remove alvo Long Run obsoleto');

  const staleW6 = {
    week: 6, dayNum: 4, cycleId: `${B.id}:stale-w6`,
    running: { target: { min: 20, zone: 'Z2', fcCap: 150, minEhPiso: true, tipo: 'longa' },
      actual: { completed: false, duration: null, hr: null, pace: null } }
  };
  ok(refreshInProgressRunTarget(staleW6)
     && staleW6.running.target.zone === '5K Teste'
     && staleW6.running.target.min === null,
     'W6 salvo continua reconhecido como teste 5K de tempo livre');

  const otherCycle = {
    week: 2, dayNum: 4, cycleId: 'B1-legacy:session',
    running: { target: { min: 20, zone: 'Z2', fcCap: 150, minEhPiso: true, tipo: 'longa' },
      actual: { completed: false, duration: null, hr: null, pace: null } }
  };
  ok(!refreshInProgressRunTarget(otherCycle)
     && otherCycle.running.target.min === 20,
     'migração não reinterpreta treino salvo de outro bloco');
}
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
