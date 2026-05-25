# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PWA de treino de força com periodização linear de 24 semanas, incluindo corrida e acessórios. Aplicação 100% client-side, sem dependências npm — um único arquivo HTML (~1789 linhas) com CSS e JS embutidos, hospedado no GitHub Pages.

- **Repo**: `https://github.com/Raid112/treino-app.git`
- **Deploy**: GitHub Pages (usa `.nojekyll`)
- **Idioma da UI**: Português brasileiro

## Development

```bash
python -m http.server 8000
# ou: npx http-server
```

Não há build, lint, testes ou package.json.

## Architecture

**Arquivo único (`index.html`)** contendo HTML + CSS + JS.

### Telas (navegação por tabs no bottom bar)
- `#home` — Resumo da semana (metas 1K/5K, sessões disponíveis), seleção de sessão
- `#history` — Histórico de treinos completos
- `#workout` — Execução do treino ativo (séries, pesos, timer, corrida)
- `#settings` — Configuração de 1RM (Squat/Bench/Deadlift), semana atual, reset/export

### Constantes de dados
- `WEEK_DATA` — Periodização semanas 1-24: blocos (Adaptação→Intensificação→Peaking→Deload), percentuais 1RM, séries/reps para primário e secundário
- `RUNNING_DATA` — Plano de corrida por semana: minutos por tipo (easy/tempo/long/intervals), meta total
- `DAY_DEFS` — 6 dias de treino: tipo (strength/hybrid/run/accessories), exercícios, cor do tema (cyan/green/purple/amber)
- `ACCESSORIES` — Lista de exercícios acessórios com séries/reps
- `EXECUTION_PROFILES` — Perfis de execução por tema (velocidade concêntrica/excêntrica, pausa, RPE)

### Objetos principais
- `Storage` — Camada localStorage com keys prefixadas `wu_*` (config, workouts, in_progress, active_screen, acc_weights). Inclui migração de versão.
- `Workout` — Lógica de geração de treino: `calcWeight()` (arredonda para barra+anilhas), `formatBarBreakdown()` (mostra montagem da barra), `generate()` (cria treino do dia)
- `Export` — Exportação CSV de histórico
- `App` — Controller principal: navegação, renderização, timers (descanso + corrida), toggle de séries, finish/cancel

### Timer system
- **Rest timer**: countdown com círculo SVG animado, som de notificação ao completar
- **Run timer**: countup com progresso visual, registra tempo real vs planejado

### Cálculo de peso
- Baseado em percentual do 1RM configurado
- Arredonda para incrementos de 2.5kg
- Exibe breakdown da barra (barra 20kg + anilhas de cada lado)

### PWA
- `manifest.json` — Tema `#06060e`, standalone, ícones SVG
- `sw.js` — Cache `treino-v3`, híbrido: network-first para Google Fonts, cache-first para assets locais, **bypass network-only para o Worker `garmin-cf-probe`** (dados dinâmicos não cacheiam)

### Integração Garmin (Readiness tile na home)

PWA chama um Cloudflare Worker (`garmin-cf-probe`, repo separado em `../garmin-cf-probe/`) que proxia chamadas autenticadas à Garmin Connect API. Tile na home mostra Score 1-10 + métricas (sono, HRV, body battery, ACWR).

- **Auth PWA↔Worker**: passphrase compartilhada (`Authorization: Bearer <passphrase>`), armazenada em `localStorage.wu_auth_passphrase` (modal pede na primeira vez). Worker compara contra Secret `WORKER_SHARED_SECRET` em tempo constante.
- **Auth Worker↔Garmin (Phase 8 — autônomo)**: tokens (`di_token`, `di_refresh_token`, `di_client_id`, `expires_at`) vivem em Cloudflare KV (binding `TOKENS_KV`). Worker faz refresh on-demand (lazy, buffer 5min) E proativo via cron `0 9 * * *` (06h BRT) chamando `https://diauth.garmin.com/di-oauth2-service/oauth/token`. PC não participa do loop normal.
- **CORS**: Worker libera apenas `https://raid112.github.io`.
- **Graceful degradation**: 401 reabre modal; 503 distintos por causa — `refresh_token_dead` (reauth no PC necessária), `kv_empty` (init no PC), genérico (token transient/upstream); tile renderiza cache com borda amber + mensagem específica.
- **Throttle**: fetch máximo 1x/h. Listener `visibilitychange` atualiza ao voltar do background.
- **Fallback PC**: se refresh_token estourar (~30 dias), `init_kv.py` no repo do Worker reauth + reseed KV. PC só precisa rodar isso 1x/mês ou menos.

> **Contexto operacional**: detalhes de decisão, riscos, alternativas avaliadas (C1/C2/C3/C4/C6) e roadmap pós-MVP ficam num documento privado no vault de produtividade (não neste repo). Buscar pelo título "Continuação - treino-app e HRV" no vault.

## Code Conventions

- Fontes: Orbitron (display), Outfit (body)
- Estética neon/cyberpunk com glassmorphism: cyan, purple, magenta, amber, green
- CSS custom properties extensivas (`--neon-cyan`, `--glow-purple`, `--glass-bg`, etc.)
- Cada dia de treino tem cor temática (cyan/green/purple/amber) com glow correspondente
- Radial gradients no body::before para efeito de iluminação ambiente
- Tela de workout preserva estado em `in_progress` para recuperar após reload
