# Treino Unificado

PWA de treino de força que executa o bloco de 6 semanas da DES-694, com corrida e acessórios. Single-file (`index.html`), 100% client-side, offline-first. Usado primariamente como app standalone no Android.

🔗 **App**: https://raid112.github.io/treino-app/

## Features

- **Bloco de 6 semanas (`B1-2026-09-07`)** — base em cut: força 3×/semana a RPE 8 (9 só com recuperação verde) e sem singles, corrida 3×/semana em Z2 com FC ≤ 150 e sem qualidade, deload na 4, teste de 5K na 6. O volume semanal de corrida vem do contrato gerado no KpiMaster, não deste repo.
- **Super Meta + recalibragem contínua de 1RM** — cada treino (exceto deload/teste) captura uma super meta no exercício foco; o que é levantado estima o 1RM e recalibra o valor armazenado para cima de forma contínua e amortecida (Força integral ×1,0; Potência/Hipertrofia ×0,5). Gate de readiness desativa a super meta em dia ruim (HRV baixo / sono <6h).
- **Comentário do treino** — campo livre por sessão (disponível mesmo em dia sem PR), visível no histórico.
- **Compensação visível** — quando o ganho é amortecido, o app mostra "estimou X · creditado Y · amortecido Z" no modal de PR e no histórico.
- **Readiness Garmin** — tile na home com score 1-10 + métricas (sono, HRV, body battery, ACWR) via Cloudflare Worker.
- **Plano alimentar por semana** — aba Dieta com cinco refeições, kcal e alvos de proteína/carboidrato; W1/W2 em break e W3–W6 por TDEE observado −550.
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
node tests/recalibragem.test.js   # lógica de 1RM (extrai o objeto Workout real do index.html)
```

Roteiro completo de testes (lógica / UI / sync E2E) e log em [`TESTING.md`](./TESTING.md).

## Deploy

**Front (GitHub Pages):** push na branch `master` → deploy automático (usa `.nojekyll`).

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
