// Padrão compartilhado entre o gate de navegador e seu teste de regressão.
// 0,5 min = 30 segundos, duração expressamente aprovada; outras frações continuam proibidas.
export const fractionalMinutePattern = /(?<![\d.,])(?!(?:0[.,]5) ?min\b)\d+[.,]\d+ ?min\b/i;
