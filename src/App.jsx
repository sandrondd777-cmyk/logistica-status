import { useCallback, useEffect, useState } from "react";
import "./styles.css";

const STATUS = {
  aberto: "Aberto",
  investigando: "Investigando",
  acompanhando: "Em acompanhamento",
  resolvido: "Resolvido",
};

async function readJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Falha na consulta (${response.status}).`);
  return body;
}

export default function App() {
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [problemType, setProblemType] = useState("Falha ao emitir ou consultar");
  const [description, setDescription] = useState("");
  const [ownerDraft, setOwnerDraft] = useState({});

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [statusData, reportData] = await Promise.all([
        readJson("/.netlify/functions/status"),
        readJson("/.netlify/functions/reports"),
      ]);
      setServices(statusData.services || []);
      setIncidents(reportData.incidents || []);
      setServiceId((current) => current || statusData.services?.[0]?.id || "");
    } catch (e) {
      setError(`${e.message} Publique as funções no Netlify e habilite o armazenamento Netlify Blobs.`);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function submitReport(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const service = services.find((item) => item.id === serviceId);
      await readJson("/.netlify/functions/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceId, serviceName: service?.name, problemType, description }),
      });
      setDescription("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateIncident(incident, changes) {
    setBusy(true);
    setError("");
    try {
      await readJson("/.netlify/functions/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: incident.id, ...changes }),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="support-page">
    <header className="support-header">
      <div><p className="support-eyebrow">PAINEL INTERNO · OPERAÇÃO LOGÍSTICA</p><h1>Acompanhamento de serviços</h1>
        <p>Status de fontes oficiais e ocorrências registradas pela equipe de suporte.</p></div>
      <button className="support-refresh" onClick={refresh} disabled={busy}>Atualizar painel</button>
    </header>

    {error && <div className="support-error" role="alert">{error}</div>}

    <section className="support-section">
      <div className="support-section-title"><div><h2>Fontes oficiais</h2><p>Verificamos se o portal responde. Isso não confirma que a emissão está operacional.</p></div></div>
      <div className="source-grid">{services.map((service) => <article className="source-card" key={service.id}>
        <div className="source-card-heading"><span className={`source-dot ${service.probe?.reachable ? "reachable" : "unreachable"}`} />
          <h3>{service.name}</h3></div>
        <p>{service.scope}</p>
        <div className="source-meta"><strong>{service.probe?.reachable ? "Portal acessível" : "Sem resposta do portal"}</strong>
          <span>{service.probe?.httpStatus ? `HTTP ${service.probe.httpStatus}` : ""}</span></div>
        <small>Verificado: {service.probe?.checkedAt ? new Date(service.probe.checkedAt).toLocaleString("pt-BR") : "aguardando"}</small>
        <a href={service.url} target="_blank" rel="noreferrer">Abrir fonte oficial ↗</a>
      </article>)}</div>
    </section>

    <div className="support-columns">
      <section className="support-section report-panel">
        <h2>Registrar ocorrência</h2><p>Relato interno para iniciar o acompanhamento da equipe.</p>
        <form onSubmit={submitReport}>
          <label>Serviço<select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select></label>
          <label>Tipo de problema<select value={problemType} onChange={(e) => setProblemType(e.target.value)}>
            {["Falha ao emitir ou consultar", "Indisponibilidade", "Lentidão", "Erro de integração", "Outro"].map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Descrição<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} required placeholder="O que falhou? Desde quando? Inclua a mensagem de erro, sem dados sensíveis." /></label>
          <button className="support-submit" disabled={busy || !serviceId}>{busy ? "Salvando…" : "Abrir ocorrência"}</button>
        </form>
      </section>

      <section className="support-section incident-panel">
        <div className="support-section-title"><div><h2>Ocorrências da equipe</h2><p>{incidents.filter((item) => item.status !== "resolvido").length} em acompanhamento</p></div></div>
        {!incidents.length && <p className="support-empty">Nenhuma ocorrência registrada.</p>}
        <div className="incident-list">{incidents.map((incident) => <article className="incident-card" key={incident.id}>
          <div className="incident-card-title"><div><h3>{incident.serviceName}</h3><span>{incident.problemType}</span></div>
            <time>{new Date(incident.createdAt).toLocaleString("pt-BR")}</time></div>
          <p>{incident.description}</p>
          <div className="incident-controls">
            <label>Estado<select value={incident.status} disabled={busy} onChange={(e) => updateIncident(incident, { status: e.target.value })}>
              {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Responsável<input value={ownerDraft[incident.id] ?? incident.owner} disabled={busy} placeholder="Nome da pessoa" onChange={(e) => setOwnerDraft((current) => ({ ...current, [incident.id]: e.target.value }))} onBlur={(e) => { if (e.target.value !== incident.owner) updateIncident(incident, { owner: e.target.value }); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>
          </div>
          <small>Atualizado: {new Date(incident.updatedAt).toLocaleString("pt-BR")}</small>
        </article>)}</div>
      </section>
    </div>
    <footer className="support-footer">Os relatos são sinais operacionais da equipe. Acessibilidade do portal não substitui confirmação funcional do serviço.</footer>
  </main>;
}
