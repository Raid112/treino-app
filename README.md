# Treino Unificado

PWA de treino de força que executa o bloco de 6 semanas da DES-694, com corrida e acessórios. Single-file (`index.html`), 100% client-side, offline-first. Usado primariamente como app standalone no Android.

🔗 **App**: https://raid112.github.io/treino-app/

## Features

- **Bloco de 6 semanas (`B2-2026-09-28`)** — reset do `B1-2026-09-07` (mudança grande de estratégia reinicia o bloco na semana 1): S1 hipertrofia, S2/S3 força com top sets, S4 deload, S5 após o deload com escadinha somente no agachamento primário (5@RPE6 → 4@RPE7 → 3@RPE8, 12 reps totais, sem volume extra) e top sets de bench/terra em RPE8, S6 taper + teste de 5K. A escadinha limita cada carga à última carga registrada em semana regular do ciclo (deload excluído) e interrompe com dor no joelho ≥3/10 ou RPE acima do teto 8. Corrida 3×/semana (1 de qualidade em Z3 FC ≤ 162, as demais Z2 FC ≤ 150). A prescrição diária é lida de `corrida-plan.json` somente quando aprovada explicitamente e aplicável à semana ISO/bloco; a fase de corrida é validada independentemente do deload de força. Arquivo pendente, inválido ou antigo não alimenta timers, e D4 fica sem duração. A transição de bloco é automática: `Storage.getConfig()` detecta o cycleId do bloco anterior e reinicia em W1 preservando 1RM e histórico.
- **Contrato de corrida fail-closed** — `corrida-plan.json` começa `pendente` sem alvos. O consumidor valida aprovação, proveniência, semana ISO, bloco, fase de corrida independentemente do deload de força, papéis, zonas, FC caps e totais; recusa planos na semana do teste 5K e usa só a semana atual. Offline, o service worker oferece o cache e o app só o aceita se ainda for válido para a semana/bloco; ausente, inválido ou expirado cai nos guardrails sem timer inventado.
- **Top sets e escadinha de força** — S2/S3 mantêm top sets nos lifts primary; S5 troca somente o top set/agachamento principal por 5@RPE6 → 4@RPE7 → 3@RPE8, mantendo os top sets de bench/terra em RPE8. A escadinha não adiciona reps/volume, não eleva a carga acima da última carga registrada em semana regular (deload excluído) e para com dor no joelho ≥3/10 ou RPE acima de 8.
- **Super Meta + recalibragem contínua de 1RM** — cada treino (exceto deload/teste) captura uma super meta no exercício foco; o que é levantado estima o 1RM e recalibra o valor armazenado para cima de forma contínua e amortecida (Força integral ×1,0; Potência/Hipertrofia ×0,5). Gate de readiness desativa a super meta em dia ruim (HRV baixo / sono <6h).
- **Comentário do treino** — campo livre por sessão (disponível mesmo em dia sem PR), visível no histórico.
- **Compensação visível** — quando o ganho é amortecido, o app mostra "estimou X · creditado Y · amortecido Z" no modal de PR e no histórico.
- **Readiness Garmin** — tile na home com score 1-10 + métricas (sono, HRV, body battery, ACWR) via Cloudflare Worker.
- **Plano alimentar por semana** — aba Dieta preserva o contrato-base v9d de 1.700 kcal/dia fora do teste temporário aprovado de 1.600 kcal/dia (19–25/10/2026). No teste, mantém o café da manhã já registrado, ajusta almoço para 350 g de carne/mistura + 400 g de vegetais, inclui café + 200 ml de leite Italac semidesnatado e alvos aproximados de 30 g P + 10 g C no pré e no pós. A composição da mistura e os alimentos/porções da noite seguem desconhecidos; kcal e macros diários são aproximados, sem inventar rateio ou cardápio. A divergência de aproximadamente 20 kcal é a informada na proposta por refeição aprovada e não é recalculada pelo app. Após a janela, volta ao alvo-base.
- **Sync offline-first** — jsonbin (via Worker) é a fonte da verdade remota; localStorage é cache + buffer com fila. Funciona offline; sincroniza ao voltar online.
- **PWA** — instalável, standalone, service worker com cache.

## Rodar localmente

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

Sem build, sem npm. O service worker é cache-first — em dev, use `?v=N` na URL e bump `CACHE_NAME` em `sw.js`.

## Testes

```bash
node tests/bloco1.test.js         # dados do bloco ativo (WEEK_DATA/DAY_DEFS/top sets/transição de bloco)
node tests/recalibragem.test.js   # lógica de 1RM (extrai o objeto Workout real do index.html)
node --test tests/running-plan-loader.test.mjs # validação do contrato, W43 base e deload de força independente
node --test tests/sw-corrida-plan.test.mjs # cache, offline e ativação do service worker
node --test tests/pages-verifier.test.mjs  # compara assets publicados com o source (fixture local)
```

Roteiro completo de testes (lógica / UI / sync E2E) e log em [`TESTING.md`](./TESTING.md).

## Deploy

**Front (GitHub Pages):** push na branch `master` → deploy automático (usa `.nojekyll`).

**Verificação pós-publicação:** rode `node scripts/verify-pages.mjs` manualmente após o push. O verificador exige HTTP 200 e bytes iguais para `index.html`, `sw.js`, `manifest.json` e `corrida-plan.json`; não há execução periódica configurada. Isso verifica Pages, não substitui validação visual no Android.

```bash
node --test tests/pages-verifier.test.mjs
```

Smoke local (servidor e verificador em terminais separados):

```bash
# Terminal 1
python3 -m http.server 8000
```

```bash
# Terminal 2, na raiz do repo
node scripts/verify-pages.mjs --url http://127.0.0.1:8000/ --attempts 1 --delay-ms 0
```

**Worker + Sync (jsonbin):** o sync remoto depende do Worker `garmin-cf-probe` (repo separado) configurado:

```bash
# no repo do Worker:
# 1. STATE_BIN_ID no wrangler.toml (id do bin jsonbin — não é segredo)
# 2. wrangler secret put JSONBIN_KEY   (Master Key do jsonbin)
# 3. wrangler deploy
```

Sem o Worker configurado, o app roda offline-first ("Sync: offline — cache local").

## Arquitetura

Detalhes técnicos (objetos `Storage`/`Workout`/`Sync`/`App`, lógica de recalibragem, integração Garmin, convenções) em [`CLAUDE.md`](./CLAUDE.md).

## Stack visual

Preto com prata/ouro metálico + glassmorphism. Fontes Cinzel (display) e EB Garamond (body).
