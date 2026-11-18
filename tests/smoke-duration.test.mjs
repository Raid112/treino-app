import assert from 'node:assert/strict';
import test from 'node:test';
import { prohibitedScreenText } from './smoke-checks.mjs';

const violations = text => prohibitedScreenText.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason);

test('smoke aceita durações em segundos e frações de minuto', () => {
  for (const text of [
    '12× (15 s forte + 45 segundos leve)', '30 seg', '90 segundos',
    '0.25 min', '0,75 min', '1.5 min', '10,5 min', '30.8 min',
    '0.5 min forte + 1.5 min leve', '0.333333 min',
  ]) assert.deepEqual(violations(text), [], text);
});

test('smoke continua detectando os demais textos proibidos', () => {
  for (const [text, reason] of [
    ['undefined', 'texto quebrado'], ['NaN', 'texto quebrado'], ['[object Object]', 'texto quebrado'],
    ['Sem meta individual', 'refeição sem a meta aprovada'],
    ['loops/plano.md', 'caminho de arquivo na tela'], ['semana W47', 'semana ISO (Wnn) em vez de S1-S6'],
  ]) assert.ok(violations(text).includes(reason), text);
});
