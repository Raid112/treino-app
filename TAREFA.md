# Corrida — retirar bloqueio de dois intervalados

diretorio: /home/caio/treino-app (app; ajuste autorizado também no validador do KpiMaster)
rodadas_revisao: 1/2

## criterios
- [x] Retirar o bloqueio que impede dois treinos intervalados na mesma semana no treino-app.
- [ ] Ajustar o validador/publicador do KpiMaster para aceitar a exceção pontual F4 já registrada, sem apagar salvaguardas não relacionadas.
- [ ] Recuperar e publicar fielmente o plano e a exceção já registrados, sem sobrescrever dados não relacionados.
- [ ] Adicionar ou atualizar testes, executá-los e commitar as mudanças relevantes; verificar o plano publicado.

## Evidências parciais
- App aceita D1 intervalado tipado, mantendo validação de segmentos, FC e totais; cache v34. Teste RED comprovou bloqueio anterior; `node --test tests/*.test.js tests/*.test.mjs`: 22/22.
- KpiMaster: Z2 parcial de D1 passa a somar segmentos, teste RED/GREEN; 12 testes unittest passaram. Teste `test_f4_handoff_fail_closed` não executou por ausência de pytest.
- Revisão independente 1/2: sem bloqueadores ou backlog no escopo parcial. Scan estático sem achados e `git diff --check` limpo.
- Exceção F4 ainda não implementada; plano aprovado W47 não foi publicado. Review histórica continua pendente; não adulterar o handoff nem remover freios. Mapeamento A/B para D1/D2 não foi aprovado como calendário. Sem release ou deploy.

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
