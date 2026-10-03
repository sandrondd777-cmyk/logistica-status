import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const store = () => getStore("logistica-support-incidents");

export default async (request) => {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "PATCH") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const blobStore = store();
    const incidents = (await blobStore.get("incidents", { type: "json" })) || [];

    if (request.method === "GET") {
      return json({ incidents, updatedAt: new Date().toISOString() });
    }

    const payload = await request.json();
    if (request.method === "POST") {
      if (!payload.serviceId || !payload.problemType || !payload.description?.trim()) {
        return json({ error: "Serviço, tipo e descrição são obrigatórios." }, 400);
      }
      const incident = {
        id: crypto.randomUUID(),
        serviceId: String(payload.serviceId).slice(0, 100),
        serviceName: String(payload.serviceName || "Serviço").slice(0, 120),
        problemType: String(payload.problemType).slice(0, 100),
        description: String(payload.description).trim().slice(0, 2000),
        status: "aberto",
        owner: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      incidents.unshift(incident);
      await blobStore.setJSON("incidents", incidents.slice(0, 1000));
      return json({ incident }, 201);
    }

    const { id, status, owner } = payload;
    const allowed = ["aberto", "investigando", "acompanhando", "resolvido"];
    const index = incidents.findIndex((item) => item.id === id);
    if (index < 0) return json({ error: "Ocorrência não encontrada." }, 404);
    if (status && !allowed.includes(status)) return json({ error: "Estado inválido." }, 400);
    incidents[index] = {
      ...incidents[index],
      ...(status ? { status } : {}),
      ...(typeof owner === "string" ? { owner: owner.slice(0, 120) } : {}),
      updatedAt: new Date().toISOString(),
    };
    await blobStore.setJSON("incidents", incidents);
    return json({ incident: incidents[index] });
  } catch (error) {
    console.error("Falha ao acessar o armazenamento de ocorrências", error);
    return json({ error: "Armazenamento indisponível. Confira a configuração do Netlify Blobs." }, 503);
  }
};
