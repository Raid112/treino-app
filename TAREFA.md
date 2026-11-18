# Corrida — remover verificador de divergência do plano

diretorio: /home/caio/treino-app (com ajuste autorizado no KpiMaster)
rodadas_revisao: 1/2

## criterios
- [ ] Remover a verificação que impede publicar o plano aprovado por divergência de volume/intervalados com o contrato anterior; preservar validações estruturais e dados não relacionados.
- [ ] Publicar fielmente o plano aprovado: A 35 min no agachamento, B 44 min no terra, longão 66 min Z2; não fabricar dados de recuperação ou decisão de freios.
- [ ] Testar, commitar e verificar os dados publicados. O release do treino-app é exclusivo do agente principal.

## backlog
- Nenhum.

## Evidências parciais
- Autorização real de Caio em 17/11: “PUBLICA ja conversamos sobre isso aplique o treino aprovado e fim”; autorizou retirar o verificador de divergência. Registrada em KpiMaster `loops/review/retificacoes/2026-W47-corrida-autorizacao-publicacao.md`.
- Removidas as comparações F4 de volume/distribuição com o contrato anterior; teste RED/GREEN, revisão independente 1/2 sem bloqueadores. Permanecem as demais salvaguardas, inclusive veto de qualidade e exigência de atribuição F4/freios independentes.
- Proposta tipada 35/44/66, 145 total, 131 Z2 e 14 forte em KpiMaster `loops/review/retificacoes/2026-W47-corrida-proposta-caio.json`. Publisher dry-run com prep real e proposta bloqueou por veto de qualidade/F4/deload: handoff não atesta atribuição do veto nem freios independentes. Sem inferir que o histórico de cansaço por si só proíba publicação, nem inventar estado clínico. Plano W47 ainda não publicado; release não executado.
- KpiMaster 17 testes unittest OK; app 22 testes Node OK. Uma tentativa com nome incorreto de módulo unittest teve erro de importação, corrigido na execução dos módulos existentes. `git diff --check` sem erros.

---
# Corrida — retirar bloqueio de dois intervalados

diretorio: /home/caio/treino-app (app; ajuste autorizado também no validador do KpiMaster)
rodadas_revisao: 2/2

## criterios
- [x] Retirar o bloqueio que impede dois treinos intervalados na mesma semana no treino-app.
- [ ] Ajustar o validador/publicador do KpiMaster para aceitar a exceção pontual F4 já registrada, sem apagar salvaguardas não relacionadas.
- [ ] Recuperar e publicar fielmente o plano e a exceção já registrados, sem sobrescrever dados não relacionados.
- [ ] Adicionar ou atualizar testes, executá-los e commitar as mudanças relevantes; verificar o plano publicado.

## Evidências parciais
- App aceita D1 intervalado tipado, mantendo validação de segmentos, FC e totais; cache v34. Teste RED comprovou bloqueio anterior; `node --test tests/*.test.js tests/*.test.mjs`: 22/22.
- KpiMaster: Z2 parcial de D1 passa a somar segmentos, teste RED/GREEN; 12 testes unittest passaram. Teste `test_f4_handoff_fail_closed` não executou por ausência de pytest.
- Revisão independente 1/2: sem bloqueadores ou backlog no escopo parcial. Scan estático sem achados e `git diff --check` limpo.
- Caio confirmou A no agachamento (D1), B no terra (D2) e longão D4; sem datas de calendário. Handoff fiel em `KpiMaster/loops/review/retificacoes/2026-W47-corrida-handoff-excecao-f4.md`.
- Revisão 2/2 identificou que veto agregado pode incluir outros freios. Código agora exige atribuição explícita a F4 e avaliação independente, além de dose exata e aprovação pontual; correção testada, sem terceira revisão. Handoff histórico não contém essas atestações, que não foram inventadas; publicação bloqueada. A revisão não comprovou liberação de freios reais.
- KpiMaster: 23 testes unittest OK; app: 22 testes Node OK; `git diff --check` limpo. Publisher real em `--dry-run` bloqueou proposta histórica pendente. Pytest indisponível; teste Android não executado. App v34 publicado pelo principal; plano W47 não publicado nem release executado nesta etapa.

## backlog
- Nenhum.

---
# Tarefa anterior: Dieta — interface enxuta e fim de semana separado

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
