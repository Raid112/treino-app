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
const cut = src.indexOf('// ========== APP (Part 1 - Core + Home) ==========');
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
    'runLabel, runTargetFor, runTargetLabel, dayDisplayName, ' +
    'renderCurrentWeekRunningTargets: typeof renderCurrentWeekRunningTargets === "function" ? renderCurrentWeekRunningTargets : null, ' +
    'CURRENT_WEEK_RUNNING_TARGETS: typeof CURRENT_WEEK_RUNNING_TARGETS === "undefined" ? null : CURRENT_WEEK_RUNNING_TARGETS, ' +
    'getRunTimerTargetSeconds, isRunTargetReached: typeof isRunTargetReached === "function" ? isRunTargetReached : null, ' +
    'getElapsedRunSeconds: typeof getElapsedRunSeconds === "function" ? getElapsedRunSeconds : null, ' +
    'shouldResumeRunTimer: typeof shouldResumeRunTimer === "function" ? shouldResumeRunTimer : null, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup, ' +
    'formatTopSetPrescription: typeof formatTopSetPrescription === "function" ? formatTopSetPrescription : null, ' +
    'formatHistoryExercise: typeof formatHistoryExercise === "function" ? formatHistoryExercise : null, ' +
    'renderExerciseSeriesOverview: typeof renderExerciseSeriesOverview === "function" ? renderExerciseSeriesOverview : null, ' +
    'forceLadderStepGate: typeof forceLadderStepGate === "function" ? forceLadderStepGate : null, ' +
    'isRpeWithinCap, getSuperMetaRpeConfig, ' +
    'recordForceLadderRpe: typeof recordForceLadderRpe === "function" ? recordForceLadderRpe : null, ' +
    'forceLadderPainGate: typeof forceLadderPainGate === "function" ? forceLadderPainGate : null, ' +
    'renderForceLadderMarkup: typeof renderForceLadderMarkup === "function" ? renderForceLadderMarkup : null, ' +
    'clampLoadToCap: typeof clampLoadToCap === "function" ? clampLoadToCap : null, Export};')(sandbox);
} catch (e) { console.error('FAIL eval da camada de dados: ' + e.message); process.exit(1); }
const { BLOCO_DES694: B, WEEK_DATA, DAY_DEFS, EXECUTION_PROFILES: EP,
        Workout, Storage, getAccSets, validateRunningPlanPayload, setApprovedRunningPlan,
        getRunSummaryStatus, hasRunDuration,
        refreshInProgressRunTarget, runLabel, runTargetFor, runTargetLabel, dayDisplayName,
        renderCurrentWeekRunningTargets, CURRENT_WEEK_RUNNING_TARGETS,
        getRunTimerTargetSeconds, isRunTargetReached, getElapsedRunSeconds, shouldResumeRunTimer, resolveRunDuration, DIET_PLAN, getDietWeekPlan, renderDietPlanMarkup,
        formatTopSetPrescription, formatHistoryExercise, renderExerciseSeriesOverview,
        forceLadderStepGate, forceLadderPainGate, renderForceLadderMarkup,
        isRpeWithinCap, getSuperMetaRpeConfig,
        recordForceLadderRpe,
        clampLoadToCap, Export } = sandbox.__x;
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

// 3. Plano alimentar B2: override temporário aprovado sobre o contrato v9d.
ok(Object.keys(DIET_PLAN.weeks).length === B.semanas, 'DIET_PLAN mantém o mapa de 6 semanas');
const trialDate = new Date(2026, 9, 19, 12);
const trialDiet = getDietWeekPlan(4, {}, trialDate);
ok(trialDiet.phase === 'cut' && trialDiet.version === '2026-10-19-trial-1600'
   && trialDiet.totalCalories === 1600 && trialDiet.approximateCalories === true,
   'W4 aplica apenas o teste temporário de aproximadamente 1600 kcal/dia');
