export const initialServices = [
  { id: 'antt', name: 'ANTT', category: 'Transporte / ANTT', status: 'down', since: '12:31', checked: '12:58', message: 'Possível indisponibilidade', reports: 7, detail: 'Falhas consecutivas de comunicação identificadas pelo monitoramento.', checks: ['Timeout', 'Timeout', 'HTTP 503', 'HTTP 200', 'HTTP 200'] },
  { id: 'sefaz-sp', name: 'SEFAZ SP', category: 'Documentos fiscais', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'sefaz-mg', name: 'SEFAZ MG', category: 'Documentos fiscais', status: 'operational', checked: '12:57', reports: 0 },
  { id: 'sefaz-pr', name: 'SEFAZ PR', category: 'Documentos fiscais', status: 'unstable', since: '12:21', checked: '12:58', message: 'Lentidão nas consultas', reports: 2, detail: 'Tempo de resposta acima do esperado.', checks: ['HTTP 200 · 8,2 s', 'HTTP 200 · 7,9 s', 'HTTP 200 · 6,8 s'] },
  { id: 'sefaz-sc', name: 'SEFAZ SC', category: 'Documentos fiscais', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'sefaz-rs', name: 'SEFAZ RS', category: 'Documentos fiscais', status: 'operational', checked: '12:57', reports: 0 },
  { id: 'sefaz-go', name: 'SEFAZ GO', category: 'Documentos fiscais', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'sefaz-rj', name: 'SEFAZ RJ', category: 'Documentos fiscais', status: 'unmonitored', checked: '—', reports: 0 },
  { id: 'sefaz-ba', name: 'SEFAZ BA', category: 'Documentos fiscais', status: 'operational', checked: '12:56', reports: 0 },
  { id: 'ciot', name: 'CIOT', category: 'Transporte / ANTT', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'rntrc', name: 'RNTRC', category: 'Transporte / ANTT', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'vale-pedagio', name: 'Vale-Pedágio', category: 'Transporte / ANTT', status: 'maintenance', since: '11:00', checked: '12:58', message: 'Manutenção programada', reports: 0 },
  { id: 'sem-parar', name: 'Sem Parar', category: 'Meios de pagamento / pedágio', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'veloe', name: 'Veloe', category: 'Meios de pagamento / pedágio', status: 'unstable', since: '12:40', checked: '12:58', message: 'Possível instabilidade baseada em relatos', reports: 4 },
  { id: 'conectcar', name: 'ConectCar', category: 'Meios de pagamento / pedágio', status: 'operational', checked: '12:58', reports: 0 },
  { id: 'ticket-log', name: 'Ticket Log', category: 'Meios de pagamento / pedágio', status: 'unmonitored', checked: '—', reports: 0 },
  { id: 'edenred', name: 'Edenred', category: 'Meios de pagamento / pedágio', status: 'operational', checked: '12:57', reports: 0 },
  { id: 'qualp', name: 'Qualp', category: 'Meios de pagamento / pedágio', status: 'operational', checked: '12:58', reports: 0 }
]

export const statusMeta = {
  operational: { label: 'Operacional', short: 'Operacionais', icon: '●' },
  unstable: { label: 'Instabilidade', short: 'Instáveis', icon: '▲' },
  down: { label: 'Indisponível', short: 'Indisponíveis', icon: '●' },
  maintenance: { label: 'Em manutenção', short: 'Manutenção', icon: '◆' },
  unmonitored: { label: 'Sem monitoramento', short: 'Sem monitoramento', icon: '○' }
}
