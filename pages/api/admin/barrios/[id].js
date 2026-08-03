import { requireAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nombre } = req.body || {};
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });

    const { data, error } = await supabase
      .from("barrios")
      .update({ nombre: nombre.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("barrios").delete().eq("id", id);
    if (error) {
      // La FK "on delete restrict" en jovenes.barrio_id impide borrar un
      // Barrio que todavía tenga jóvenes asignados.
      const enUso = /foreign key|violates/i.test(error.message || "");
      return res.status(400).json({
        error: enUso
          ? "No se puede eliminar: todavía hay jóvenes en este Barrio. Reasígnalos o elimínalos primero."
          : error.message,
      });
    }
    return res.status(204).end();
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
