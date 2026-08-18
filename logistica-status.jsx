import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  ExternalLink, Plus, Trash2, Pencil, Settings, X, ChevronRight,
  ClipboardList, Siren, ListFilter, Menu
} from "lucide-react";

/* ----------------------------- constants ----------------------------- */

const UF_LIST = [
  ["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],
  ["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],
  ["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],
  ["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],
  ["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],
  ["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],
  ["SE","Sergipe"],["TO","Tocantins"]
];

const CATEGORIES = [
  { id: "fiscal", label: "Fiscal" },
  { id: "antt", label: "ANTT / Transporte" },
  { id: "pedagio", label: "Vale-Pedágio" },
  { id: "governo", label: "Governo" },
  { id: "pagamentos", label: "Pagamentos" },
];

const PROBLEM_TYPES = [
  "Não consigo emitir",
  "Serviço lento",
  "Erro de conexão",
  "Timeout",
  "Consulta indisponível",
  "Erro desconhecido",
];

const STATUS_META = {
  normal:        { label: "Endpoint oficial acessível", short: "Acessível", cls: "st-green"  },
  instabilidade: { label: "Possível instabilidade", short: "Instabilidade", cls: "st-amber"  },
  indisponivel:  { label: "Indisponível",           short: "Indisponível",  cls: "st-red"    },
  sem_dados:     { label: "Sem dados",              short: "Sem dados",     cls: "st-gray"   },
};

let _c = 0;
const uid = () => `id_${++_c}_${Math.random().toString(36).slice(2, 7)}`;
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

/* ----------------------------- seed data ------------------------------ */

function seedServices() {
  const list = [];
  const push = (name, category, extra = {}) => {
    list.push({
      id: slug(name) + (extra.state ? "-" + extra.state.toLowerCase() : ""),
      name, category,
      state: extra.state || null,
      status: extra.status || "normal",
      last_check: extra.last_check || minutesAgo(Math.floor(Math.random() * 8) + 1),
      official_url: extra.official_url || null,
      monitoring_url: extra.monitoring_url || "",
      monitoring_enabled: false,
      description: extra.description || `Consulta e monitoramento de disponibilidade do serviço ${name}.`,
      incident_description: extra.incident_description || "",
      affected_services: extra.affected_services || [],
    });
  };

  UF_LIST.forEach(([uf]) => {
    push(`SEFAZ ${uf}`, "fiscal", {
      state: uf,
      official_url: `https://www.google.com/search?q=SEFAZ+${uf}+portal+oficial`,
      status: uf === "RJ" ? "instabilidade" : "normal",
      incident_description: uf === "RJ"
        ? "Foram identificadas falhas intermitentes na autorização de documentos fiscais eletrônicos."
        : "",
      affected_services: uf === "RJ" ? ["CT-e", "MDF-e", "NF-e"] : [],
      last_check: uf === "RJ" ? minutesAgo(3) : undefined,
    });
  });

  push("CT-e", "fiscal", { official_url: "https://www.cte.fazenda.gov.br" });
  push("CT-e OS", "fiscal", { official_url: "https://www.cte.fazenda.gov.br" });
  push("MDF-e", "fiscal", { official_url: "https://www.mdfe.fazenda.gov.br" });
  push("NF-e", "fiscal", { official_url: "https://www.nfe.fazenda.gov.br" });
  push("NFS-e", "fiscal", { official_url: "https://www.gov.br/nfse" });
  push("Portal Nacional CT-e", "fiscal", { official_url: "https://www.cte.fazenda.gov.br" });
  push("Portal Nacional MDF-e", "fiscal", { official_url: "https://www.mdfe.fazenda.gov.br" });
  push("SVRS", "fiscal", { official_url: "https://www.sefaz.rs.gov.br/svrs" });
  push("SVSP", "fiscal", { official_url: "https://www.fazenda.sp.gov.br" });

  push("ANTT", "antt", { official_url: "https://www.gov.br/antt" });
  push("CIOT", "antt", {
    official_url: "https://www.gov.br/antt",
    status: "instabilidade",
    incident_description: "Aumento no número de relatos de falha nas consultas de operações de transporte.",
    last_check: minutesAgo(2),
  });
  push("RNTRC", "antt", { official_url: "https://www.gov.br/antt" });
  push("Vale-Pedágio (ANTT)", "antt", { official_url: "https://www.gov.br/antt" });
  push("Consulta Pública ANTT", "antt", { official_url: "https://www.gov.br/antt" });

  push("Sem Parar", "pedagio", { official_url: "https://www.semparar.com.br" });
  push("ConectCar", "pedagio", { official_url: "https://www.conectcar.com" });
  push("Veloe", "pedagio", {
    official_url: "https://veloe.com.br",
    status: "indisponivel",
    incident_description: "Indisponibilidade confirmada na consulta de saldo e passagens em praças de pedágio.",
    last_check: minutesAgo(1),
  });

  push("Gov.br", "governo", { official_url: "https://www.gov.br" });
  push("Receita Federal", "governo", { official_url: "https://www.gov.br/receitafederal" });
  push("e-CAC", "governo", { official_url: "https://cav.receita.fazenda.gov.br" });
  push("SERPRO", "governo", { official_url: "https://www.serpro.gov.br" });

  push("PIX", "pagamentos", { official_url: "https://www.bcb.gov.br/estabilidadefinanceira/pix" });
  push("Bancos", "pagamentos", { status: "sem_dados", official_url: "" });
  push("Instituições de pagamento de frete", "pagamentos", { status: "sem_dados", official_url: "" });

  return list;
}

function seedHistoryFor(services) {
  const hist = [];
  services.forEach((s) => {
    if (s.status === "normal" || s.status === "sem_dados") return;
    hist.push({ id: uid(), service_id: s.id, status: "normal", checked_at: minutesAgo(90), note: "Operação normal" });
    hist.push({ id: uid(), service_id: s.id, status: "instabilidade", checked_at: minutesAgo(40), note: "Aumento de relatos" });
    if (s.status === "indisponivel") {
      hist.push({ id: uid(), service_id: s.id, status: "indisponivel", checked_at: minutesAgo(10), note: "Indisponibilidade confirmada" });
    }
  });
  return hist;
}

function seedReportsFor(services) {
  const reps = [];
  const problemFor = (st) => PROBLEM_TYPES[Math.floor(Math.random() * PROBLEM_TYPES.length)];
  services.forEach((s) => {
    let n = 0;
    if (s.status === "instabilidade") n = 6;
    if (s.status === "indisponivel") n = 18;
    for (let i = 0; i < n; i++) {
      reps.push({
        id: uid(), service_id: s.id, state: s.state || null,
        problem_type: problemFor(s.status),
        description: "",
        created_at: minutesAgo(Math.floor(Math.random() * 100)),
      });
    }
  });
  return reps;
}

const DEFAULT_THRESHOLDS = { yellow: 5, red: 15 };

/* ------------------------------ storage -------------------------------- */

async function storageGet(key, fallback) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function storageSet(key, value) {
  try { await window.storage.set(key, JSON.stringify(value), true); } catch (e) { /* ignore */ }
}

/* -------------------------------- icons --------------------------------- */

function StatusIcon({ status, size = 14 }) {
  const props = { size, strokeWidth: 2.3 };
  if (status === "normal") return <CheckCircle2 {...props} />;
  if (status === "instabilidade") return <AlertTriangle {...props} />;
  if (status === "indisponivel") return <XCircle {...props} />;
  return <HelpCircle {...props} />;
}

function Stamp({ status, size = "md" }) {
  const meta = STATUS_META[status] || STATUS_META.sem_dados;
  return (
    <span className={`stamp ${meta.cls} stamp-${size}`}>
      <StatusIcon status={status} size={size === "sm" ? 12 : 14} />
      {meta.short}
    </span>
  );
}

/* ------------------------------- app root -------------------------------- */

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [services, setServices] = useState([]);
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);

  const [view, setView] = useState("home"); // home | service | all | occurrences | admin
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [ufFilter, setUfFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [reportModal, setReportModal] = useState(null); // {serviceId} | null
  const [serviceEditor, setServiceEditor] = useState(null); // {mode:'add'|'edit', data}

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/.netlify/functions/status");
        if (!response.ok) throw new Error("Fonte temporariamente indisponível");
        const payload = await response.json();
        setServices(payload.services || []);
        setHistory(payload.history || []);
        setReports(payload.reports || []);
        setThresholds(payload.thresholds || DEFAULT_THRESHOLDS);
      } catch {
        // O Vite não executa Netlify Functions. Este catálogo permite testar a
        // interface localmente sem simular disponibilidade de qualquer serviço.
        setServices(seedServices().map((service) => ({
          ...service,
          status: "sem_dados",
          last_check: null,
          incident_description: "",
          affected_services: []
        })));
        setHistory([]);
        setReports([]);
      }
      setLoaded(true);
    })();
  }, []);

  const persistServices = useCallback((next) => setServices(next), []);
  const persistHistory = useCallback((next) => setHistory(next), []);
  const persistReports = useCallback((next) => setReports(next), []);
  const persistThresholds = useCallback((next) => setThresholds(next), []);

  const goto = (v, id = null) => { setView(v); setSelectedId(id); setMenuOpen(false); window.scrollTo?.(0, 0); };

  /* ------------------------- derived: report counts ------------------------- */

  const countRecentReports = useCallback((serviceId, minutesWindow = 120) => {
    const cutoff = Date.now() - minutesWindow * 60000;
    return reports.filter((r) => r.service_id === serviceId && new Date(r.created_at).getTime() >= cutoff).length;
  }, [reports]);

  const totalRecentReports = useMemo(() => countRecentReportsAll(reports, 120), [reports]);
  function countRecentReportsAll(reps, win) {
    const cutoff = Date.now() - win * 60000;
    return reps.filter((r) => new Date(r.created_at).getTime() >= cutoff).length;
  }

  /* ------------------------------ actions ------------------------------ */

  const submitReport = ({ serviceId, state, problemType, description }) => {
    const report = { id: uid(), service_id: serviceId, state: state || null, problem_type: problemType, description: description || "", created_at: new Date().toISOString() };
    persistReports([...reports, report]);
    fetch("/.netlify/functions/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, state, problemType, description })
    }).catch(() => {});
    setReportModal(null);
  };

  const manualSetStatus = (serviceId, status, note) => {
    const now = new Date().toISOString();
    persistServices(services.map((s) => s.id === serviceId ? { ...s, status, last_check: now } : s));
    persistHistory([{ id: uid(), service_id: serviceId, status, checked_at: now, note: note || "Alterado manualmente pelo administrador" }, ...history]);
  };

  const saveService = (data) => {
    if (serviceEditor?.mode === "add") {
      const newSvc = { id: data.id || (slug(data.name) + "-" + uid().slice(-4)), status: "sem_dados", last_check: new Date().toISOString(), monitoring_enabled: false, affected_services: [], incident_description: "", ...data };
      persistServices([newSvc, ...services]);
    } else {
      persistServices(services.map((s) => s.id === data.id ? { ...s, ...data } : s));
    }
    setServiceEditor(null);
  };

  const deleteService = (id) => {
    persistServices(services.filter((s) => s.id !== id));
    if (selectedId === id) goto("all");
  };

  /* -------------------------------- filters -------------------------------- */

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (catFilter !== "all" && s.category !== catFilter) return false;
      if (ufFilter && s.state !== ufFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [services, catFilter, ufFilter, search]);

  const counts = useMemo(() => {
    const c = { normal: 0, instabilidade: 0, indisponivel: 0, sem_dados: 0 };
    services.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [services]);

  const overall = counts.indisponivel > 0 ? "indisponivel" : counts.instabilidade > 0 ? "instabilidade" : counts.normal > 0 ? "normal" : "sem_dados";
  const overallText = overall === "normal" ? "Há endpoints oficiais acessíveis"
    : overall === "instabilidade" ? "Existem instabilidades" : overall === "indisponivel" ? "Existem indisponibilidades" : "Aguardando consulta dos endpoints oficiais";

  const recentIncidents = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at)).slice(0, 6);
  }, [history]);

  const selectedService = services.find((s) => s.id === selectedId) || null;

  if (!loaded) {
    return (
      <div className="ls-root">
        <Style />
        <div className="ls-loading">Carregando painel…</div>
      </div>
    );
  }

  return (
    <div className="ls-root">
      <Style />
      <TopBand
        view={view} goto={goto} search={search} setSearch={setSearch}
        overall={overall} overallText={overallText}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        onReport={() => setReportModal({ serviceId: null })}
      />

      <main className="ls-main">
        {view === "home" && (
          <Home
            services={filteredServices} allServices={services} counts={counts}
            overall={overall} overallText={overallText}
            catFilter={catFilter} setCatFilter={setCatFilter}
            ufFilter={ufFilter} setUfFilter={setUfFilter}
            recentIncidents={recentIncidents}
            totalRecentReports={totalRecentReports}
            goto={goto}
            onReport={(id) => setReportModal({ serviceId: id })}
          />
        )}

        {view === "all" && (
          <AllServices
            services={filteredServices}
            catFilter={catFilter} setCatFilter={setCatFilter}
            ufFilter={ufFilter} setUfFilter={setUfFilter}
            goto={goto}
          />
        )}

        {view === "occurrences" && (
          <Occurrences history={history} services={services} goto={goto} />
        )}

        {view === "service" && selectedService && (
          <ServiceDetail
            service={selectedService}
            history={history.filter((h) => h.service_id === selectedService.id).sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))}
            reports={reports.filter((r) => r.service_id === selectedService.id)}
            goto={goto}
            onReport={() => setReportModal({ serviceId: selectedService.id })}
          />
        )}

        {view === "admin" && (
          <Admin
            services={services} reports={reports} thresholds={thresholds}
            setThresholds={persistThresholds}
            onAdd={() => setServiceEditor({ mode: "add", data: { name: "", category: "fiscal", state: "", official_url: "", description: "" } })}
            onEdit={(s) => setServiceEditor({ mode: "edit", data: s })}
            onDelete={deleteService}
            onManualStatus={manualSetStatus}
          />
        )}
      </main>

      <footer className="ls-footer">
        Logística Status — painel de consulta rápida para equipes de transporte e logística. Status só é exibido quando confirmado por fonte oficial; relatos não alteram a situação pública automaticamente.
      </footer>

      {reportModal && (
        <ReportModal
          services={services}
          initialServiceId={reportModal.serviceId}
          onClose={() => setReportModal(null)}
          onSubmit={submitReport}
        />
      )}

      {serviceEditor && (
        <ServiceEditorModal
          mode={serviceEditor.mode}
          data={serviceEditor.data}
          onClose={() => setServiceEditor(null)}
          onSave={saveService}
        />
      )}
    </div>
  );
}

