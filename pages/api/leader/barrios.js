import { requireUser } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  // RLS ya limita esto a las filas del propio líder, pero filtramos
  // explícito también por claridad.
  const { data, error } = await supabase
    .from("leader_barrios")
    .select("barrio_id, barrios(nombre)")
    .eq("leader_id", user.id);

  if (error) return res.status(500).json({ error: error.message });

  const barrios = data.map((r) => ({ id: r.barrio_id, nombre: r.barrios?.nombre || "" }));
  return res.status(200).json(barrios);
}