ok(trialDiet.trialStart === '2026-10-19' && trialDiet.trialEnd === '2026-10-25'
   && trialDiet.trialActive === true,
   'teste dietético fica limitado a 19–25/10/2026');
ok(trialDiet.protein_g === 205 && trialDiet.fat_g === 60
   && trialDiet.carbohydrateTarget_g === 60 && trialDiet.carbohydrateApproximate === true,
   'meta diária registra P≥205 g, G≥60 g e C≈60 g sem rateio');
ok(trialDiet.caloriesForCarbsAtFloors == null && trialDiet.carbsAtFloors_g == null,
   'não transforma a divergência da tabela em saldo exato de carbo');
// Proposta por refeição aprovada pelo Caio em 19/10/2026; café sem leite (Caio, 20/10/2026).
const meal = id => trialDiet.meals.find(item => item.id === id);
const macros = id => { const m = meal(id); return [m.kcal, m.protein_g, m.carbohydrate_g, m.fat_g].join('/'); };
ok(macros('cafe_manha') === '180/14/9/10' && macros('almoco') === '812/124/22/24' && macros('cafe_tarde') === '80/6/9/2',
   'café, almoço e café da tarde levam kcal e macros aprovados em 19/10');
const renderedDiet = renderDietPlanMarkup(trialDiet);
ok(renderedDiet.includes('≈1.600 kcal/dia')
   && renderedDiet.includes('P ≥205 g/dia')
   && renderedDiet.includes('G ≥60 g/dia')
   && renderedDiet.includes('C ≈60 g/dia'),
   'tela mostra as metas diárias do teste');
ok(renderedDiet.includes('~812 kcal · P124 C22 G24') && renderedDiet.includes('~180 kcal · P14 C9 G10')
   && renderedDiet.includes('~80 kcal · P6 C9 G2'),
   'tela mostra kcal e macros por refeição');
ok(!/Sem meta individual|não definidos|não especificados|não recalcula/.test(renderedDiet),
   'tela não volta à parede de avisos');
ok(renderedDiet.includes('~540 kcal'),
   'tela diz quanto sobra pra noite (pré + pós)');
ok(!renderedDiet.includes('restam 240 kcal'),
   'tela não inventa saldo de carbo a partir da divergência');
ok(renderedDiet.includes('fora do volume de corrida') && renderedDiet.includes('1.700 kcal'),
   'tela mantém a bicicleta fora da corrida e o retorno ao v9d');
ok(/· S4</.test(renderedDiet) && !/· W\d/.test(renderedDiet),
   'cabeçalho usa a semana do bloco (S4), não W4');
const preMeal = meal('pre_treino');
const postMeal = meal('pos_treino');
ok(preMeal.proteinTarget_g === 30 && postMeal.proteinTarget_g === 30
   && preMeal.carbohydrateTarget_g === 10 && postMeal.carbohydrateTarget_g === 10,
   'pré e pós têm metas aproximadas individuais P≈30 g e C≈10 g');
ok((renderedDiet.match(/P ≈30 g · C ≈10 g/g) || []).length === 2,
   'renderer exibe as metas aproximadas no pré e no pós');
ok(meal('cafe_manha').quantity === '2 ovos + 200 g de tomate-cereja',
   'café da manhã sem os 500 ml de leite');
ok(meal('almoco').quantity === '350 g de carne/mistura + 400 g de vegetais',
   'almoço com 350 g de mistura');
ok(meal('cafe_tarde').quantity === 'Café + 200 ml de leite Italac semidesnatado',
   'café da tarde com 200 ml de Italac semidesnatado');
ok(DIET_PLAN.weekChanges[4].kind === 'change'
   && /30 min de Z2 em bicicleta/.test(DIET_PLAN.weekChanges[4].text)
   && html.includes('diet-plan-change'),
   'S4 mantém a bicicleta Z2 semanal separada da corrida');
