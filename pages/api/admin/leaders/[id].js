import { requireAdmin } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nombre, password } = req.body || {};
    const updates = {};

    if (nombre?.trim()) {
      // Se preserva el rol actual del usuario (leader/estaca) en vez de
      // forzarlo, para no degradar por accidente a un líder de estaca.
      const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (fetchError) return res.status(500).json({ error: fetchError.message });
      const currentRole = existing.user.app_metadata?.role || "leader";
      updates.app_metadata = { role: currentRole, nombre: nombre.trim() };
    }
    if (password?.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
      }
      updates.password = password;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No hay nada que actualizar." });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      nombre: data.user.app_metadata?.nombre,
    });
  }

  if (req.method === "DELETE") {
    // Aviso: por la relación en la base de datos (ON DELETE CASCADE),
    // borrar a un líder borra también todas las credenciales de jóvenes
    // que él tenía registradas.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