/* ------------------------------- top band -------------------------------- */

function TopBand({ view, goto, search, setSearch, overall, overallText, menuOpen, setMenuOpen, onReport }) {
  const nav = [
    ["home", "Início"], ["all", "Todos os serviços"], ["occurrences", "Ocorrências"],
  ];
  return (
    <header className="ls-band">
      <div className="ls-band-top">
        <button className="ls-brand" onClick={() => goto("home")}>
          <span className="ls-brand-mark">LS</span>
          <span className="ls-brand-name">LOGÍSTICA<br />STATUS</span>
        </button>

        <nav className="ls-nav ls-nav-desktop">
          {nav.map(([id, label]) => (
            <button key={id} className={`ls-nav-link ${view === id ? "active" : ""}`} onClick={() => goto(id)}>{label}</button>
          ))}
        </nav>

        <div className="ls-band-actions">
          <button className="ls-report-btn" onClick={onReport}>
            <Siren size={15} strokeWidth={2.3} /> <span className="ls-report-btn-txt">Estou com problema</span>
          </button>
          <button className="ls-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu"><Menu size={20} /></button>
        </div>
      </div>

      {menuOpen && (
        <nav className="ls-nav-mobile">
          {nav.map(([id, label]) => (
            <button key={id} className={`ls-nav-link ${view === id ? "active" : ""}`} onClick={() => goto(id)}>{label}</button>
          ))}
        </nav>
      )}

      <div className="ls-band-status">
        <span className={`ls-overall-dot dot-${overall}`} />
        <span className="ls-overall-txt">{overallText}</span>
      </div>

      <div className="ls-search-wrap">
        <Search size={16} className="ls-search-icon" />
        <input
          className="ls-search"
          placeholder="Pesquisar serviço... (ex: SEFAZ SP, CIOT, ConectCar)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </header>
  );
}

