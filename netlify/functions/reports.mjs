export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const report = await request.json();
    if (!report.serviceId || !report.problemType) return Response.json({ success: false, message: "Serviço e tipo de problema são obrigatórios." }, { status: 400 });
    // Netlify Functions são sem estado. A persistência dos relatos será ligada a um banco
    // antes de eles influenciarem o status público.
    return Response.json({ success: true, message: "Relato recebido para análise; ele não altera o status oficial automaticamente." }, { status: 202 });
  } catch {
    return Response.json({ success: false, message: "Não foi possível processar o relato." }, { status: 400 });
  }
};
