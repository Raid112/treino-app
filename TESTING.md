# TESTING — treino-app (Super Meta + Recalibragem 1RM)

> Doc vivo. Atualizado a cada rodada de teste. Não fechar a sessão enquanto houver caso ❌ ou ⏳.

Última atualização: 2026-05-26
App: `C:\Users\caioc\Apps\treino-app\index.html` (single-file, vanilla JS + localStorage)
Servidor de teste: `python -m http.server 8123` → `http://localhost:8123/index.html`
Ferramenta de teste: **Firefox DevTools MCP** (Chrome localhost foi negado nesta sessão).

---

## Spec corrigida (feedbacks 2026-05-26)

Dois feedbacks mudaram a definição depois do código estar "pronto":

1. **Comentário pertence ao TREINO, não à mudança de 1RM.**
   - Antes: comentário capturado no modal de PR → gravado em `oneRMHistory[].comment`.
   - Agora: campo fixo de comentário na tela de treino (sempre visível, mesmo sem recalibrar), grava em `w.comment`. Removido de `oneRMHistory`.
   - **Decisão registrada (usuário, 2026-05-26):** captura via *campo fixo no fim da tela de treino*, não no modal. Permite comentar dia ruim (sem PR).

2. **Compensação do amortecimento (×0,5) deve estar no TREINO, para o usuário ser ciente.**
   - Antes: amortecimento só no modal efêmero + entry de `oneRMHistory`.
   - Agora: gravado em `sm.recalib = {from, to, delta, factor, estimated}` no exercício salvo; exibido no histórico do treino e detalhado no modal de PR (estimou X → creditado Y, amortecido Z kg).

---

## Camada 1 — Lógica pura (decisiva; roda código real via console)

Chamadas diretas a `Workout.*` no console do app (Firefox `javascript_tool`). Testa o código fonte real, não cópia.

| # | Caso | Entrada | Esperado | Status |
|---|------|---------|----------|--------|
| L1 | Força integral | `estimate1RM(100,3)` | 107,5 | ✅ |
| L2 | Recalibragem Força ×1,0 | 1RM=100, est=107,5, tema Força | sobe p/ 107,5 (factor 1,0) | ✅ |
| L3 | Hipertrofia amortecida | `estimate1RM(72,15)` → recalibrate 1RM=100 | est=108 (Epley); sobe p/ 104 (×0,5) | ✅ |
| L4 | Monotônico (dia ruim) | est < 1RM atual, sem allowDescent | retorna `null`, 1RM não muda | ✅ |
| L5 | Potência amortecida | tema Potencia | factor 0,5 | ✅ |
| L6 | Teste real desce | `allowDescent:true`, est < atual | 1RM baixa, entry criada | ✅ |
| L7 | Arredondamento 0,5 | vários | todos múltiplos de 0,5 | ✅ |
| L8 | reps=1 | `estimate1RM(120,1)` | 120 (sem coef) | ✅ |
| L9 | entry sem comment | qualquer recalibrate | entry NÃO tem campo `comment` | ✅ |
| L10 | superMetaMode | Hipertrofia/Forca/Potencia/Deload | reps/carga/carga/null | ✅ |
| Lx | rpeCap + initSuperMeta sem comment | — | rpeCap 8/9; sm sem `comment`; focusSetIndex correto | ✅ |

**Camada 1: 27/27 PASS** (`node tests/recalibragem.test.js`, extrai o objeto `Workout` real do index.html). Log abaixo.

## Camada 2 — UI / fluxo (Firefox, fluxo real)

| # | Caso | Passos | Esperado | Status |
|---|------|--------|----------|--------|
| U1 | Fricção invertida | D3 bench, finalizar sem mexer | est 85,5 < 100 → sem modal, sem ganho | ✅ |
| U2 | Super meta +reps | D1 squat reps=15, finalizar | est 142,5 → 141,5 (×0,5); modal compensação | ✅ |
| U3 | Gate readiness | injetar `wu_readiness` HRV LOW | painel vira "super meta desativada" + carga real | ✅ |
| U4 | Deload sem super meta | semana 6, D1 | squat sm=null (sem painel) | ✅ |
| U5 | 1RM Test sem super meta | semana 22, D1 | tela 1RM TEST, sem painel; mostra 1RM atual | ✅ |
| U6 | Secundário sem super meta | D3 squat (secondary) | sm=null | ✅ |
| U7 | Comentário do treino | digitar comentário, finalizar | `📝` no histórico | ✅ |
| U8 | Comentário em dia ruim | D2 comentar sem recalibrar | salvo mesmo sem modal de PR | ✅ |
| U9 | Compensação no histórico | após PR amortecido | "estimou 142.5, aplicou 141.5 (×0,5)" | ✅ |
| U10 | Cancelar (modal in-app) | botão Cancelar real | modal abre; "Cancelar treino" → home, inProgress=null | ✅ |
| U11 | Resetar (modal + remote) | botão Resetar real | aviso "local E nuvem"; offline → fallback "Resetar local" (não falha mudo) | ✅ |
| U12 | Persistência reload | reps/RPE/set/comentário + reload | tudo restaurado (estado + DOM) | ✅ |
| U13 | Propagação 1RM | após PR | 1000LB club, home e 1RM Test refletem 141,5 | ✅ |
| U14 | saveSettings preserva history + edição manual | editar 1RM no settings | history preservado; entries manual (sobe e desce via allowDescent) | ✅ |

