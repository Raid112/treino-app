#!/usr/bin/env bash
# Deploy do treino-app. Única forma de publicar: testa, empurra, espera o gate do Actions
# (lógica + navegador) e confere o Pages público. Bloqueio sai em uma linha, em segundos.
#   scripts/release.sh            # publica o HEAD do master
# Saída: "PUBLICADO <sha> ..." (exit 0) ou "BLOQUEADO: <motivo>" (exit 2).
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"  # node e gh moram aqui na VM; shell não-interativo não carrega
GH="${GH:-gh}"
bloqueia() { echo "BLOQUEADO: $*"; exit 2; }

[ "$(git rev-parse --abbrev-ref HEAD)" = master ] || bloqueia "não está no master"
[ -z "$(git status --porcelain)" ] || bloqueia "mudança sem commit: $(git status --porcelain | head -3 | tr '\n' ' ')"

for t in tests/bloco1.test.js tests/recalibragem.test.js; do
  out=$(node "$t" 2>&1) || bloqueia "$t: $(grep -m3 '^FAIL' <<<"$out" | tr '\n' ' ')"
done
out=$(node --test tests/*.test.mjs 2>&1) || bloqueia "testes .mjs: $(grep -m3 'not ok' <<<"$out" | tr '\n' ' ')"

sha=$(git rev-parse HEAD)
git fetch -q origin master
# Vers�o no topo do app = CACHE_NAME do sw.js. App mudou sem subir a vers�o = celular n�o sabe que atualizou.
if ! git diff --quiet origin/master -- index.html corrida-plan.json manifest.json && git diff --quiet origin/master -- sw.js; then
  bloqueia "app mudou mas a vers�o n�o subiu (CACHE_NAME no sw.js + app-version no index.html)"
fi
if [ "$(git rev-parse origin/master)" != "$sha" ]; then
  git push -q origin HEAD:master 2>&1 || bloqueia "push recusado"
fi

run=""
for _ in $(seq 1 30); do
  run=$("$GH" run list --workflow release.yml --commit "$sha" --json databaseId -q '.[0].databaseId' 2>/dev/null)
  [ -n "$run" ] && break
  sleep 5
done
[ -n "$run" ] || bloqueia "workflow release não apareceu para $sha"
if ! "$GH" run watch "$run" --exit-status --interval 15 >/dev/null 2>&1; then
  motivo=$("$GH" run view "$run" --log-failed 2>/dev/null | grep -E 'SMOKE FALHOU|^.*- |FAIL|Error' | sed 's/^.*Z //' | head -4 | tr '\n' ' ')
  bloqueia "gate do Actions reprovou (run $run): ${motivo:-ver gh run view $run}"
fi

node scripts/verify-pages.mjs >/dev/null 2>&1 || bloqueia "Pages público não bate com o commit $sha"
echo "PUBLICADO ${sha:0:7} https://raid112.github.io/treino-app/ (testes + navegador + Pages conferidos; prints: gh run download $run -n telas)"