const expiredDiet = getDietWeekPlan(4, {}, new Date(2026, 9, 26, 12));
ok(expiredDiet.totalCalories === 1700 && expiredDiet.trialActive === false && expiredDiet.version === 'v9d'
   && expiredDiet.calorieRule.includes('1.700'),
   'após 25/10, o teste termina e volta ao contrato-base v9d de 1700 kcal');
const lastTrialDay = getDietWeekPlan(4, {}, new Date(2026, 9, 25, 23, 59));
ok(lastTrialDay.totalCalories === 1600 && lastTrialDay.trialActive === true
   && lastTrialDay.trialEnd === '2026-10-25',
   'o teste permanece ativo durante todo o sétimo dia e expira depois dele');
const futureDiet = getDietWeekPlan(5, {}, new Date(2026, 9, 26, 12));
ok(futureDiet.totalCalories === 1700 && futureDiet.meals.length > 0
   && futureDiet.version === 'v9d',
   'semana fora do ensaio usa o contrato-base sem herdar porções ou macros do teste');
const trialAcrossWeekAdvance = getDietWeekPlan(5, {}, new Date(2026, 9, 20, 12));
ok(trialAcrossWeekAdvance.totalCalories === 1700
   && trialAcrossWeekAdvance.trialActive === false
   && trialAcrossWeekAdvance.version === 'v9d'
   && !renderDietPlanMarkup(trialAcrossWeekAdvance).includes('Teste de 7 dias'),
   'o teste temporário da W4 não reaparece na W5 antes do fim da janela');
ok(DAY_DEFS.filter(d => d.type === 'running' || d.type === 'combined').length === 3
   && Object.keys(WEEK_DATA).length === B.semanas,
   'bicicleta da dieta não cria sessão de corrida nem altera semanas de força');
