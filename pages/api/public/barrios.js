import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// Público a propósito: alguien sin cuenta todavía necesita ver la lista
// de Barrios para elegir uno al registrarse. Solo expone id y nombre.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  const { data, error } = await supabaseAdmin
    .from("barrios")
    .select("id, nombre")
    .order("nombre");

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
