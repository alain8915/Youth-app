import { requireUser, isAdmin } from "../../../lib/supabaseServer";
import { encrypt } from "../../../lib/crypto";

export default async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  const admin = isAdmin(user);
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nombre, sistema_usuario, sistema_password, notas, leader_id } = req.body || {};

    if (!nombre?.trim() || !sistema_usuario?.trim() || !sistema_password?.trim()) {
      return res.status(400).json({ error: "Nombre, usuario y contraseña son obligatorios." });
    }

    const updates = {
      nombre: nombre.trim(),
      sistema_usuario: sistema_usuario.trim(),
      sistema_password_encriptado: encrypt(sistema_password),
      notas: notas?.trim() || null,
    };

    // Solo el admin puede reasignar un joven a otro líder. Si un líder
    // manda leader_id, se ignora (además RLS lo bloquearía de todas formas).
    if (admin && leader_id) {
      updates.leader_id = leader_id;
    }

    const { data, error } = await supabase
      .from("jovenes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "No encontrado" });

    return res.status(200).json({
      id: data.id,
      leader_id: data.leader_id,
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
