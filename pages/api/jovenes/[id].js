import { requireUser } from "../../../lib/supabaseServer";
import { encrypt } from "../../../lib/crypto";

export default async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nombre, sistema_usuario, sistema_password, notas, barrio_id } = req.body || {};

    if (!nombre?.trim() || !sistema_usuario?.trim() || !sistema_password?.trim() || !barrio_id) {
      return res.status(400).json({ error: "Nombre, usuario, contraseña y Barrio son obligatorios." });
    }

    const { data, error } = await supabase
      .from("jovenes")
      .update({
        barrio_id,
        nombre: nombre.trim(),
        sistema_usuario: sistema_usuario.trim(),
        sistema_password_encriptado: encrypt(sistema_password),
        notas: notas?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const sinPermiso = /row-level security/i.test(error.message || "");
      return res.status(sinPermiso ? 403 : 500).json({
        error: sinPermiso
          ? "No tienes permiso para mover jóvenes a ese Barrio."
          : error.message,
      });
    }
    if (!data) return res.status(404).json({ error: "No encontrado" });

    return res.status(200).json({
      id: data.id,
      barrio_id: data.barrio_id,
      nombre: data.nombre,
      sistema_usuario: data.sistema_usuario,
      sistema_password,
      notas: data.notas,
    });
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("jovenes").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
