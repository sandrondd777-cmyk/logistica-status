import { fetchNfeAvailability } from "./status.mjs";

export default async () => {
  try {
    const data = await fetchNfeAvailability();
    return Response.json({ ...data, error: null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ rows: [], checkedAt: null, error: error.message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
};
