import { requireAdmin } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nombre, password, esEstaca } = req.body || {};
    const updates = {};

    // Solo tocamos app_metadata si hay algo que cambiar en nombre o rol.
    // IMPORTANTE: esEstaca solo puede resultar en "leader" o "estaca" —
    // este endpoint nunca puede producir role: "admin", sin importar lo
    // que llegue en el body. El admin raíz solo se crea manualmente.
    if (nombre?.trim() || esEstaca !== undefined) {
      const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (fetchError) return res.status(500).json({ error: fetchError.message });

      // No se permite tocar cuentas de admin desde este endpoint.
      if (existing.user.app_metadata?.role === "admin") {
        return res.status(403).json({ error: "No se puede modificar la cuenta de administrador desde aquí." });
      }

      const currentNombre = nombre?.trim() || existing.user.app_metadata?.nombre || "";
      const currentRole = existing.user.app_metadata?.role === "estaca" ? "estaca" : "leader";
      const newRole = esEstaca === undefined ? currentRole : (esEstaca ? "estaca" : "leader");

      updates.app_metadata = { role: newRole, nombre: currentNombre };
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
      role: data.user.app_metadata?.role,
    });
  }

  if (req.method === "DELETE") {
    // Protección extra: aunque el admin raíz no aparece en la tabla de
    // Líderes de la interfaz, este endpoint tampoco permite borrarlo por
    // si acaso.
    const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (existing.user.app_metadata?.role === "admin") {
      return res.status(403).json({ error: "No se puede eliminar la cuenta de administrador desde aquí." });
    }

    // Aviso: por la relación en la base de datos (ON DELETE CASCADE),
    // borrar a un líder borra también todas sus asignaciones de Barrio
    // (los jóvenes NO se borran, siguen en su Barrio).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
