import { requireAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { supabase } = auth;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("leader_barrios")
      .select("leader_id, barrio_id, barrios(nombre)");

    if (error) return res.status(500).json({ error: error.message });

    const asignaciones = data.map((r) => ({
      leader_id: r.leader_id,
      barrio_id: r.barrio_id,
      barrio_nombre: r.barrios?.nombre || "",
    }));
    return res.status(200).json(asignaciones);
  }

  if (req.method === "POST") {
    const { leader_id, barrio_id } = req.body || {};
    if (!leader_id || !barrio_id) return res.status(400).json({ error: "Faltan datos." });

    const { error } = await supabase.from("leader_barrios").insert({ leader_id, barrio_id });
    if (error) {
      const yaAsignado = /duplicate key/i.test(error.message || "");
      return res.status(400).json({
        error: yaAsignado ? "Ese líder ya está asignado a ese Barrio." : error.message,
      });
    }
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { leader_id, barrio_id } = req.query;
    if (!leader_id || !barrio_id) return res.status(400).json({ error: "Faltan datos." });

    const { error } = await supabase
      .from("leader_barrios")
      .delete()
      .eq("leader_id", leader_id)
      .eq("barrio_id", barrio_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
