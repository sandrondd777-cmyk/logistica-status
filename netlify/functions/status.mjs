const SOURCES = [
  { id: "nfe", name: "Portal de disponibilidade NF-e", url: "https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx/webServices.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=A%2FNFALwUh+4%3D", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade dos web services NF-e." },
  { id: "cte", name: "Portal de disponibilidade CT-e", url: "https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx?versao=1.00&tipoConteudo=XbSeqxE8pl8=", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade CT-e." },
  { id: "mdfe", name: "Portal MDF-e", url: "https://www.mdfe.fazenda.gov.br/", category: "Documentos fiscais", scope: "Portal oficial; não publica um status consolidado nesta consulta." },
  { id: "antt", name: "ANTT / RNTRC", url: "https://consultapublica.antt.gov.br/", category: "Transporte / ANTT", scope: "Consulta pública de transportadores; não equivale a status operacional do serviço." },
  { id: "vale-pedagio", name: "Vale-pedágio", url: "https://www.gov.br/antt/pt-br/assuntos/cargas/vale-pedagio-obrigatorio", category: "Transporte / ANTT", scope: "Informação oficial; disponibilidade dos fornecedores depende de cada integração." },
];

async function probe(url) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "LogisticaStatus/1.0" } });
    return { reachable: response.ok, httpStatus: response.status, checkedAt };
  } catch {
    return { reachable: false, httpStatus: null, checkedAt };
  }
}

export default async () => {
  const services = await Promise.all(SOURCES.map(async (source) => ({
    ...source,
    probe: await probe(source.url),
    status: "sem_confirmacao",
  })));
  return Response.json({ services, timestamp: new Date().toISOString(), note: "Acessibilidade do portal não confirma o funcionamento da operação fiscal ou logística." }, { headers: { "cache-control": "no-store" } });
};
