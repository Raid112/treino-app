// Exercita cancelWorkout real e protege as demais confirmações.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/  async cancelWorkout\(\) \{([\s\S]*?)\n  \},\n\n  \/\/ ========== SETTINGS/);
assert.ok(match);
const events = [];
const app = new Function('Storage', `return ({ async cancelWorkout() {${match[1]}\n} });`)( { clearInProgress: () => events.push('clear') } );
app.currentWorkout = { id: 'em andamento' };
app.confirmModal = () => { events.push('confirm'); return false; };
app.stopTimer = () => events.push('timer');
app.stopRunTimer = () => events.push('runTimer');
app.showScreen = screen => events.push(screen);
app.updateHomeScreen = () => events.push('refresh');
(async () => {
  await app.cancelWorkout();
  assert.equal(app.currentWorkout, null);
  assert.deepEqual(events, ['clear', 'timer', 'runTimer', 'home', 'refresh']);
  assert.match(html, /this\.confirmModal\(/, 'outras confirmações continuam no app');
  console.log('PASS cancelamento direto limpa treino e preserva as demais confirmações');
})().catch(error => { console.error(error); process.exitCode = 1; });