const invalidWeek = getDietWeekPlan(0, {}, trialDate);
ok(invalidWeek.week === 1 && invalidWeek.totalCalories === 1700,
   'semana inválida cai no contrato-base v9d sem aplicar o teste');

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
      total_intervalo_min: 0, agachamento_z2_min: 30, terra_z2_min: 0, long_run_z2_min: 80 },
    regra_long_run: 'total_z2_min - agachamento_z2_min - terra_z2_min',
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
  ok(publicSeed.status === 'pronto' && publicSeed.semana_iso === '2026-W43'
     && publicSeed.approval?.state === 'approved'
     && validateRunningPlanPayload(publicSeed).ok
     && publicSeed.totais?.total_semanal_min === 158.8
     && publicSeed.totais?.total_z2_min === 146.8
     && publicSeed.totais?.total_intervalo_min === 12
     && publicSeed.totais?.long_run_z2_min === 63,
     'artefato aprovado W43 valida total, intervalos, Z2 e Long Run explicitamente');

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
     'fase deload exige distribuição própria, não só o enum');
  const invalidPhase = { ...syntheticRunPlan, fase: 'teste' };
  ok(!validateRunningPlanPayload(invalidPhase).ok,
     'fase desconhecida continua rejeitada');
  const malformedHash = structuredClone(syntheticRunPlan);
  malformedHash.source.prep_sha256 = 'not-a-sha256';
  ok(!validateRunningPlanPayload(malformedHash).ok,
     'hash de proveniência malformado continua rejeitado');
  const week4BasePlan = {
    ...syntheticRunPlan,
    semana_iso: '2026-W43', semana_bloco: 4, fase: 'base',
    faixa_volume_aprovada_min: [158.8, 166.1],
    sessoes: [
      { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 30, fc_cap: 150 },
      { dia_app: 'D2', papel: 'terra', zona: 'Z3', min: 40, fc_cap: 162 },
      { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 91, fc_cap: 150 }
    ],
    totais: { total_semanal_min: 161, total_z2_min: 121, total_z3_min: 40,
      total_intervalo_min: 0, agachamento_z2_min: 30, terra_z2_min: 0, long_run_z2_min: 91 }
  };
  ok(WEEK_DATA[4].deload === true && validateRunningPlanPayload(week4BasePlan).ok,
     'W43 aceita fase de corrida base embora a semana de força 4 seja deload');
  const w43IntervalPlan = {
    ...syntheticRunPlan,
    semana_iso: '2026-W43', semana_bloco: 4, fase: 'base',
    faixa_volume_aprovada_min: [158.8, 166.1],
    sessoes: [
      { dia_app: 'D1', papel: 'agachamento', zona: 'Z2', min: 30, fc_cap: 150, planned_date: null },
      { dia_app: 'D2', papel: 'terra', zona: 'intervalado', min: 65.8, fc_cap: 162, planned_date: null,
        segmentos: [
          { tipo: 'continuo', min: 15, zona: 'Z2', fc_cap: 150 },
          { tipo: 'intervalos', repeticoes: 4,
            forte: { min: 3, zona: 'intervalo', fc_cap: 162 },
            recuperacao: { min: 2, zona: 'Z2', fc_cap: 150 } },
          { tipo: 'continuo', min: 30.8, zona: 'Z2', fc_cap: 150 }
        ] },
      { dia_app: 'D4', papel: 'long_run', zona: 'Z2', min: 63, fc_cap: 150, planned_date: null }
    ],
    totais: { total_semanal_min: 158.8, total_z2_min: 146.8, total_z3_min: 0,
      total_intervalo_min: 12, agachamento_z2_min: 30, terra_z2_min: 53.8, long_run_z2_min: 63 },
    regra_long_run: 'total_z2_min - agachamento_z2_min - terra_z2_min'
  };
  ok(validateRunningPlanPayload(w43IntervalPlan).ok,
     'consumer aceita W43 com intervalos tipados e recuperações incluídas no total Z2');
  const badW43Recovery = structuredClone(w43IntervalPlan);
  badW43Recovery.sessoes[1].segmentos[1].recuperacao.zona = 'intervalo';
  ok(!validateRunningPlanPayload(badW43Recovery).ok,
     'consumer rejeita recuperações sem zona Z2 explicitamente tipada');
  const badW43LongRun = structuredClone(w43IntervalPlan);
  badW43LongRun.sessoes[2].min = 116.8;
  badW43LongRun.totais.long_run_z2_min = 116.8;
  ok(!validateRunningPlanPayload(badW43LongRun).ok,
     'consumer rejeita D4 calculado sem subtrair Z2 do aquecimento/recuperações/final de D2');
  const w43Date = new Date(2026, 9, 19, 12);
  ok(setApprovedRunningPlan(w43IntervalPlan), 'payload W43 sintético fica disponível ao consumer');
  const w43D2 = Workout.generateWorkout({ ...cfg, currentWeek: 4 }, 2, w43Date);
  const w43D2Label = runLabel(DAY_DEFS[1], WEEK_DATA[4], 4, w43Date);
  ok(w43D2.running.target.min === 66 && w43D2.running.target.zone === 'intervalado'
     && w43D2.running.target.segments.length === 3
     && w43D2Label.includes('15 min Z2') && w43D2Label.includes('4×(3 min forte controlado / 2 min leve Z2)')
     && w43D2Label.includes('31 min Z2') && !/\d+\.\d+ ?min/.test(w43D2Label) && !/pace\s*\d/i.test(w43D2Label),
     'consumer mostra D2 em minutos inteiros (65,8→66, 30,8→31; Caio 20/10) sem criar pace-alvo');
  ok(dayDisplayName(DAY_DEFS[1], 4, w43Date) === 'Deadlift + Corrida intervalada',
     'D2 intervalado não se chama mais "Corrida Z3"');
  ok(setApprovedRunningPlan(syntheticRunPlan), 'teste W43 restaura o payload sintético anterior');

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
      total_intervalo_min: 0, agachamento_z2_min: 20, terra_z2_min: 25, long_run_z2_min: 30 },
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
      total_intervalo_min: 0, agachamento_z2_min: 20, terra_z2_min: 25, long_run_z2_min: 25 }
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

