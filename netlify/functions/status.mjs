const UF_LIST = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"]
];

const NFE_AVAILABILITY_URL = "https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx?AspxAutoDetectCookieSupport=1&tipoC=&versao=0.00";
const NFE_WEBSERVICES_URL = "https://www.nfe.fazenda.gov.br/portal/webservices.aspx?AspxAutoDetectCookieSupport=1";

function service(name, category, extra = {}) {
  return {
    id: extra.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name,
    category,
    state: extra.state || null,
    status: "sem_dados",
    last_check: null,
    official_url: extra.official_url || null,
    monitoring_url: extra.monitoring_url || "",
    monitoring_enabled: false,
    description: extra.description || "Aguardando consulta da fonte oficial.",
    incident_description: "",
    affected_services: []
  };
}

async function sourceHealth() {
  try {
    const response = await fetch(NFE_AVAILABILITY_URL, {
      headers: { "user-agent": "LogisticaStatus/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    return { reachable: response.ok, checkedAt: new Date().toISOString() };
  } catch {
    return { reachable: false, checkedAt: new Date().toISOString() };
  }
}

export default async () => {
  const availability = await sourceHealth();
  const services = UF_LIST.map(([state, label]) => service(`SEFAZ ${state}`, "fiscal", {
    id: `sefaz-${state.toLowerCase()}`,
    state,
    official_url: NFE_WEBSERVICES_URL,
    monitoring_url: NFE_AVAILABILITY_URL,
    description: `Disponibilidade da NF-e para ${label}. A situação é exibida somente após confirmação na fonte oficial.`
  }));

  services.push(
    service("Portal Nacional NF-e", "fiscal", { official_url: NFE_AVAILABILITY_URL, monitoring_url: NFE_AVAILABILITY_URL, description: "Visão oficial de disponibilidade dos webservices da NF-e." }),
    service("CT-e", "fiscal", { official_url: "https://www.cte.fazenda.gov.br/", description: "Portal Nacional do Conhecimento de Transporte Eletrônico." }),
    service("MDF-e", "fiscal", { official_url: "https://www.mdfe.fazenda.gov.br/", description: "Portal Nacional do Manifesto Eletrônico de Documentos Fiscais." }),
    service("ANTT / RNTRC", "antt", { official_url: "https://dados.antt.gov.br/dataset/registro-nacional-de-transportadores-rodoviarios-de-cargas-rntrc", description: "Dados abertos oficiais da ANTT; não há status operacional público consolidado." }),
    service("Pix", "pagamentos", { official_url: "https://www.bcb.gov.br/estabilidadefinanceira/pix", description: "Fonte institucional do Banco Central; não há um status público único para todos os participantes." })
  );

  return Response.json({
    timestamp: new Date().toISOString(),
    dataSource: "OFFICIAL_SOURCES",
    sourceHealth: availability,
    services,
    history: [],
    reports: [],
    thresholds: { yellow: 5, red: 15 }
  }, { headers: { "cache-control": "public, max-age=60" } });
};
