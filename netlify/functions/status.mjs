const SOURCES = [
  { id: "nfe", name: "Portal de disponibilidade NF-e", url: "https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=P2c98tUpxrI%3D&versao=0.00", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade dos web services NF-e." },
  { id: "cte", name: "Portal de disponibilidade CT-e", url: "https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx?versao=1.00&tipoConteudo=XbSeqxE8pl8=", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade CT-e." },
  { id: "mdfe", name: "Portal MDF-e", url: "https://dfe-portal.svrs.rs.gov.br/MDFE/Disponibilidade", category: "Documentos fiscais", scope: "Portal oficial; não publica um status consolidado nesta consulta." },
  { id: "antt", name: "ANTT / RNTRC", url: "https://consultapublica.antt.gov.br/", category: "Transporte / ANTT", scope: "Consulta pública de transportadores; não equivale a status operacional do serviço." },
  { id: "vale-pedagio", name: "Vale-pedágio", url: "https://www.gov.br/antt/pt-br/assuntos/cargas/vale-pedagio-obrigatorio", category: "Transporte / ANTT", scope: "Informação oficial; disponibilidade dos fornecedores depende de cada integração." },
  { id: "pix", name: "Pix", url: "https://www.bcb.gov.br/estabilidadefinanceira/pix", category: "Meios de pagamento", scope: "Fonte oficial do Banco Central. A página responde pela acessibilidade do portal; indicadores de disponibilidade do Pix são publicados periodicamente, não em tempo real." },
  { id: "cloudflare", name: "Cloudflare", url: "https://www.cloudflarestatus.com/", probeUrl: "https://www.cloudflarestatus.com/api/v2/status.json", category: "Infraestrutura / CDN", scope: "Status consultado pela API oficial da Cloudflare; o cartão indica o status geral publicado pelo provedor." },
];

async function probe(source) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(source.probeUrl || source.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "LogisticaStatus/1.0" } });
    if (source.id === "cloudflare" && response.ok) {
      const data = await response.json();
      return { reachable: data.status?.indicator === "none", httpStatus: response.status, checkedAt, statusDescription: data.status?.description || "Status não informado" };
    }
    return { reachable: response.ok, httpStatus: response.status, checkedAt };
  } catch {
    return { reachable: false, httpStatus: null, checkedAt };
  }
}

export default async () => {
  const services = await Promise.all(SOURCES.map(async (source) => ({
    ...source,
    probe: await probe(source),
    status: "sem_confirmacao",
  })));
  return Response.json({ services, timestamp: new Date().toISOString(), note: "Acessibilidade do portal não confirma o funcionamento da operação fiscal ou logística." }, { headers: { "cache-control": "no-store" } });
};