// Top sets continuam apenas em S2/S3. S5 usa uma escadinha de agachamento que
// substitui o 3×4, com carga em retenção e sem top set extra.
const daVez = { 2: 'deadlift', 3: 'bench' };
const primaryDay = { squat: 1, bench: 3, deadlift: 5 };
for (const wk of [2, 3]) {
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

// Cada semana com top set leva exatamente 3 (1 por lift, só no dia primary).
for (const wk of [2, 3]) {
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

// Semanas sem top set: S1, S4 e S6. S5 preserva dois top sets RPE8 em bench/DL.
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

const w5d1BeforeLadder = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 1);
const w5d3BeforeLadder = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 3);
const w5d5BeforeLadder = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 5);
const w5SquatBeforeLadder = w5d1BeforeLadder.exercises.find(e => e.lift === 'squat');
const w5BenchBeforeLadder = w5d3BeforeLadder.exercises.find(e => e.lift === 'bench');
const w5DeadliftBeforeLadder = w5d5BeforeLadder.exercises.find(e => e.lift === 'deadlift');
const w5TopSetCount = [w5d1BeforeLadder, w5d3BeforeLadder, w5d5BeforeLadder]
  .flatMap(w => w.exercises).filter(e => e.actual.topSet).length;
ok(w5TopSetCount === 2 && !w5SquatBeforeLadder.actual.topSet
   && w5BenchBeforeLadder.actual.topSet.rpeTarget === 8
   && w5DeadliftBeforeLadder.actual.topSet.rpeTarget === 8,
   'S5 remove apenas o top set de agachamento e preserva bench/terra em RPE8');
ok(w5BenchBeforeLadder.actual.superMeta && w5DeadliftBeforeLadder.actual.superMeta,
   'super meta normal de supino e terra continua ativa em S5');
ok(w5BenchBeforeLadder.actual.superMeta.rpeCap === 8
   && w5DeadliftBeforeLadder.actual.superMeta.rpeCap === 8
   && Workout.rpeCap('Forca') === 9
   && Workout.rpeCap('Forca', WEEK_DATA[5].rpeCap) === 8,
   'S5 limita a super-meta de supino/terra a RPE 8 sem mudar o cap de outras semanas');
const s5RpeUi = getSuperMetaRpeConfig(w5BenchBeforeLadder.actual.superMeta, 'Forca');
ok(s5RpeUi.cap === 8 && s5RpeUi.options.join(',') === '7,8'
   && s5RpeUi.range === '7-8' && isRpeWithinCap(8, s5RpeUi.cap)
   && !isRpeWithinCap(9, s5RpeUi.cap) && !isRpeWithinCap(null, s5RpeUi.cap),
   'UI da super-meta S5 só oferece RPE até 8 e a validação rejeita RPE 9');

// S5: escadinha somente no agachamento primário; substitui 3×4 por 12 reps,
// limita cargas ao trabalho anterior do ciclo e exige confirmação sem dor.
ok(WEEK_DATA[5].rpeCap === 8 && WEEK_DATA[5].forceLadder.loadPolicy === 'no_increase',
   'S5 tem teto de esforço 8 e a escadinha não supera a carga de trabalho anterior');
ok(JSON.stringify(WEEK_DATA[5].forceLadder.steps) === JSON.stringify([
  { reps:5, rpeTarget:6 }, { reps:4, rpeTarget:7 }, { reps:3, rpeTarget:8 }
]) && WEEK_DATA[5].forceLadder.lift === 'squat'
   && WEEK_DATA[5].forceLadder.replaces.sets === 3
   && WEEK_DATA[5].forceLadder.replaces.reps === 4
   && WEEK_DATA[5].forceLadder.replaces.totalReps === 12,
   'S5 escadinha 5@6→4@7→3@8 substitui exatamente 3×4');