/* --------------------------------- home ----------------------------------- */

function Home({ services, allServices, counts, overall, overallText, catFilter, setCatFilter, ufFilter, setUfFilter, recentIncidents, totalRecentReports, goto, onReport }) {
  return (
    <div className="ls-stack">
      <p className="ls-subtitle">Monitore a disponibilidade dos principais serviços que impactam o transporte e a logística no Brasil.</p>

      <div className="ls-counter-strip">
        <CounterPill status="normal" n={counts.normal} label="endpoints acessíveis" />
        <CounterPill status="instabilidade" n={counts.instabilidade} label="em instabilidade" />
        <CounterPill status="indisponivel" n={counts.indisponivel} label="indisponíveis" />
        <div className="ls-counter-pill ls-counter-reports">
          <span className="ls-counter-n">{totalRecentReports}</span>
          <span className="ls-counter-label">relatos nas últimas 2h</span>
        </div>
      </div>

      <FilterBar catFilter={catFilter} setCatFilter={setCatFilter} ufFilter={ufFilter} setUfFilter={setUfFilter} />

      <div className="ls-section-head">
        <h2 className="ls-h2">Principais serviços</h2>
        <button className="ls-link-btn" onClick={() => goto("all")}>Ver todos <ChevronRight size={15} /></button>
      </div>

      <div className="ls-grid">
        {services.slice(0, 24).map((s) => (
          <ServiceCard key={s.id} service={s} onOpen={() => goto("service", s.id)} onReport={() => onReport(s.id)} />
        ))}
        {services.length === 0 && <EmptyState text="Nenhum serviço encontrado para os filtros selecionados." />}
      </div>

      <div className="ls-section-head">
        <h2 className="ls-h2">Últimas ocorrências</h2>
        <button className="ls-link-btn" onClick={() => goto("occurrences")}>Ver todas <ChevronRight size={15} /></button>
      </div>
      <IncidentList items={recentIncidents} services={allServices} goto={goto} compact />
    </div>
  );
}

