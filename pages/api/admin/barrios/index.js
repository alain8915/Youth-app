import { requireAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { supabase } = auth;

  if (req.method === "GET") {
    const { data, error } = await supabase.from("barrios").select("*").order("nombre");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { nombre } = req.body || {};
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre del Barrio es obligatorio." });

    const { data, error } = await supabase
      .from("barrios")
      .insert({ nombre: nombre.trim() })
      .select()
      .single();

    if (error) {
      const duplicado = /duplicate key|unique/i.test(error.message || "");
      return res.status(400).json({
        error: duplicado ? "Ya existe un Barrio con ese nombre." : error.message,
      });
    }
    return res.status(201).json(data);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