const savedWorkoutHistory = _ls.get(Storage.KEYS.WORKOUTS);
const priorWorkouts = [
  { date:'2026-10-12', dayNum:1, week:3, cycleId:'test-cycle', completed:true,
    exercises:[{ lift:'squat', type:'primary', planned:{weight:100}, actual:{weight:100, setsCompleted:3,
      topSet:{weight:200, done:true} } }] },
  { date:'2026-10-12', dayNum:3, week:3, cycleId:'test-cycle', completed:true,
    exercises:[
      { lift:'bench', type:'primary', planned:{weight:80}, actual:{weight:80, setsCompleted:3} },
      { lift:'squat', type:'secondary', planned:{weight:95}, actual:{weight:95, setsCompleted:2} }
    ] },
  { date:'2026-10-12', dayNum:5, week:3, cycleId:'test-cycle', completed:true,
    exercises:[
      { lift:'deadlift', type:'primary', planned:{weight:140}, actual:{weight:140, setsCompleted:3} },
      { lift:'bench', type:'secondary', planned:{weight:70}, actual:{weight:70, setsCompleted:2} }
    ] },
  { date:'2026-10-19', dayNum:1, week:4, cycleId:'test-cycle', completed:true,
    exercises:[{ lift:'squat', type:'primary', planned:{weight:500}, actual:{weight:500, setsCompleted:2} }] },
  { date:'2026-10-13', dayNum:1, week:3, cycleId:'old-cycle', completed:true,
    exercises:[{ lift:'squat', type:'primary', planned:{weight:400}, actual:{weight:400, setsCompleted:3} }] },
  { date:'2026-10-14', dayNum:1, week:3, cycleId:'test-cycle', completed:false,
    exercises:[{ lift:'squat', type:'primary', planned:{weight:300}, actual:{weight:300, setsCompleted:3} }] }
];
_ls.set(Storage.KEYS.WORKOUTS, JSON.stringify(priorWorkouts));
const w5d1Ladder = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 1);
const w5d1Squat = w5d1Ladder.exercises.find(e => e.lift === 'squat');
ok(w5d1Squat && w5d1Squat.planned.ladderSteps.length === 3
   && w5d1Squat.planned.weight === 100 && w5d1Squat.planned.loadCapKg === 100
   && w5d1Squat.planned.loadSourceWeek === 3 && !w5d1Squat.planned.loadBlocked,
   'S5 agachamento primário não supera a última carga de trabalho do ciclo');
ok(w5d1Squat && w5d1Squat.actual.superMeta === null && w5d1Squat.actual.topSet === null,
   'S5 agachamento não recebe super meta nem top set extra');
ok(w5d1Ladder.exercises.filter(e => e.lift === 'squat').length === 1
   && w5d1Ladder.exercises.every(e => !e.planned.ladderSteps || e.lift === 'squat')
   && Number.isFinite(w5d1Squat.planned.loadCapKg)
   && w5d1Squat.planned.weight <= w5d1Squat.planned.loadCapKg,
   'somente agachamento primário usa a escadinha e respeita o teto histórico');
const w5d3 = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 3);
const w5d5 = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 5);
ok(w5d3.exercises.every(e => !e.planned.ladderSteps)
   && w5d5.exercises.every(e => !e.planned.ladderSteps),
   'nenhuma escadinha de supino/terra ou squat secundário em S5');
ok(forceLadderPainGate(w5d1Ladder, null).required
   && !forceLadderPainGate(w5d1Ladder, null).ok
   && forceLadderPainGate(w5d1Ladder, 2).ok
   && !forceLadderPainGate(w5d1Ladder, 3).ok
   && forceLadderPainGate(w5d5, null).ok,
   'porta de joelho exige dor <3/10 na escadinha e não afeta os outros dias');
ok(typeof forceLadderStepGate === 'function' && typeof renderForceLadderMarkup === 'function'
   && typeof clampLoadToCap === 'function',
   'helpers de escadinha e teto de carga estão disponíveis');
