# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PWA de treino de força que executa o **bloco de 6 semanas** da DES-694 (`B1-2026-09-07`), com corrida e acessórios. Aplicação 100% client-side, sem dependências npm — um único arquivo HTML (~2630 linhas) com CSS e JS embutidos, hospedado no GitHub Pages. **Offline-first**: localStorage é cache + buffer; jsonbin (via Worker) é a fonte da verdade remota.

- **Repo**: `https://github.com/Raid112/treino-app.git`
- **Deploy**: GitHub Pages (usa `.nojekyll`), branch `master`, em `https://raid112.github.io/treino-app/`
- **Consumo primário**: Android (PWA standalone). Considerar isso em qualquer decisão de UX/erro.
- **Idioma da UI**: Português brasileiro

## Development

```bash
python -m http.server 8000
# ou: npx http-server

# Testes da lógica de recalibragem (puro node, sem deps):
node tests/recalibragem.test.js
```

Não há build/lint/package.json. Há testes de lógica em `tests/` e um roteiro de testes vivo em `TESTING.md`.

> **Service worker cache-first serve conteúdo velho em dev.** Use URLs com cache-bust (`?v=N`) ao testar, e bump `CACHE_NAME` em `sw.js` a cada deploy.

## Architecture

**Arquivo único (`index.html`)** contendo HTML + CSS + JS.

### Telas (navegação por tabs no bottom bar)
- `#home` — Resumo da semana (1000lb club, corrida, 1RMs), seleção de sessão, tile de Readiness, indicador de Sync
- `#history` — Histórico de treinos: por exercício mostra super meta (reps/RPE), **compensação do amortecimento** e **comentário do treino** (`📝`)
- `#workout` — Execução do treino ativo (séries, super meta, corrida, **campo de comentário** fixo no fim)
- `#settings` — 1RM (Squat/Bench/Deadlift), semana, Garmin, Sync, reset/export

### Constantes de dados
- `BLOCO_DES694` — Espelho de `loops/bloco/bloco.json` no KpiMaster (o **Esqueleto**). Estável pelas 6 semanas: `fcCap` 150, Z2, sem qualidade, piso 20 min/sessão, teto 120 min/semana, força RPE 8 (9 só com gate verde), `semSingles`.
- `WEEK_DATA` — Força das semanas 1-6. Temas reusam chaves de `EXECUTION_PROFILES` (`Forca` nas semanas base, `Deload` na 4 e na 6) **de propósito**: tema novo quebra `EXECUTION_PROFILES[w.theme].label` e faz `superMetaMode()` devolver null em silêncio. Cada semana: `p` (primário) e `sec` (secundário) com `{s, r, pct}` — RPE governa o teto, o `pct` dá a carga de partida e a recalibragem corrige pelo que foi levantado.
- `RUNNING_DATA` **não existe mais.** O volume semanal de corrida é do **Contrato** (`loops/corrida/plano.md`), gerado toda segunda por `contrato_semanal.py`. O app espelha só o guardrail por sessão (`runTargetFor`/`runLabel`) e registra o executado — dois donos para o mesmo número é como ele fica errado.
- `DAY_DEFS` — 6 dias. Tipos: `strength` (2 exercícios), `combined` (1 strength + corrida), `running`, `accessories`. Cada lift tem 1 dia como `primary` e pode aparecer como `secondary` em outro (ex: deadlift é secondary no D2, primary no D5).
- `ACCESSORIES`, `EXECUTION_PROFILES` (perfil de execução por tema: tempo concêntrico/excêntrico, RPE, descanso).
- `LIFT_NAMES`, `ZONE_INFO`, `CADENCE_TARGETS`.

### Objetos principais
- `Storage` — Camada localStorage, keys `wu_*` (`config`, `history`, `in_progress`, `active_screen`, `acc_weights`, `auth_passphrase`, `readiness`). `config.oneRM` + `config.oneRMHistory` (log de recalibragens). Migração de versão e de config antigo.
- `Workout` — Geração de treino + lógica de recalibragem (ver seção abaixo). `calcWeight()` (arredonda p/ 2.5kg), `formatBarBreakdown()`, `generateWorkout(config, dayNum)`.
- `Sync` — Camada jsonbin via Worker (ver seção abaixo).
- `App` — Controller: navegação, renderização, timers (descanso/corrida), toggle de séries, finish/cancel, modais in-app, settings, history.

