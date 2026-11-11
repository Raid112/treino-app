# Dieta — interface enxuta e fim de semana separado

diretorio: /home/caio/treino-app
rodadas_revisao: 1/2

## criterios
- [x] Reduzir drasticamente o texto da interface de dieta e retirar disclaimers, mantendo o essencial.
- [x] Destacar o fim de semana em quadrado separado dos dias úteis.
- [x] Preservar plano, porções, funcionalidade e dados; não alterar contrato nutricional nem outras áreas.
- [x] Adicionar/atualizar testes, executá-los, revisar e commitar neste diretório.
- [x] Sem release; validação visual será feita pessoalmente por Caio.

## backlog
- Nenhum.

## Evidências
- Renderer vigente: dois cartões irmãos, com metas, refeições, porções, orientação pré/pós e refeição livre; avisos removidos apenas da apresentação. Dados da dieta e contrato externo preservados. Plano histórico segue acessível.
- Teste RED: `node --test tests/diet-weekend.test.js` falhou pela presença dos disclaimers; passou após alteração.
- `node --test tests/*.test.js tests/*.test.mjs`: 22/22 passaram. `git diff --check`: limpo. Scan estático de credenciais, shell inseguro e eval/exec: nenhum achado.
- Revisão independente: passou, sem BLOQUEIA ou BACKLOG.
- Smoke de navegador não executou: faltam Playwright e Chromium locais. Testes de renderer e service worker passaram; inspeção visual pessoal de Caio permanece pendente. Sem release, push ou deploy.
- Cache do PWA atualizado para v33, com teste de invalidação; versão visível sincronizada.
