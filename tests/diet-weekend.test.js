const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = html.slice(html.indexOf('const DIET_PLAN ='), html.indexOf('function formatHistoryExercise'));
const context = { Date, BLOCO_DES694: { inicio: '2026-11-09' } };
vm.createContext(context);
vm.runInContext(source + '\nthis.getPlan = getDietWeekPlan; this.render = renderDietPlanMarkup;', context);
const current = context.getPlan(1, {}, new Date(2026, 10, 10, 12));
const markup = context.render(current);
assert.match(markup, /Dias úteis/i);
assert.match(markup, /Fim de semana/i);
for (const item of ['20 g de aveia', '100 g de banana', '2 ovos', '20 g de leite condensado', '284 g de peito de frango', '284 g de cabotiá', 'sem pele', 'sem osso', 'sem óleo', '1.600 kcal', '205 g', '112 g', '35 g']) assert.ok(markup.includes(item), item);
assert.match(markup, /Almoço/); assert.match(markup, /Jantar/);
assert.match(markup, /refeição livre/i);
assert.match(markup, /não.*consumo|consumo.*não/i);
assert.ok(current.meals.some(m => m.quantity.includes('350 g de carne/mistura')));
assert.equal(current.meals.some(m => m.id === 'cafe_manha'), false);
assert.equal(current.meals.find(m => m.id === 'cafe_tarde').quantity, 'Café preto + 200 ml de leite Italac semidesnatado');
for (const id of ['pre_treino', 'pos_treino']) assert.equal(current.meals.find(m => m.id === id).quantity, '100 g de peito de frango cozido, pesado pronto + 1 pão francês');
assert.match(current.meals.find(m => m.id === 'pipoca').quantity, /30 g de milho cru.*ar.*sem óleo/);
assert.match(markup, /≈1\.605 kcal/);
assert.match(markup, /Pisos de proteína \(205 g\) e gordura \(60 g\) não comprovados/);
// O cartão apresenta os dois planos simultaneamente, inclusive aos sábados e domingos.
const weekendSection = html => html.slice(html.indexOf('<div class="diet-plan-title">Fim de semana</div>'));
const baselineWeekend = weekendSection(context.render(context.getPlan(1, {}, new Date(2026, 10, 9, 12))));
for (const day of [10, 14, 15, 16]) {
  const rendered = context.render(context.getPlan(1, {}, new Date(2026, 10, day, 12)));
  assert.equal(weekendSection(rendered), baselineWeekend, `fim de semana preservado em 2026-11-${day}`);
  assert.match(rendered, /Dias úteis/);
  assert.match(rendered, /Fim de semana/);
}
const previous = context.getPlan(1, {}, new Date(2026, 10, 9, 12));
assert.ok(previous.meals.some(m => m.id === 'cafe_manha'));
assert.ok(!previous.meals.some(m => m.id === 'pipoca'));
const historical = context.render(context.getPlan(4, {}, new Date(2026, 9, 20, 12)));
assert.doesNotMatch(historical, /Fim de semana/i);
console.log('PASS plano fim de semana, dias úteis e histórico');
