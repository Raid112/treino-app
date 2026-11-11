# DES-775 — Dieta dos dias úteis

diretorio: /home/caio/treino-app
rodadas_revisao: 2/2

## criterios
- [x] Retirar o café da manhã da dieta dos dias úteis; preservar a dieta de fim de semana aprovada.
- [x] Definir pré e pós-treino com pão e frango cozido; calcular quantidades de acordo com o plano e alimentos restantes para aproximar a dieta dos dias úteis de 1.600 kcal; apresentar proposta ao Caio caso os pisos de proteína e gordura não sejam comprovados. Caio autorizou expressamente seguir mesmo com essa ressalva.
- [x] Atualizar a apresentação da dieta e dados correspondentes, sem alterar histórico ou outros planos.
- [x] Criar ou atualizar testes e executá-los; revisar conforme metodologia, até 2 rodadas.
- [x] Commitar as alterações próprias sem incluir modificações alheias. Publicação será feita pelo responsável principal via scripts/release.sh.
- [x] Verificar se a alteração aprovada da exceção de gordura no contrato externo pode ser commitada e publicada sem incorporar alterações anteriores de terceiros; caso não seja possível, preservar e explicar bloqueio.

## backlog
- Nenhum.

## Evidências desta etapa
- Contrato externo: `loops/dieta/contrato.md` é rastreado e contém alterações anteriores não commitadas. A exceção depende do contrato vigente, também não commitado; não foi possível isolá-la com segurança sem incorporar conteúdo preexistente. Nenhuma alteração externa foi commitada ou publicada.
- Testes sem navegador: todos os `tests/*.test.js` e os 15 testes `tests/*.test.mjs` passaram em 10/11/2026.
- Rodada 1: revisão independente identificou como pendência comprovar a aprovação explícita do plano e a reconciliação da estimativa ≈1.605 kcal com as refeições exibidas, incluindo pisos não comprovados. Verificar também a preservação do plano de fim de semana; a revisão não examinou a aprovação na conversa original. Sem validação visual ou release nesta etapa.
- A tarefa e o ledger anteriores permanecem no histórico Git, em `HEAD:TAREFA.md` no commit `2bf1205`; a substituição local preexistia a esta revisão e não foi descartada.
- Aprovação expressa informada pelo responsável em 10/11/2026: perguntado sobre seguir o plano sem café da manhã, pipoca de 30 g e ≈1.605 kcal apesar dos pisos não comprovados, Caio respondeu: “isso. retirei o cafe da manha e pretendo seguir assim”. A aprovação não comprova consumo nem atendimento dos pisos.
- Conta reproduzida: 350 g mistura genérica 710,5 + 400 g vegetal genérico 101,6 + leite 200 ml 80 + frango cozido 200 g 306 + 2 pães 300 + milho cru 30 g 106,5 = **1.604,6 kcal** (≈1.605). Mistura, vegetais e pão: snapshot `nutrition.py`, Alimentos!A9, A21, A35; leite: rótulo já registrado no app; frango e milho: TBCA BRC0195F e BRC0005A (153 e 355 kcal/100 g). Pão por unidade da tabela, peso real não especificado; mistura e preparo variam. Macros da tabela sem unidade documentada: não comprovam os pisos de 205 g proteína e 60 g gordura.
- Rodada 2: auditoria independente apontou risco de a ativação por data mudar o fim de semana. Triagem no renderer: ele exibe simultaneamente seções rotuladas “Dias úteis” e “Fim de semana”; a data altera apenas os dados de dias úteis, não seleciona o plano do dia. Novo teste compara a seção inteira antes/depois e também sábado e domingo (14–15/11) e verifica ambas as seções. Sem bloqueio remanescente nesta triagem.
- Verificação final não visual: `node --test tests/*.test.js tests/*.test.mjs` passou 22/22; `git diff --check` limpo. Sem release, push ou validação visual.