if (typeof forceLadderStepGate === 'function' && typeof renderForceLadderMarkup === 'function'
    && typeof clampLoadToCap === 'function') {
  const steps = [
    { reps:5, rpeTarget:6, weightKg:100, actualRpe:6, kneePain:0, completed:true },
    { reps:4, rpeTarget:7, weightKg:100, actualRpe:7, kneePain:0, completed:false },
    { reps:3, rpeTarget:8, weightKg:100, actualRpe:null, kneePain:null, completed:false }
  ];
  ok(forceLadderStepGate(steps, 1, 100).ok,
     'passo seguinte só libera após registrar o anterior em carga não crescente');
  ok(!forceLadderStepGate(steps, 2, 100).ok,
     'escadinha não permite pular etapa');
  const rpeStop = structuredClone(steps);
  rpeStop[0].actualRpe = 8;
  ok(!forceLadderStepGate(rpeStop, 1, 100).ok,
     'RPE 8 em etapa anterior interrompe as etapas seguintes');
  const rpeAboveCap = structuredClone(steps);
  rpeAboveCap[1].actualRpe = 9;
  ok(!forceLadderStepGate(rpeAboveCap, 1, 100).ok,
     'escadinha rejeita RPE real acima do teto 8 na própria etapa');
  const invalidRpeWorkout = structuredClone(w5d1Squat);
  invalidRpeWorkout.actual.kneePain = 0;
  invalidRpeWorkout.actual.ladderSteps[0] = {
    ...invalidRpeWorkout.actual.ladderSteps[0], weightKg:100, actualRpe:7,
    kneePain:0, completed:true
  };
  const rejectedRpe = recordForceLadderRpe(invalidRpeWorkout, 0, '9');
  ok(!rejectedRpe.ok && rejectedRpe.reason === 'rpe_above_cap'
     && invalidRpeWorkout.actual.ladderSteps[0].actualRpe === null
     && invalidRpeWorkout.actual.ladderSteps[0].completed === false
     && invalidRpeWorkout.actual.ladderStopped === true
     && invalidRpeWorkout.actual.ladderStopReason === 'rpe'
     && invalidRpeWorkout.actual.setsCompleted === 0,
     'registro direto rejeita RPE 9, não o persiste nem credita a etapa');
  ok((src.match(/recordForceLadderRpe\(/g) || []).length >= 5,
     'entrada, conclusão por checkbox e finalização usam o mesmo gate de RPE');
  const painStop = structuredClone(steps);
  painStop[0].kneePain = 3;
  ok(!forceLadderStepGate(painStop, 1, 100).ok,
     'dor no joelho ≥3/10 interrompe as etapas seguintes');
  const loadIncrease = structuredClone(steps);
  loadIncrease[1].weightKg = 102.5;
  ok(!forceLadderStepGate(loadIncrease, 1, 100).ok,
     'nenhuma etapa pode exceder o teto de carga anterior');
  ok(clampLoadToCap(102.5, 100) === 100 && clampLoadToCap(97.5, 100) === 97.5,
     'entrada de carga é limitada ao teto sem arredondar para cima');
  const ladderHtml = renderForceLadderMarkup(w5d1Squat, 0);
  ok(ladderHtml.includes('5 reps @ RPE 6') && ladderHtml.includes('4 reps @ RPE 7')
     && ladderHtml.includes('3 reps @ RPE 8') && ladderHtml.includes('100 kg')
     && ladderHtml.includes('12 reps') && ladderHtml.includes('S3')
     && ladderHtml.includes('deloads excluídos'),
     'renderer mostra etapas, teto, semana-fonte e exclusão explícita do deload');
  ok(ladderHtml.includes('max="8"') && ladderHtml.includes('placeholder="0–8"'),
     'campo RPE da escadinha expõe o teto S5 de 8');
}
ok(typeof formatHistoryExercise === 'function' && /formatHistoryExercise\(ex\)/.test(src),
   'histórico usa um helper próprio para representar treino e escadinha');
if (typeof formatHistoryExercise === 'function') {
  const historyLadder = structuredClone(w5d1Squat);
  historyLadder.actual.kneePain = 0;
  historyLadder.actual.ladderSteps[0] = {
    reps:5, rpeTarget:6, weightKg:100, actualRpe:6, kneePain:0, completed:true
  };
  historyLadder.actual.setsCompleted = 1;
  const historyText = formatHistoryExercise(historyLadder);
  const historyLower = historyText.toLowerCase();
  ok(historyLower.includes('escadinha 1/3') && historyText.includes('5/12 reps')
     && historyText.includes('5 reps @ 100 kg') && historyText.includes('RPE real 6')
     && historyText.includes('substitui 3×4') && !historyText.includes('1x4 @ 100kg'),
     'histórico mostra etapas/RPE reais e não reinterpreta a escadinha como 1×4');
  const missingHistorySteps = structuredClone(w5d1Squat);
  delete missingHistorySteps.actual.ladderSteps;
  const missingHistoryText = formatHistoryExercise(missingHistorySteps);
  ok(missingHistoryText.toLowerCase().includes('escadinha 0/3')
     && missingHistoryText.includes('0/12 reps') && !missingHistoryText.includes('0x4 @'),
     'histórico de escadinha parcial não cai no formato convencional 3×4');
}
const persistedLadder = structuredClone(w5d1Ladder);
persistedLadder.date = '2026-10-26';
persistedLadder.completed = true;
persistedLadder.exercises[0].actual.ladderSteps[0] = {
  reps:5, rpeTarget:6, weightKg:100, actualRpe:6, kneePain:0, completed:true
};
Storage.saveWorkout(persistedLadder);
const ladderReadback = Storage.getWorkouts().find(w => w.week === 5);
ok(ladderReadback && ladderReadback.exercises[0].actual.ladderSteps[0].completed
   && ladderReadback.exercises[0].actual.ladderSteps[0].weightKg === 100,
   'histórico JSON preserva os passos e cargas realizados da escadinha');
const ladderCsv = Export.generateCSV();
ok(ladderCsv.includes('load_cap_kg') && ladderCsv.includes('planned_ladder')
   && ladderCsv.includes('actual_ladder') && ladderCsv.includes('5@RPE6:100kg'),
   'CSV exporta prescrição, teto e execução da escadinha');
const ladderCsvRows = ladderCsv.split('\n').map(row => row.split(','));
const ladderCsvHeaders = ladderCsvRows[0];
const ladderCsvRow = ladderCsvRows.find(row => row[0] === persistedLadder.date
   && row[ladderCsvHeaders.indexOf('week')] === '5'
   && row[ladderCsvHeaders.indexOf('planned_ladder')]);
ok(ladderCsvRow && ladderCsvRow[ladderCsvHeaders.indexOf('planned_sets')] === '3'
   && ladderCsvRow[ladderCsvHeaders.indexOf('planned_reps')] === ''
   && ladderCsvRow[ladderCsvHeaders.indexOf('planned_pct')] === ''
   && ladderCsvRow[ladderCsvHeaders.indexOf('planned_weight')] === ''
   && ladderCsvRow[ladderCsvHeaders.indexOf('load_cap_kg')] === '100',
   'CSV não duplica a escadinha como 3×4 nem rotula o teto como peso-alvo');
_ls.delete(Storage.KEYS.WORKOUTS);
const blockedNoHistory = Workout.generateWorkout({ ...cfg, currentWeek:5 }, 1).exercises.find(e => e.lift === 'squat');
ok(blockedNoHistory.planned.loadBlocked && blockedNoHistory.planned.weight === null
   && blockedNoHistory.planned.loadCapKg === null,
   'sem carga de trabalho anterior no ciclo, S5 falha fechado sem inventar peso');
if (savedWorkoutHistory === undefined) _ls.delete(Storage.KEYS.WORKOUTS);
else _ls.set(Storage.KEYS.WORKOUTS, savedWorkoutHistory);

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