### Super Meta + Recalibragem contínua de 1RM

Cada treino (exceto deload/teste) captura uma **super meta** no exercício foco. O que é levantado (peso × reps) estima o 1RM, que recalibra o 1RM armazenado para cima de forma contínua.

- `estimate1RM(weight, reps)` — Tabela de coeficientes (2 reps ÷0.95, 3 ÷0.93, 5 ÷0.87) no sweet spot; fora dela usa Epley `weight*(1+reps/30)`. Arredonda a 0.5kg.
- `recalibrate(config, lift, estimated, theme, trigger, opts)` — Monotônico (só sobe automaticamente). Fator de amortecimento: Força = 1.0 (âncora), Potência/Hipertrofia = 0.5 (ruidosos). `opts.allowDescent` (teste real / ajuste manual) permite descer. Empurra entry em `oneRMHistory` (sem comentário — rastreabilidade vive no treino).
- `superMetaMode(theme)` — Hipertrofia → `reps` (peso travado, AMRAP na última série); Forca/Potencia → `carga` (+carga na 1ª série, reps travado); demais → `null` (sem super meta).
- `rpeCap(theme)`, `initSuperMeta(theme, scheme, weight)`.
- **Gate de readiness (B+)**: HRV LOW ou sono <6h desativa a super meta no dia (`App.superMetaBlocked()`); o foco cai no input de carga real normal.
- **Fricção invertida**: o painel já vem pré-preenchido com a meta base; finalizar sem mexer registra só a meta (sem PR forçado).
- **Compensação**: ao recalibrar, `sm.recalib = {from, to, delta, factor, estimated}` é gravado no exercício do treino. Aparece no modal de PR ("estimou X · creditado Y · amortecido Z") e no histórico. **Vive no registro do treino, não na entry de 1RM.**
- **Comentário do treino**: `w.comment`, campo fixo na tela de treino (disponível mesmo em dia ruim sem PR). Exibido no histórico.

### Sync (jsonbin via Worker)

Modelo: **jsonbin = fonte da verdade remota; localStorage = espelho de leitura + buffer de escrita. Last-write-wins, sem merge.**

- `commit()` (fim de treino / settings): marca dirty + PUT. Falha mantém dirty → retenta no boot.
- `boot()`: se dirty → PUT (não puxa, p/ não perder escrita offline); senão → GET (remoto → espelho).
- `snapshot()` = `{config, history, accWeights, savedAt}`. **Não** sincroniza passphrase nem readiness.
- `resetRemote()` (PUT default) antes do clearAll, senão o boot restauraria. Reset offline NÃO falha mudo: oferece "Resetar só o local".
- Endpoint: `WORKER_URL + '/state'`, auth `Bearer <passphrase>`. Worker proxia jsonbin v3 com `X-Master-Key` (Secret `JSONBIN_KEY`) e `STATE_BIN_ID`.

### Modais in-app
`confirm()` nativo é suprimido em PWA standalone (Android). Usar `App.confirmModal(msg, {okLabel, cancelLabel, danger})` → `Promise<bool>`. Cancelar treino e Resetar dados usam isso.

### Cálculo de peso
Percentual do 1RM, arredonda a 2.5kg, exibe breakdown da barra (20kg/10kg + anilhas por lado).

### PWA
- `manifest.json` — Tema/bg `#000000`, standalone, ícones SVG.
- `sw.js` — Cache `treino-v7` (bump a cada deploy). Network-first para Google Fonts; cache-first para assets locais; **bypass network-only para o Worker** (dados dinâmicos).

### Integração Garmin (Readiness tile na home)

PWA chama um Cloudflare Worker (`garmin-cf-probe`, repo separado em `../garmin-cf-probe/`) que proxia chamadas autenticadas à Garmin Connect API **e** serve a rota `/state` (jsonbin do app). Tile na home mostra Score 1-10 + métricas (sono, HRV, body battery, ACWR).