function CounterPill({ status, n, label }) {
  const meta = STATUS_META[status];
  return (
    <div className={`ls-counter-pill st-${status}`}>
      <StatusIcon status={status} size={16} />
      <span className="ls-counter-n">{n}</span>
      <span className="ls-counter-label">{label}</span>
    </div>
  );
}

function FilterBar({ catFilter, setCatFilter, ufFilter, setUfFilter }) {
  return (
    <div className="ls-filterbar">
      <ListFilter size={15} className="ls-filter-icon" />
      <button className={`ls-chip ${catFilter === "all" ? "active" : ""}`} onClick={() => { setCatFilter("all"); setUfFilter(""); }}>Todas categorias</button>
      {CATEGORIES.map((c) => (
        <button key={c.id} className={`ls-chip ${catFilter === c.id ? "active" : ""}`} onClick={() => { setCatFilter(c.id); if (c.id !== "fiscal") setUfFilter(""); }}>{c.label}</button>
      ))}
      {catFilter === "fiscal" && (
        <select className="ls-uf-select" value={ufFilter} onChange={(e) => setUfFilter(e.target.value)}>
          <option value="">Todos os estados</option>
          {UF_LIST.map(([uf, name]) => <option key={uf} value={uf}>{uf} — {name}</option>)}
        </select>
      )}
    </div>
  );
}

function ServiceCard({ service, onOpen, onReport }) {
  const catLabel = CATEGORIES.find((c) => c.id === service.category)?.label || service.category;
  return (
    <div className="ls-card">
      <div className="ls-card-top">
        <div>
          <div className="ls-card-name">{service.name}{service.state ? <span className="ls-card-uf"> · {service.state}</span> : null}</div>
          <div className="ls-card-cat">{catLabel}</div>
        </div>
        <Stamp status={service.status} />
      </div>
      <div className="ls-card-desc">{STATUS_META[service.status].label}</div>
      <div className="ls-card-foot">
        <span className="ls-card-time">Última verificação: {fmtDateTime(service.last_check)}</span>
      </div>
      <div className="ls-card-actions">
        <button className="ls-btn-sm ls-btn-outline" onClick={onOpen}>Ver detalhes</button>
        {service.official_url && <a className="ls-btn-sm ls-btn-outline" href={service.official_url} target="_blank" rel="noreferrer">Fonte oficial <ExternalLink size={12} /></a>}
        <button className="ls-btn-sm ls-btn-ghost" onClick={onReport}>Relatar</button>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="ls-empty">{text}</div>;
}

/* ----------------------------- all services -------------------------------- */

function AllServices({ services, catFilter, setCatFilter, ufFilter, setUfFilter, goto }) {
  return (
    <div className="ls-stack">
      <h1 className="ls-h1">Todos os serviços</h1>
      <FilterBar catFilter={catFilter} setCatFilter={setCatFilter} ufFilter={ufFilter} setUfFilter={setUfFilter} />
      <div className="ls-table">
        <div className="ls-table-row ls-table-head">
          <span>Serviço</span><span>Categoria</span><span>Status</span><span>Última verificação</span><span></span>
        </div>
        {services.map((s) => (
          <div className="ls-table-row" key={s.id}>
            <span className="ls-table-name">{s.name}{s.state ? ` · ${s.state}` : ""}</span>
            <span className="ls-table-cell-label" data-label="Categoria">{CATEGORIES.find((c) => c.id === s.category)?.label}</span>
            <span className="ls-table-cell-label" data-label="Status"><Stamp status={s.status} size="sm" /></span>
            <span className="ls-table-cell-label" data-label="Última verificação">{fmtDateTime(s.last_check)}</span>
            <button className="ls-btn-sm ls-btn-outline" onClick={() => goto("service", s.id)}>Detalhes</button>
          </div>
        ))}
        {services.length === 0 && <EmptyState text="Nenhum serviço encontrado." />}
      </div>
    </div>
  );
}

/* ------------------------------ occurrences --------------------------------- */

function Occurrences({ history, services, goto }) {
  const items = [...history].sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));
  return (
    <div className="ls-stack">
      <h1 className="ls-h1">Instabilidades recentes</h1>
      <IncidentList items={items} services={services} goto={goto} />
      {items.length === 0 && <EmptyState text="Nenhuma ocorrência registrada até o momento." />}
    </div>
  );
}

