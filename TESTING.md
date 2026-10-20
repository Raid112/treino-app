# TESTING — treino-app (Super Meta + Recalibragem 1RM)

> Doc vivo. Atualizado a cada rodada de teste. Não fechar a sessão enquanto houver caso ❌ ou ⏳.

Última atualização: 2026-10-19
App: `index.html` (single-file, vanilla JS + localStorage)
Servidor de teste: `python3 -m http.server 8123` → `http://localhost:8123/index.html`
Ferramenta de teste: Node.js para lógica; UI Android ainda pendente.

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

---

## Bloco 1 — DES-694 (08/09/2026)

```bash
node tests/bloco1.test.js      # gate do bloco + dieta (inclui quantidades)
node tests/recalibragem.test.js # matematica de 1RM (27 checks)
```

O primeiro testa os **dados** do plano contra o Esqueleto; o segundo testa a **matemática** de 1RM. Rodar os dois antes de qualquer push — o app vai pro celular via GitHub Pages e um `WEEK_DATA[week]` undefined trava a home sem recurso offline.

### Caso que só aparece no celular

`Sync.applyRemote()` escreve o config direto no `localStorage`. Um jsonbin com `currentWeek: 14` (plano antigo de 24 semanas) reintroduz a semana inválida **depois** de qualquer migração de boot. Por isso o clamp vive em `Storage.getConfig()`, no caminho de leitura, e a home mostra de onde a semana foi realinhada. Coberto por `bloco1.test.js`, mas vale confirmar no aparelho no primeiro boot pós-deploy.

---

## Plano de dieta por semana — 08/09/2026

A home mostra o plano da semana ativa e a aba **Dieta** mostra os seis planos. W1/W2 usam diet break de 2650 kcal; W3–W6 usam `TDEE observado - 550`. As quantidades fixas aparecem explicitamente: 2 ovos + 200 g tomate + 500 ml leite; 400 g mistura + 400 g vegetais; 2 copos com 30 g de leite em pó por copo; pós com referência de 30 g whey. Pré/pós deixam os alimentos à escolha, mas fixam kcal e metas P/C. A transição W2→W3 aparece em vermelho. Sem TDEE salvo, a UI mantém a fórmula e não inventa uma estimativa. O TDEE pode ser informado em Configurações; o campo é opcional e não altera histórico, 1RM ou passphrase.

```bash
node tests/bloco1.test.js       # inclui somas, fases, fórmula e resolução de kcal
node tests/recalibragem.test.js # regressão da matemática de 1RM

git diff --check
```

Critério E2E Android: **BLOCKED** enquanto nenhum dispositivo ADB estiver conectado. A validação Node da camada de dados passou; a inspeção visual no aparelho continua separada.

---

## Alvos de corrida temporários — W41/2026

A home exibe somente durante a semana ISO 41 (05–11/10/2026) um espelho agregado do contrato vigente: volume-alvo 144,4 min e mínimo de conclusão 130 min. Como a prescrição é sem datas e não foi reconciliada com os slots diários do PWA, o card não divide o alvo por sessão/dia/zona, não calcula saldo restante e não representa execução.

A validade é verificada por data local e ano ISO, com remoção programada após a meia-noite seguinte ao domingo e nova verificação ao voltar do background. Na rodada W41, o cache do service worker era `treino-v21`; o deploy da DES-735 avança para `treino-v22`. `node tests/bloco1.test.js` cobre os números agregados, ausência de mapeamento de zona/sessão, janela, expiração e não reaparecimento em W41 de outro ano; `node tests/recalibragem.test.js` cobre regressão da lógica de força. A inspeção visual Android continua separada e pendente.

## Prescrição diária de corrida — DES-735 (15/10/2026)

