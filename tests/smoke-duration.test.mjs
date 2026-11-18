import assert from 'node:assert/strict';
import test from 'node:test';
import { fractionalMinutePattern } from './smoke-checks.mjs';

test('smoke permite os 30 segundos aprovados sem liberar outros minutos fracionados', () => {
  for (const text of ['12× (0.5 min forte + 2 min leve)', '12× (0,5 min forte + 2 min leve)']) {
    assert.doesNotMatch(text, fractionalMinutePattern);
  }
  for (const text of ['10.5 min', '1,5 min', '0.55 min', '30.8 min', '0.5 min forte + 1.5 min leve']) {
    assert.match(text, fractionalMinutePattern);
  }
});