function IncidentList({ items, services, goto, compact }) {
  return (
    <div className="ls-log">
      {items.map((h) => {
        const svc = services.find((s) => s.id === h.service_id);
        if (!svc) return null;
        return (
          <button key={h.id} className="ls-log-item" onClick={() => goto("service", svc.id)}>
            <span className="ls-log-rail"><span className={`ls-log-dot dot-${h.status}`} /></span>
            <span className="ls-log-body">
              <span className="ls-log-title">{svc.name}{svc.state ? ` · ${svc.state}` : ""}</span>
              <span className="ls-log-note">{h.note}</span>
              <span className="ls-log-time">{fmtDateTime(h.checked_at)}</span>
            </span>
            {!compact && <Stamp status={h.status} size="sm" />}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ service detail -------------------------------- */

function ServiceDetail({ service, history, reports, goto, onReport }) {
  const catLabel = CATEGORIES.find((c) => c.id === service.category)?.label || service.category;

  const cutoff = Date.now() - 120 * 60000;
  const recent = reports.filter((r) => new Date(r.created_at).getTime() >= cutoff);

  const buckets = useMemo(() => {
    const now = new Date();
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourLabel = hourStart.getHours().toString().padStart(2, "0") + "h";
      const count = reports.filter((r) => {
        const t = new Date(r.created_at);
        return t.getHours() === hourStart.getHours() && (now.getTime() - t.getTime()) < (i + 1) * 3600000 && (now.getTime() - t.getTime()) >= i * 3600000;
      }).length;
      arr.push({ label: hourLabel, count });
    }
    return arr;
  }, [reports]);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="ls-stack">
      <button className="ls-back" onClick={() => goto("all")}><ArrowLeft size={16} /> Voltar</button>

      <div className="ls-detail-head">
        <div>
          <h1 className="ls-h1">{service.name}{service.state ? <span className="ls-card-uf"> · {service.state}</span> : null}</h1>
          <div className="ls-card-cat">{catLabel}</div>
        </div>
        <Stamp status={service.status} size="lg" />
      </div>

      <div className="ls-panel">
        <div className="ls-kv"><span>Última verificação</span><strong>{fmtDateTime(service.last_check)}</strong></div>
      </div>

      <div className="ls-panel">
        <h3 className="ls-h3">O que está acontecendo?</h3>
        <p className="ls-p">
          {service.status === "normal" && "Nenhuma instabilidade identificada no momento. O serviço está operando normalmente conforme fonte oficial e relatos recentes."}
          {service.status === "sem_dados" && "Não foi possível obter uma verificação automática. Consulte os relatos recentes ou a fonte oficial."}
          {(service.status === "instabilidade" || service.status === "indisponivel") && (service.incident_description || "Foram identificados relatos de instabilidade neste serviço.")}
        </p>
        {service.affected_services?.length > 0 && (
          <>
            <h4 className="ls-h4">Serviços afetados</h4>
            <ul className="ls-ul">
              {service.affected_services.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </>
        )}
      </div>

      <div className="ls-panel">
        <h3 className="ls-h3">Relatos nas últimas 2 horas</h3>
        <div className={`ls-report-count st-${recent.length >= 15 ? "indisponivel" : recent.length >= 5 ? "instabilidade" : "normal"}`}>
          {recent.length} relatos
        </div>
        <div className="ls-chart">
          {buckets.map((b) => (
            <div key={b.label} className="ls-chart-col">
              <div className="ls-chart-bar" style={{ height: `${8 + (b.count / maxCount) * 60}px` }} />
              <span className="ls-chart-label">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ls-panel">
        <h3 className="ls-h3">Histórico</h3>
        {history.length === 0
          ? <p className="ls-p ls-muted">Nenhuma alteração de status registrada.</p>
          : <IncidentList items={history} services={[service]} goto={goto} />}
      </div>

      <div className="ls-panel">
        <h3 className="ls-h3">Fonte da informação</h3>
        <div className="ls-kv"><span>Fonte oficial</span><strong>{service.official_url ? "Disponível" : "Não cadastrada"}</strong></div>
        <div className="ls-kv"><span>Última consulta</span><strong>{fmtDateTime(service.last_check)}</strong></div>
        {service.official_url && (
          <a className="ls-btn ls-btn-outline" href={service.official_url} target="_blank" rel="noreferrer">
            Acessar fonte oficial <ExternalLink size={14} />
          </a>
        )}
      </div>

      <button className="ls-report-btn ls-report-btn-wide" onClick={onReport}>
        <Siren size={16} /> Estou com problema neste serviço
      </button>
    </div>
  );
}

/* -------------------------------- admin -------------------------------------- */

function Admin({ services, reports, thresholds, setThresholds, onAdd, onEdit, onDelete, onManualStatus }) {
  const [tab, setTab] = useState("services");
  const [yellow, setYellow] = useState(thresholds.yellow);
  const [red, setRed] = useState(thresholds.red);

  return (
    <div className="ls-stack">
      <div className="ls-detail-head">
        <h1 className="ls-h1"><Settings size={20} className="ls-inline-icon" /> Administração</h1>
      </div>
      <div className="ls-admin-tabs">
        <button className={`ls-chip ${tab === "services" ? "active" : ""}`} onClick={() => setTab("services")}>Serviços</button>
        <button className={`ls-chip ${tab === "thresholds" ? "active" : ""}`} onClick={() => setTab("thresholds")}>Limites de relatos</button>
        <button className={`ls-chip ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>Relatos recebidos</button>
      </div>

      {tab === "services" && (
        <div className="ls-stack">
          <button className="ls-btn ls-btn-solid" onClick={onAdd}><Plus size={15} /> Adicionar serviço</button>
          <div className="ls-table">
            <div className="ls-table-row ls-table-head">
              <span>Serviço</span><span>Categoria</span><span>Status</span><span></span>
            </div>
            {services.map((s) => (
              <div className="ls-table-row" key={s.id}>
                <span className="ls-table-name">{s.name}{s.state ? ` · ${s.state}` : ""}</span>
                <span className="ls-table-cell-label" data-label="Categoria">{CATEGORIES.find((c) => c.id === s.category)?.label}</span>
                <span className="ls-table-cell-label" data-label="Status">
                  <select className="ls-status-select" value={s.status} onChange={(e) => onManualStatus(s.id, e.target.value)}>
                    {Object.keys(STATUS_META).map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                  </select>
                </span>
                <span className="ls-admin-actions">
                  <button className="ls-icon-btn" onClick={() => onEdit(s)} aria-label="Editar"><Pencil size={15} /></button>
                  <button className="ls-icon-btn ls-icon-danger" onClick={() => onDelete(s.id)} aria-label="Excluir"><Trash2 size={15} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "thresholds" && (
        <div className="ls-panel ls-stack">
          <p className="ls-p ls-muted">Defina quantos relatos, nas últimas 2 horas, são necessários para alterar automaticamente o status de um serviço.</p>
          <label className="ls-field">
            <span>🟡 Instabilidade a partir de</span>
            <input type="number" min={1} className="ls-input" value={yellow} onChange={(e) => setYellow(Number(e.target.value))} />
          </label>
          <label className="ls-field">
            <span>🔴 Indisponibilidade a partir de</span>
            <input type="number" min={1} className="ls-input" value={red} onChange={(e) => setRed(Number(e.target.value))} />
          </label>
          <button className="ls-btn ls-btn-solid" onClick={() => setThresholds({ yellow, red })}>Salvar limites</button>
        </div>
      )}

      {tab === "reports" && (
        <div className="ls-table">
          <div className="ls-table-row ls-table-head">
            <span>Serviço</span><span>Tipo de problema</span><span>UF</span><span>Data</span>
          </div>
          {[...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100).map((r) => {
            const svc = services.find((s) => s.id === r.service_id);
            return (
              <div className="ls-table-row" key={r.id}>
                <span className="ls-table-name">{svc?.name || r.service_id}</span>
                <span className="ls-table-cell-label" data-label="Tipo">{r.problem_type}</span>
                <span className="ls-table-cell-label" data-label="UF">{r.state || "—"}</span>
                <span className="ls-table-cell-label" data-label="Data">{fmtDateTime(r.created_at)}</span>
              </div>
            );
          })}
          {reports.length === 0 && <EmptyState text="Nenhum relato recebido ainda." />}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- report modal ----------------------------------- */

function ReportModal({ services, initialServiceId, onClose, onSubmit }) {
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");
  const [state, setState] = useState("");
  const [problemType, setProblemType] = useState(PROBLEM_TYPES[0]);
  const [description, setDescription] = useState("");
  const svc = services.find((s) => s.id === serviceId);

  return (
    <div className="ls-modal-overlay" onClick={onClose}>
      <div className="ls-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ls-modal-head">
          <h3 className="ls-h3">Estou com problema</h3>
          <button className="ls-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <label className="ls-field">
          <span>Serviço</span>
          <select className="ls-input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.state ? ` · ${s.state}` : ""}</option>)}
          </select>
        </label>

        {svc?.category === "fiscal" && !svc?.state && (
          <label className="ls-field">
            <span>Estado / UF</span>
            <select className="ls-input" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              {UF_LIST.map(([uf, name]) => <option key={uf} value={uf}>{uf} — {name}</option>)}
            </select>
          </label>
        )}

        <label className="ls-field">
          <span>Tipo de problema</span>
          <select className="ls-input" value={problemType} onChange={(e) => setProblemType(e.target.value)}>
            {PROBLEM_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="ls-field">
          <span>Descrição (opcional)</span>
          <textarea className="ls-input ls-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte em poucas palavras o que está acontecendo…" />
        </label>

        <button className="ls-btn ls-btn-solid ls-btn-wide" onClick={() => onSubmit({ serviceId, state, problemType, description })}>
          Enviar relato
        </button>
        <p className="ls-p ls-muted ls-fineprint">Não é necessário cadastro. Seu relato ajuda outros profissionais a identificar instabilidades mais rápido.</p>
      </div>
    </div>
  );
}

/* --------------------------- service editor modal -------------------------------- */

function ServiceEditorModal({ mode, data, onClose, onSave }) {
  const [form, setForm] = useState({ ...data });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="ls-modal-overlay" onClick={onClose}>
      <div className="ls-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ls-modal-head">
          <h3 className="ls-h3">{mode === "add" ? "Adicionar serviço" : "Editar serviço"}</h3>
          <button className="ls-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <label className="ls-field"><span>Nome</span>
          <input className="ls-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>

        <label className="ls-field"><span>Categoria</span>
          <select className="ls-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        <label className="ls-field"><span>Estado / UF (se aplicável)</span>
          <select className="ls-input" value={form.state || ""} onChange={(e) => set("state", e.target.value || null)}>
            <option value="">Nenhum</option>
            {UF_LIST.map(([uf, name]) => <option key={uf} value={uf}>{uf} — {name}</option>)}
          </select>
        </label>

        <label className="ls-field"><span>URL da fonte oficial</span>
          <input className="ls-input" value={form.official_url || ""} onChange={(e) => set("official_url", e.target.value)} placeholder="https://..." />
        </label>

        <label className="ls-field"><span>URL de monitoramento (opcional)</span>
          <input className="ls-input" value={form.monitoring_url || ""} onChange={(e) => set("monitoring_url", e.target.value)} placeholder="https://..." />
        </label>

        <label className="ls-field ls-checkbox-field">
          <input type="checkbox" checked={!!form.monitoring_enabled} onChange={(e) => set("monitoring_enabled", e.target.checked)} />
          <span>Monitoramento automático ativo</span>
        </label>

        <label className="ls-field"><span>Descrição</span>
          <textarea className="ls-input ls-textarea" rows={2} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
        </label>

        <button className="ls-btn ls-btn-solid ls-btn-wide" onClick={() => onSave(form)}>
          {mode === "add" ? "Adicionar serviço" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- styles --------------------------------------- */

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

      .ls-root {
        --ink:#181B1E; --paper:#F5F6F3; --panel:#FFFFFF; --border:#E1E3DE;
        --band:#122236; --band2:#1B3550;
        --green:#1D8A4E; --green-bg:#E6F5EC;
        --amber:#B9740A; --amber-bg:#FCF0D8;
        --red:#C22E24; --red-bg:#FBE7E4;
        --gray:#787D82; --gray-bg:#ECEDEA;
        font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
        min-height:100%; line-height:1.45;
      }
      .ls-root * { box-sizing:border-box; }
      .ls-h1,.ls-h2,.ls-h3,.ls-h4,.ls-brand-name,.ls-nav-link,.ls-chip,.ls-report-btn,.ls-btn { font-family:'Barlow Condensed',sans-serif; }
      .ls-h1 { font-size:28px; font-weight:700; letter-spacing:.2px; margin:0 0 2px; text-transform:uppercase; }
      .ls-h2 { font-size:20px; font-weight:700; margin:0; text-transform:uppercase; letter-spacing:.3px; }
      .ls-h3 { font-size:17px; font-weight:700; margin:0 0 8px; text-transform:uppercase; letter-spacing:.3px; }
      .ls-h4 { font-size:13px; font-weight:700; margin:10px 0 4px; text-transform:uppercase; color:#666; letter-spacing:.4px; }
      .ls-p { font-size:14.5px; margin:0; }
      .ls-muted { color:#6b7076; }
      .ls-ul { margin:4px 0 0; padding-left:18px; font-size:14px; }
      .ls-loading { padding:60px; text-align:center; font-family:'Barlow Condensed'; font-size:20px; text-transform:uppercase; letter-spacing:.5px; }

      /* band */
      .ls-band { background:linear-gradient(180deg,var(--band),var(--band2)); color:#fff; padding:14px 18px 16px; }
      .ls-band-top { display:flex; align-items:center; justify-content:space-between; gap:12px; max-width:1120px; margin:0 auto; }
      .ls-brand { display:flex; align-items:center; gap:10px; background:none; border:none; color:#fff; cursor:pointer; padding:0; }
      .ls-brand-mark { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; background:#F5A623; color:#1A1D1F; padding:5px 7px; border-radius:3px; letter-spacing:1px; }
      .ls-brand-name { font-size:16px; font-weight:700; line-height:0.95; letter-spacing:.5px; text-align:left; text-transform:uppercase; }
      .ls-nav { display:flex; gap:4px; }
      .ls-nav-desktop { display:none; }
      .ls-nav-link { background:none; border:1px solid transparent; color:#cdd6df; font-size:15px; padding:6px 10px; border-radius:5px; cursor:pointer; text-transform:uppercase; letter-spacing:.3px; }
      .ls-nav-link.active, .ls-nav-link:hover { color:#fff; background:rgba(255,255,255,.08); }
      .ls-nav-mobile { display:flex; flex-direction:column; gap:2px; margin-top:10px; max-width:1120px; margin-left:auto; margin-right:auto; }
      .ls-band-actions { display:flex; align-items:center; gap:8px; }
      .ls-menu-btn { background:rgba(255,255,255,.08); border:none; color:#fff; padding:7px; border-radius:6px; cursor:pointer; }

      .ls-report-btn { display:inline-flex; align-items:center; gap:6px; background:#D93025; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap; text-transform:uppercase; letter-spacing:.3px; }
      .ls-report-btn:hover { background:#b8261d; }
      .ls-report-btn-txt { display:none; }
      .ls-report-btn-wide { width:100%; justify-content:center; padding:12px; font-size:15px; }

      .ls-band-status { display:flex; align-items:center; gap:8px; max-width:1120px; margin:14px auto 0; font-size:14.5px; }
      .ls-overall-dot { width:10px; height:10px; border-radius:50%; flex:none; }
      .dot-normal { background:#3FCB7A; } .dot-instabilidade { background:#F5A623; } .dot-indisponivel { background:#F16A5C; } .dot-sem_dados { background:#9AA1A6; }
      .ls-overall-txt { font-weight:500; }

      .ls-search-wrap { position:relative; max-width:1120px; margin:10px auto 0; }
      .ls-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#8b95a1; }
      .ls-search { width:100%; padding:10px 12px 10px 36px; border-radius:7px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:#fff; font-size:14.5px; font-family:'Inter',sans-serif; }
      .ls-search::placeholder { color:#9aa5b1; }
      .ls-search:focus { outline:2px solid #F5A623; outline-offset:1px; background:rgba(255,255,255,.13); }

      .ls-main { max-width:1120px; margin:0 auto; padding:20px 16px 40px; }
      .ls-stack { display:flex; flex-direction:column; gap:16px; }
      .ls-subtitle { font-size:15px; color:#4b5157; margin:0; max-width:640px; }

      /* counters */
      .ls-counter-strip { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
      .ls-counter-pill { display:flex; align-items:center; gap:8px; padding:12px 14px; border-radius:9px; border:1px solid var(--border); background:var(--panel); }
      .ls-counter-n { font-family:'JetBrains Mono',monospace; font-size:19px; font-weight:600; }
      .ls-counter-label { font-size:12.5px; color:#666; text-transform:uppercase; letter-spacing:.3px; }
      .ls-counter-reports { grid-column:span 2; justify-content:flex-start; background:var(--panel); }
      .st-normal { color:var(--green); } .st-instabilidade { color:var(--amber); } .st-indisponivel { color:var(--red); } .st-sem_dados { color:var(--gray); }
      .ls-counter-pill.st-normal { border-color:#c9e9d5; } .ls-counter-pill.st-instabilidade { border-color:#f0dbaa; } .ls-counter-pill.st-indisponivel { border-color:#f1c6c0; }

      /* filters */
      .ls-filterbar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
      .ls-filter-icon { color:#8b929a; margin-right:2px; }
      .ls-chip { font-size:13.5px; padding:6px 11px; border-radius:20px; border:1px solid var(--border); background:var(--panel); cursor:pointer; text-transform:uppercase; letter-spacing:.2px; color:#40454a; }
      .ls-chip.active { background:var(--band); border-color:var(--band); color:#fff; }
      .ls-uf-select { font-size:13.5px; padding:6px 10px; border-radius:20px; border:1px solid var(--border); background:var(--panel); font-family:'Inter'; }

      .ls-section-head { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
      .ls-link-btn { display:flex; align-items:center; gap:2px; background:none; border:none; color:var(--band2); font-size:13.5px; font-weight:600; cursor:pointer; }

      /* grid + card */
      .ls-grid { display:grid; grid-template-columns:1fr; gap:12px; }
      .ls-card { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px; }
      .ls-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
      .ls-card-name { font-weight:600; font-size:15px; }
      .ls-card-uf { color:#888; font-weight:500; }
      .ls-card-cat { font-size:11.5px; color:#8a8f94; text-transform:uppercase; letter-spacing:.4px; margin-top:2px; }
      .ls-card-desc { font-size:13.5px; color:#565b60; }
      .ls-card-foot { font-size:12px; color:#8a8f94; font-family:'JetBrains Mono',monospace; }
      .ls-card-actions { display:flex; gap:8px; margin-top:2px; }

      /* stamp */
      .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'JetBrains Mono',monospace; font-weight:600; letter-spacing:.4px; text-transform:uppercase; border:2px solid; border-radius:4px; padding:4px 8px; white-space:nowrap; }
      .stamp-sm { font-size:10.5px; padding:3px 6px; }
      .stamp-md { font-size:11.5px; }
      .stamp-lg { font-size:14px; padding:7px 12px; }
      .stamp.st-green { color:var(--green); border-color:var(--green); background:var(--green-bg); }
      .stamp.st-amber { color:var(--amber); border-color:var(--amber); background:var(--amber-bg); transform:rotate(-1deg); }
      .stamp.st-red { color:var(--red); border-color:var(--red); background:var(--red-bg); transform:rotate(-2deg); }
      .stamp.st-gray { color:var(--gray); border-color:var(--gray); background:var(--gray-bg); }

      .ls-empty { padding:24px; text-align:center; color:#8a8f94; border:1px dashed var(--border); border-radius:10px; font-size:14px; }

      /* buttons */
      .ls-btn, .ls-btn-sm { border-radius:6px; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:6px; justify-content:center; text-decoration:none; }
      .ls-btn { padding:10px 14px; font-size:14.5px; border:1px solid var(--border); }
      .ls-btn-sm { padding:6px 10px; font-size:12.5px; border:1px solid var(--border); font-family:'Inter'; }
      .ls-btn-outline { background:var(--panel); color:var(--band); }
      .ls-btn-outline:hover { background:#eef1f3; }
      .ls-btn-ghost { background:none; color:#666; border-color:transparent; }
      .ls-btn-ghost:hover { text-decoration:underline; }
      .ls-btn-solid { background:var(--band); color:#fff; border-color:var(--band); }
      .ls-btn-solid:hover { background:var(--band2); }
      .ls-btn-wide { width:100%; }

      /* table */
      .ls-table { display:flex; flex-direction:column; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--panel); }
      .ls-table-row { display:flex; flex-direction:column; gap:4px; padding:12px 14px; border-bottom:1px solid var(--border); font-size:13.5px; }
      .ls-table-row:last-child { border-bottom:none; }
      .ls-table-head { display:none; }
      .ls-table-name { font-weight:600; }
      .ls-table-cell-label::before { content: attr(data-label) ": "; color:#8a8f94; font-weight:500; }
      .ls-admin-actions { display:flex; gap:6px; }
      .ls-icon-btn { background:none; border:1px solid var(--border); border-radius:6px; padding:6px; cursor:pointer; color:#444; }
      .ls-icon-danger { color:var(--red); }
      .ls-status-select { font-family:'Inter'; font-size:12.5px; padding:4px 6px; border-radius:5px; border:1px solid var(--border); }

      /* detail */
      .ls-back { display:flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer; color:var(--band2); font-size:14px; font-weight:600; padding:0; align-self:flex-start; }
      .ls-detail-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .ls-inline-icon { vertical-align:-3px; margin-right:4px; }
      .ls-panel { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
      .ls-kv { display:flex; justify-content:space-between; font-size:14px; padding:4px 0; border-bottom:1px dashed var(--border); }
      .ls-kv:last-child { border-bottom:none; }
      .ls-kv span { color:#6b7076; }
      .ls-kv strong { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:13px; }

      .ls-report-count { font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:600; margin:6px 0 10px; }
      .ls-chart { display:flex; align-items:flex-end; gap:10px; height:90px; padding-top:10px; }
      .ls-chart-col { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
      .ls-chart-bar { width:100%; max-width:28px; background:var(--band2); border-radius:3px 3px 0 0; }
      .ls-chart-label { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:#8a8f94; }

      /* log / timeline */
      .ls-log { display:flex; flex-direction:column; }
      .ls-log-item { display:flex; align-items:flex-start; gap:10px; background:none; border:none; text-align:left; cursor:pointer; padding:9px 4px; width:100%; }
      .ls-log-item:hover { background:#eef1ee; border-radius:6px; }
      .ls-log-rail { position:relative; width:12px; display:flex; justify-content:center; align-self:stretch; }
      .ls-log-rail::before { content:""; position:absolute; top:14px; bottom:-9px; width:1px; background:var(--border); }
      .ls-log-item:last-child .ls-log-rail::before { display:none; }
      .ls-log-dot { width:9px; height:9px; border-radius:50%; margin-top:4px; flex:none; }
      .ls-log-body { display:flex; flex-direction:column; gap:1px; flex:1; }
      .ls-log-title { font-weight:600; font-size:14px; }
      .ls-log-note { font-size:12.5px; color:#666; }
      .ls-log-time { font-family:'JetBrains Mono',monospace; font-size:11px; color:#9aa1a6; margin-top:1px; }

      /* modal */
      .ls-modal-overlay { position:fixed; inset:0; background:rgba(10,15,20,.55); display:flex; align-items:flex-end; justify-content:center; z-index:50; }
      .ls-modal { background:#fff; width:100%; max-width:480px; max-height:90vh; overflow:auto; border-radius:14px 14px 0 0; padding:18px; display:flex; flex-direction:column; gap:12px; }
      .ls-modal-head { display:flex; align-items:center; justify-content:space-between; }
      .ls-field { display:flex; flex-direction:column; gap:5px; font-size:13px; font-weight:600; color:#40454a; }
      .ls-checkbox-field { flex-direction:row; align-items:center; gap:8px; }
      .ls-input { font-family:'Inter'; font-size:14.5px; padding:9px 10px; border-radius:7px; border:1px solid var(--border); background:#fbfbfa; font-weight:400; color:var(--ink); }
      .ls-textarea { resize:vertical; }
      .ls-fineprint { font-size:12px; text-align:center; }
      .ls-admin-tabs { display:flex; gap:6px; flex-wrap:wrap; }

      .ls-footer { text-align:center; font-size:12px; color:#9aa1a6; padding:18px 16px 30px; max-width:640px; margin:0 auto; }

      @media (min-width:720px) {
        .ls-nav-desktop { display:flex; }
        .ls-nav-mobile, .ls-menu-btn { display:none; }
        .ls-report-btn-txt { display:inline; }
        .ls-grid { grid-template-columns:repeat(3,1fr); }
        .ls-counter-strip { grid-template-columns:repeat(4,1fr); }
        .ls-counter-reports { grid-column:auto; }
        .ls-table-head { display:grid; grid-template-columns:2fr 1.3fr 1.3fr 1.6fr .8fr; background:#F0F1EE; font-weight:700; text-transform:uppercase; font-size:11.5px; letter-spacing:.3px; color:#666; }
        .ls-table-row { display:grid; grid-template-columns:2fr 1.3fr 1.3fr 1.6fr .8fr; align-items:center; }
        .ls-table-cell-label::before { content:""; }
        .ls-table-row .ls-btn-sm { justify-self:start; }
      }
    `}</style>
  );
}
