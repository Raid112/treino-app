# DES-775 — Retirar aviso de mudança de bloco

diretorio: /home/caio/treino-app
rodadas_revisao: 2/2

## criterios
- [x] Não exibir o aviso de que o bloco B2-2026-09-28 encerrou na semana 6 e o B3-2026-11-09 inicia na semana 1.
- [x] Retirar a exibição de FC ≤162 do resumo do cartão de treino apresentado pelo Caio, preservando zona, duração e lógica da prescrição.
- [x] Retirar somente a confirmação mostrada ao cancelar treino; acionar o cancelamento diretamente, mantendo as demais confirmações.
- [x] Retirar o D6 de acessórios do plano de treinos apresentado no app, sem redistribuir exercícios nem apagar histórico de treinos anteriores.
- [x] Adicionar dieta de fim de semana: café com 20 g de aveia, 100 g banana, 2 ovos e 20 g leite condensado; almoço e jantar cada com 284 g de peito de frango cozido sem pele/osso e 284 g de cabotiá cozida, sem óleo. Exibir valores aproximados 1.600 kcal, 205 g proteína, 112 g carbo e 35 g gordura; Caio aprovou gordura abaixo de 60 g neste plano.
- [x] Atualizar o contrato canônico da dieta para registrar exceção de gordura no plano de fim de semana: refeição livre pode elevar gordura e calorias; não presumir quantidade ingerida. Preservar regras dos demais dias e alterações preexistentes.
- [x] Preservar o funcionamento da troca de bloco, a semana correta, dados e histórico; não alterar a lógica de migração apenas para ocultar o aviso.
- [x] Adicionar ou atualizar testes e executar testes pertinentes.
- [x] Commitar a mudança; o responsável principal executará scripts/release.sh para publicação.

## Fora desta etapa
- Alterações da dieta dos dias úteis aguardam cálculo e confirmação das quantidades.
- DES-735 e eventual correção da semana permanecem fora desta etapa.

## backlog
- Nenhum.

## Ledger de revisão
- Rodada 1: revisor classificou como bloqueio o descarte do treino em andamento ao cancelar diretamente. Triagem: comportamento já existente do cancelamento, que agora é executado diretamente por critério explícito; a perda de dados não salvos ao cancelar é consequência inerente ao pedido, não regressão adicional. Risco comunicado; demais confirmações preservadas. Nenhum bloqueio restante.
- Testes: todos tests/*.test.js e 15/15 tests/*.test.mjs passaram; diff --check e scan estático limpos. Teste novo de dieta observado falhar antes de implementar.
- Contrato externo alterado localmente; não commitado, pois a versão ativa inteira preexistia apenas no working tree e não pode ser isolada no HEAD sem incluir alterações alheias.
- Commit do app: d17d9b1092c09cca733674a8211174465e97fcd2.
- Gate Actions 42903747678 falhou no smoke S1–S6: o seletor contava o novo bloco de fim de semana como refeição de dia útil. Falha reproduzida localmente; seletor corrigido para as refeições de dias úteis e verificação do plano de fim de semana adicionada.
- Rodada 2: revisão independente do ajuste do smoke, sem bloqueios ou backlog. Smoke Chromium passou nas seis semanas; todos os 7 testes .js e os 15 testes .mjs passaram; diff --check e scan estático limpos. Sem push ou deploy nesta correção.