- D1 (agachamento): 30 min Z2 (FC ≤ 150), conforme decisão explícita do Caio.
- D2 (terra): mantém a sessão de qualidade Z3 (FC ≤ 162).
- D4 (Long Run): permanece Z2 (FC ≤ 150), mas a duração continua pendente da review; não usar o piso `long_minimo_min` como se fosse o total Z2 semanal.
- Auditoria read-only dos artefatos vivos/históricos: a review de 05/10 prescreve 3 sessões, 158,8–166,1 min no total e 1 sessão Z3, com as demais em Z2, mas não publica o total exato de minutos Z2 nem a duração da sessão Z3. O contrato W41 contém 44,8/44,8/54,8 min com datas nulas e sem campos `zona`/`nome`; o total 144,4 também diverge da faixa da review. A review de 12/10 e o contrato W42 repetem a falta do split estruturado. Não é seguro derivar o total Z2 de `vol_alvo` nem mapear slots undated por posição.
- Integração implementada: a review registra `prescricao_corrida` como proposta tipada, o checker valida alvos/somas/zonas e um publicador separado exige aprovação explícita antes de gravar `corrida-plan.json`. O run W42 consultado não contém a proposta: há somente uma faixa de volume total de 158,8–166,1 min, sem duração exata por zona; não foram criados tempos reais nem exportado payload aprovado.
- Quando o treino em andamento é retomado, o PWA atualiza apenas os alvos de corrida do bloco B2 e persiste a migração, preservando execução registrada; mantém a exceção livre de 5K da W6 e não reinterpreta ciclos anteriores.
- `node tests/bloco1.test.js` cobre fase/semana compatíveis, rejeição do W6 5K, alvos por dia, payload sintético, timer fracionário/retomada após reload e ausência de duração observada sem entrada/timer; `node tests/recalibragem.test.js` cobre regressão de força. Os testes do service worker e do monitor Pages ficam abaixo; a inspeção visual publicada continua separada.

## DES-735 — integração review → app (publicado, 2026-10-16)

- `corrida-plan.json` local começa `pendente`, sem tempos, zonas ou totais semanais. Nenhuma prescrição real foi criada: o run W42 da review ainda não tem o split tipado/aprovado.
- Testes locais: `node tests/bloco1.test.js` — todos verdes; `node tests/recalibragem.test.js` — 27/27; `node --test tests/running-plan-loader.test.mjs` — 2/2; `node --test tests/sw-corrida-plan.test.mjs` — 4/4; `node --test tests/pages-verifier.test.mjs` — 6/6 com HTTP fixture local; `git diff --check` — limpo.
- KpiMaster: `uv run --isolated --with pytest --with garminconnect --with python-dotenv --python 3.12 python -m unittest discover -s tests -p 'test_*.py'` — 90 testes passaram. O comando direto com `python3` não encontrou `pytest`/dependências Garmin; a execução isolada com `uv` forneceu as dependências sem alterar o repo.
- Baseline Pages antes deste release: branch local/remota `master` no SHA `6c6f1a6117e2753bfe98d13ff3a818876cd0f889`; `index.html`, `sw.js` e `manifest.json` responderam HTTP 200 e eram byte-idênticos ao source; `corrida-plan.json` ainda respondeu 404. Nenhum valor de W2 foi publicado.
- Publicação: commit `8b9584effb9715d8f0ddd285acbd3d6585fd96ed` em `master`; GitHub Pages build `built` para esse SHA. `node scripts/verify-pages.mjs --attempts 18 --delay-ms 10000` passou na tentativa 6: `index.html`, `sw.js`, `manifest.json` e `corrida-plan.json` responderam HTTP 200 e ficaram byte-idênticos ao checkout. SHA-256 publicado: index `56c68ebff0daa5f0cf0202f6ccc3395fb3761744f236c1ea5bc05d75325c39df`; sw `980b763d0e8118cad88a073c023deafdf3e328b07667e0eff11f29ec0af869d2`; manifest `9bf5aa8e72e0319f77c020e31db3d35d43e105196620548115d96c7540f57d8c`; corrida-plan `e400c4a40a8f63df6187b3d76371701ccc7dd95ce47a14df5a83858bcee5e28c`.
- Limites/gates: o payload publicado permanece `pendente`, sem sessões ou minutos; a review W42 não tem `prescricao_corrida` e o contrato não tipa as zonas. Para fechar o plano, a review precisa fixar Z2 semanal e D2 Z3 exatos, com total dentro de 158,8–166,1 min; então D4 = Z2 semanal − 30 min e Caio aprova explicitamente. `adb devices -l` não listou aparelho, então refresh/worker/timer no PWA Android continua pendente. Nenhum cron foi configurado; a verificação é manual. DES-735 permanece `Fazendo`.