**Camada 2: 14/14 PASS** (Firefox MCP, fluxo real + injeção/leitura de estado via `javascript:` console). Detalhes no log.

> Nota de definição descoberta nos testes: no `DAY_DEFS`, cada lift tem 1 dia como `primary` (com super meta) e pode aparecer como `secondary` em outro dia (sem super meta). Ex: deadlift é secondary no D2, primary no D5. Super meta só no dia primary daquele lift — **comportamento correto, não bug**.

## Camada 3 — Sync jsonbin (E2E, no Android)

Worker **deployado e validado** (2026-05-27): `STATE_BIN_ID=6a1622a8f47d5c455c3af78b`, `JSONBIN_KEY` (secret), rota `/state` ativa. Validado: jsonbin direto com a Master Key → 200; Worker `/state` sem auth → 401 (rota viva, auth ok). Falta o teste autenticado E2E no Android (precisa da passphrase do app).

| # | Caso | Status |
|---|------|--------|
| S0 | Worker /state deployado + key/bin válidos | ✅ (jsonbin 200, /state 401 sem auth) |
| S1 | GET/PUT happy path no Android | ⏳ testar no celular |
| S2 | Reinstalar/limpar cache restaura do jsonbin | ⏳ testar no celular |
| S3 | Modo avião → fila → volta online faz PUT | ⏳ testar no celular |
| S4 | Reset limpa local E remoto | ⏳ testar no celular |

---

## Pendências / decisões abertas

- [ ] **CSV não inclui compensação.** `generateCSV` tem `sm_reps/sm_rpe/sm_est_1rm` mas não `sm_recalib_applied`/`factor`. Min-change: não adicionar agora. Reavaliar se o usuário exportar para análise.
- [x] **Deploy do Worker** — feito 2026-05-27 (`STATE_BIN_ID` + `JSONBIN_KEY` secret + `wrangler deploy`). ⚠ Master Key foi colada no chat — **rotacionar no jsonbin** e re-rodar `wrangler secret put JSONBIN_KEY`.
- [ ] **Teste E2E do sync no Android** (S1–S4 acima).
- [ ] **Deletar a Spec temporária** após validação E2E.
- [ ] **sw.js cache** bump a cada deploy (v6 → v7 nesta rodada).

## Edges verificados

- `sm.recalib` é `undefined` quando recalibragem não subiu (monotônico): histórico deve cair no ramo "sem ganho", não quebrar.
- `w.comment` vazio: não renderiza linha de comentário no histórico.
- Comentário do usuário escapado (`<`) antes de injetar no histórico (evita quebra de HTML).

---

## Log de execução

### Rodada 1 — 2026-05-27 (implementação dos 2 feedbacks + validação)

**Edições no `index.html`:**
- `recalibrate`: removido campo `comment` da entry de `oneRMHistory`.
- `initSuperMeta`: removido `comment:''` morto.
- Tela de treino: `<textarea id="workout-comment">` fixo antes da `.actions-bar`; `renderWorkoutScreen` restaura/persiste (`w.comment`).
- `finishWorkout`: captura `w.comment`; grava `sm.recalib = {from,to,delta,factor,estimated}` antes do saveWorkout.
- `showRecalibModal`: removido textarea; adicionada linha de compensação "estimou X · creditado Y (amortecido Z kg)".
- `showHistory`: linha de compensação por exercício + linha `📝` do comentário (escapado).
- `saveSettings`: limpado `comment:'ajuste manual'` morto.
- CSS: `.workout-comment`, `.rc-comp`. `sw.js` cache → `treino-v7`.

**Camada 1 (node):** 27/27 PASS. Inclui L9 (entry sem `comment`) e Lx3 (initSuperMeta sem `comment`).

**Camada 2 (Firefox MCP):** 14/14 PASS. Destaques verificados no estado real:
- C1: oneRM.squat 140→141,5; entry sem campo `comment`; `w.comment` salvo no treino; modal "estimou 142,5 · creditado 141,5 (amortecido 1 kg)".
- Histórico: `📝 dia 1 - agachamento voou, sem dor` + `estimou 142.5, aplicou 141.5 (×0,5)`.
- U14: history preservado (entry antiga + manuais), descida de 1RM via `allowDescent`.

**Artefato de teste (não-bug):** `fill_by_uid` do Firefox MCP concatena em `<input type=number>` (8+"15"="815"). Contornado setando `.value` + `dispatchEvent('change')` via console.

**Round-trip de sync (JSON):** `JSON.parse(JSON.stringify(Sync.snapshot()))` preserva `sm.recalib={from,to,delta,factor,estimated}` intacto, `sm` sem `comment`, `w.comment` mantido. Caminho cache→jsonbin no Android é seguro (sem campo estripado / undefined→null).

### Bugs encontrados: nenhum.
Todos os caminhos testados passaram. Reset offline NÃO falha mudo (fallback "Resetar local").

### Pendência que precisa de decisão do usuário
- **CSV não exporta a compensação.** A spec corrigida diz "compensação no treino para ser ciente"; o CSV exporta o treino mas só tem `sm_est_1rm`. Decidir: adicionar `sm_recalib_applied` + `sm_recalib_factor` ao `generateCSV`, ou deixar a compensação só no app (histórico/modal).
