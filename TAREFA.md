# DES-775 — Ajustes de interface da dieta

diretorio: /home/caio/treino-app
rodadas_revisao: 2/2

## criterios
- [x] Remover o parágrafo longo de descrição da dieta mostrado pelo Caio, preservando as demais informações não solicitadas para remoção.
- [x] Retirar a mensagem incorreta que manda manter 30 minutos semanais de Z2 em bicicleta/ergométrica fora do volume de corrida.
- [x] Exibir a dieta apenas na aba Dieta, não na aba Treino.
- [x] Exibir a dieta uma única vez, sem repetição para as seis semanas.
- [x] Adicionar ou atualizar testes automatizados para as mudanças e rodar os testes pertinentes.
- [x] Fazer commits separados por mudança, conforme viável, sem incluir alterações alheias.

## Fora desta etapa
- Cálculo e alteração das refeições e dieta de fim de semana aguardam definição de quantidades.
- Semana do bloco e DES-735 exigem diagnóstico e escopo próprio; não apagar histórico nem dados.
- Deploy será executado pelo responsável principal via scripts/release.sh após revisão.

## backlog
- Nenhum.

## Ledger de revisão
- Rodada 1: revisor apontou ocultação do parágrafo alvo e remoção genérica de mudanças semanais. O parágrafo inteiro é o objeto explícito da remoção; seus dados permanecem intactos no plano. A remoção genérica de mudanças foi corrigida para filtrar apenas a mensagem de bicicleta, com teste de preservação de outras mudanças.
- Rodada 2: revisor mantém BLOQUEIA sobre ocultar o parágrafo inteiro por possível perda de informações visíveis. Implementador entende que o parágrafo inteiro era o alvo pedido, mas há divergência; decisão fica com o responsável. Limite 2/2 atingido; sem commits nem deploy.
- Testes: bloco1, bloco3 e recalibragem passaram; 15/15 testes .mjs passaram; diff --check limpo. Smoke de navegador indisponível: Playwright não instalado; Chromium local sem libatk-1.0.so.0.
- Decisão posterior do Caio: aprovada a remoção integral do parágrafo, inclusive a opção futura; divergência da rodada 2 encerrada, sem nova revisão.
- Verificação posterior: testes bloco1, bloco3, recalibragem e 15/15 .mjs passaram; diff --check limpo. Smoke de navegador continua pendente: falta playwright-core (e a tentativa anterior encontrou Chromium sem libatk-1.0.so.0).
- Commit e961458 reúne a mudança de interface, testes correlatos e invalidação de cache como unidade coesa; este checklist fica em commit separado. Sem push ou deploy nesta etapa.
