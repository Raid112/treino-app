// Textos proibidos compartilhados entre o gate de navegador e seus testes.
// Durações em segundos ou minutos fracionados são válidas e não são proibidas.
export const prohibitedScreenText = [
  [/\bundefined\b|\bNaN\b|\[object Object\]/, 'texto quebrado'],
  [/Sem meta individual|por refeição não definidos/i, 'refeição sem a meta aprovada'],
  [/\bloops\/|\.md\b|\.json\b/, 'caminho de arquivo na tela'],
  [/(^|[\s·(])W\d{1,2}\b/, 'semana ISO (Wnn) em vez de S1-S6'],
];