## LoopReview LR4-2026-10-19-1001 — rodagem 2026-10-19

- `node tests/bloco1.test.js` — exit 0 (`TODOS VERDES`).
- `node tests/recalibragem.test.js` — **27 PASS / 0 FAIL**.
- `node --test tests/running-plan-loader.test.mjs` — **4/4 PASS**; inclui regressão W43 em fase de corrida `base` enquanto W4 da força está em deload.
- `node --test tests/sw-corrida-plan.test.mjs` — **5/5 PASS**; inclui limpeza do cache v23 ao ativar `treino-v24`.
- `node --test tests/pages-verifier.test.mjs` — **6/6 PASS**; `git diff --check` — limpo.
- TDD RED/GREEN: no `HEAD` isolado, a semana 5 retornou 1.850 kcal (sem trial ativo) ante 1.600 esperado, `Workout.rpeCap('Forca', 8)` retornou 9 ante teto 8 e o helper de gate da escadinha não existia. No worktree atual, os três probes (trial até 25/10, rejeição de RPE 9 na escadinha, cap S5=8) ficaram GREEN; `bloco1.test.js` registrou 190 PASS.
- Smoke HTTP local: `scripts/verify-pages.mjs --url http://127.0.0.1:18723/ --attempts 1 --delay-ms 0` — os quatro assets (`index.html`, `sw.js`, `manifest.json`, `corrida-plan.json`) retornaram HTTP 200 e ficaram byte-idênticos ao source. Isso **não** verifica GitHub Pages público.
- `loopreview_check.py check` para LR4 — `ok: true`, sem falhas (3.996 caracteres); `DES-695` continua bloqueada, sem ser tratada como aprovação de corrida.
- A proposta humana aprovada para corrida é 4×3 min forte controlado / 2 min leve; o registro `FB-2026-10-19-1` autoriza trocar o Z3 contínuo por intervalado, informar minutos totais em Z2 e intervalos e elevar o volume sobre 143,1 min. A mensagem posterior autorizou publicar quando os gates passarem. O run LR4 ainda mantém `prescricao_corrida.status=pendente`, `sessoes=[]`, `totais=null` e contrato W43 com alvo 144,4 abaixo da faixa [158,8;166,1], sem split exato D1/D2/D4. O publicador em `--dry-run` com referências `FB-2026-10-19-1; Telegram DM reply 83317` bloqueou: `não é possível exportar prescrição pendente`; nenhum payload foi gravado.
- Verificação pública independente em `https://raid112.github.io/treino-app/` retornou HTTP 200 para os quatro assets. O público coincide byte a byte com `HEAD` (index 177.173 B/SHA-256 `56c68ebf…`, sw 2.270 B/`980b763d…`, manifest 645 B/`9bf5aa8e…`, corrida-plan 395 B/`e400c4a4…`), mas não com o worktree: index local 210.345 B/SHA-256 `748b41ed…`; sw local 2.270 B/`592ea438…`. `node scripts/verify-pages.mjs` falhou na comparação pública em 1 tentativa.
- Estado de release: sem novo commit, push ou deploy; alterações locais seguem no worktree. O workflow Pages `38924970141` está concluído com sucesso para o SHA de `HEAD` (`bf688f0c…`), mas isso não publicou as alterações não commitadas. Não instalar no Android; validação visual no aparelho continua pendente.