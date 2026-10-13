const SOURCES = [
  { id: "nfe", name: "Portal de disponibilidade NF-e", url: "https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=P2c98tUpxrI%3D&versao=0.00", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade dos web services NF-e." },
  { id: "cte", name: "Portal de disponibilidade CT-e", url: "https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx?versao=1.00&tipoConteudo=XbSeqxE8pl8=", category: "Documentos fiscais", scope: "Fonte oficial: painel de disponibilidade CT-e." },
  { id: "mdfe", name: "Portal MDF-e", url: "https://dfe-portal.svrs.rs.gov.br/MDFE/Disponibilidade", category: "Documentos fiscais", scope: "Portal oficial; não publica um status consolidado nesta consulta." },
  { id: "antt", name: "ANTT / RNTRC", url: "https://consultapublica.antt.gov.br/", category: "Transporte / ANTT", scope: "Consulta publica de transportadores; nao equivale a status operacional do servico." },
  // Com certificado de cliente confiavel: { id: "antt-pef", name: "ANTT / PEF (Swagger)", url: "https://appservices.antt.gov.br/pefServices/swagger/", category: "Transporte / ANTT", scope: "Acessibilidade do Swagger do PEF; requer certificado de cliente confiavel." },
  { id: "vale-pedagio", name: "Vale-pedágio", url: "https://www.gov.br/antt/pt-br/assuntos/cargas/vale-pedagio-obrigatorio", category: "Transporte / ANTT", scope: "Informação oficial; disponibilidade dos fornecedores depende de cada integração." },
  { id: "pix", name: "Pix", url: "https://www.bcb.gov.br/estabilidadefinanceira/pix", category: "Meios de pagamento", scope: "Fonte oficial do Banco Central. A página responde pela acessibilidade do portal; indicadores de disponibilidade do Pix são publicados periodicamente, não em tempo real." },
  { id: "cloudflare", name: "Cloudflare", url: "https://www.cloudflarestatus.com/", probeUrl: "https://www.cloudflarestatus.com/api/v2/status.json", category: "Infraestrutura / CDN", scope: "Status consultado pela API oficial da Cloudflare; o cartão indica o status geral publicado pelo provedor." },
];

const CTE_AVAILABILITY_URL = "https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx?versao=1.00&tipoConteudo=XbSeqxE8pl8=";
const NFE_AVAILABILITY_URL = "https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=P2c98tUpxrI%3D&versao=0.00";
const NFE_COLUMNS = ["Autorização", "Retorno Autorização", "Inutilização", "Consulta Protocolo", "Status Serviço", "Consulta Cadastro", "Recepção Evento"];
const CTE_COLUMNS = ["Recepção Sinc", "Status Serviço", "Recepção CT-e OS", "Recepção GTVE", "Recepção Evento", "Consulta Cadastro", "Tempo Médio"];

function decodeHtml(value) {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#233;/gi, "é").replace(/&#225;/gi, "á").replace(/&#227;/gi, "ã").replace(/&#237;/gi, "í").replace(/&#243;/gi, "ó").replace(/&#250;/gi, "ú").replace(/&#234;/gi, "ê").replace(/&#231;/gi, "ç");
}

function parseCteAvailability(html) {
  const table = html.match(/<table\b(?=[^>]*\bid=["']ctl00_ContentPlaceHolder1_gdvDisponibilidade["'])[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error("Tabela oficial de disponibilidade CT-e não encontrada.");
  const caption = decodeHtml(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const checkedAt = caption.match(/Última Verificação:\s*([\d/]+\s+[\d:]+)/i)?.[1] || null;
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1).map(([, row]) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, cell]) => {
      const image = cell.match(/<img\b[^>]*src=["'][^"']*bola_(verde|vermelho|amarela)[^"']*["']/i)?.[1]?.toLowerCase();
      const text = decodeHtml(cell.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      return image ? { state: image === "verde" ? "operational" : image === "amarela" ? "unstable" : "down", value: image === "verde" ? "Operacional" : image === "amarela" ? "Instável" : "Indisponível" } : { state: text === "-" || !text ? "unavailable" : "info", value: text };
    });
    return cells.length ? { authorizer: cells[0].value, services: cells.slice(1, 7), average: cells[7]?.value || "-" } : null;
  }).filter(Boolean);
  return { title: "Visão Geral de Disponibilidade dos Serviços", checkedAt, columns: CTE_COLUMNS, rows, sourceUrl: CTE_AVAILABILITY_URL };
}

export async function fetchCteAvailability() {
  const response = await fetch(CTE_AVAILABILITY_URL, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "LogisticaStatus/1.0", accept: "text/html" } });
  if (!response.ok) throw new Error(`Portal CT-e respondeu HTTP ${response.status}.`);
  return parseCteAvailability(await response.text());
}

export function parseNfeAvailability(html) {
  const table = html.match(/<table\b(?=[^>]*\bid=["']ctl00_ContentPlaceHolder1_gdvDisponibilidade["'])[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error("Tabela oficial de disponibilidade NF-e não encontrada.");
  const caption = decodeHtml(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const checkedAt = caption.match(/Última Verificação:\s*([\d/]+\s+[\d:]+)/i)?.[1] || null;
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1).map(([, row]) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, cell]) => {
      const image = cell.match(/<img\b[^>]*src=["'][^"']*bola_(verde|vermelho|amarela)[^"']*["']/i)?.[1]?.toLowerCase();
      const value = decodeHtml(cell.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      return image ? { state: image === "verde" ? "operational" : image === "amarela" ? "unstable" : "down", value: image === "verde" ? "Operacional" : image === "amarela" ? "Instável" : "Indisponível" } : { state: value === "-" || !value ? "unavailable" : "info", value };
    });
    return cells.length ? { authorizer: cells[0].value, services: cells.slice(1, 8), average: cells[8]?.value || "-" } : null;
  }).filter(Boolean);
  if (!rows.length) throw new Error("Tabela de disponibilidade NF-e sem dados.");
  return { title: "Disponibilidade oficial NF-e", checkedAt, columns: NFE_COLUMNS, rows, sourceUrl: NFE_AVAILABILITY_URL };
}

export async function fetchNfeAvailability() {
  const response = await fetch(NFE_AVAILABILITY_URL, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "LogisticaStatus/1.0", accept: "text/html" } });
  if (!response.ok) throw new Error(`Portal NF-e respondeu HTTP ${response.status}.`);
  return parseNfeAvailability(await response.text());
}

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