- **Auth PWA↔Worker**: passphrase compartilhada (`Authorization: Bearer <passphrase>`), em `localStorage.wu_auth_passphrase` (modal na 1ª vez). Worker compara contra Secret `WORKER_SHARED_SECRET` em tempo constante.
- **Auth Worker↔Garmin (autônomo)**: tokens em Cloudflare KV (`TOKENS_KV`). Refresh on-demand (lazy, buffer 5min) + proativo via cron `0 9 * * *` (06h BRT). PC não participa do loop normal.
- **CORS**: Worker libera apenas `https://raid112.github.io`.
- **Graceful degradation**: 401 reabre modal; 503 distintos por causa; tile renderiza cache com borda amber + mensagem específica.
- **Throttle**: fetch máx 1x/h; `visibilitychange` atualiza ao voltar do background.
- **Fallback PC**: se refresh_token estourar (~30 dias), `init_kv.py` no repo do Worker reauth + reseed KV.

> **Setup do Sync (jsonbin)**: requer `STATE_BIN_ID` no `wrangler.toml` (não é segredo), `wrangler secret put JSONBIN_KEY`, e `wrangler deploy`. Sem isso o app roda offline-first ("Sync: offline — cache local"). O front pode ser deployado independentemente do Worker.

> **Contexto operacional**: decisões, riscos e roadmap ficam num documento privado no vault de produtividade (não neste repo). Buscar "Continuação - treino-app e HRV".

## Testing

- `tests/bloco1.test.js` — Gate do bloco: valida que `WEEK_DATA`/`DAY_DEFS` obedecem o Esqueleto (sem singles, 2-3 dias de força, 3 de corrida, `fcCap` 150, nenhum tema órfão), que `generateWorkout` roda nas 36 combinações semana×dia e que a migração de `currentWeek` do plano antigo de 24 semanas não crasha a home. **Rodar depois de tocar em `WEEK_DATA`, `DAY_DEFS` ou `BLOCO_DES694`.**
- `tests/recalibragem.test.js` — Suite node da lógica pura. Extrai o objeto `Workout` REAL do `index.html` (regex + eval) e roda casos de `estimate1RM`/`recalibrate`/`superMetaMode`/`initSuperMeta`. Rodar antes de tocar na recalibragem.
- `TESTING.md` — Roteiro de testes (camadas: lógica node / UI manual / sync E2E no Android), matriz de casos, log de execução e pendências.

## Code Conventions

- Fontes: **Cinzel** (display, `--font-display`), **EB Garamond** (body, `--font-body`) — serif clássico.
- Estética: **preto com prata/ouro metálico** + glassmorphism. As variáveis CSS mantêm nomes legados `--neon-*` mas com valores remapeados: prata `#d6dbe2`, ouro `#e0b441`/`#ffce54`, esmeralda `#4fd1a5`, rubi `#d9533b`. Fundo `#000000`.
- Cada dia de treino tem cor temática com glow correspondente.
- Tela de workout preserva estado em `in_progress` (incl. super meta e comentário) para recuperar após reload.
- **Todo error path renderiza placeholder visível com a causa — nunca falha mudo** (é PWA mobile com cache).
- Commits pequenos e temáticos, mensagens em PT. Testar no localhost antes de pushar.

## Relação com o KpiMaster (DES-694)

Este app é a **superfície de execução** do bloco, não o dono do plano.

| Camada | Dono | Onde vive | Cadência |
|---|---|---|---|
| Esqueleto | Caio | `loops/bloco/bloco.json` (espelhado em `BLOCO_DES694`) | 6 semanas |
| Contrato (corrida) | `contrato_semanal.py` | `loops/corrida/plano.md` | toda segunda |
| Contrato (força) | **este app** | `WEEK_DATA` | estático no bloco |
| Ledger | append-only | `loops/ledger/intervencoes.jsonl` | por evento |

Força é estática aqui porque o gerador não escreve em `loops/forca/` até a Fase 4 — não há dono concorrente. Corrida é o contrário: qualquer minuto de volume semanal hardcodado aqui fica velho na segunda seguinte.

> **Read-back do contrato ainda não existe.** Precisaria de uma rota `/contrato` no Worker `garmin-cf-probe`, cujo repo não está na VM. Até lá o app mostra o guardrail por sessão e o volume da semana se lê no `plano.md`.
