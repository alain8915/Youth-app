import { requireUser, isAdmin } from "../../../lib/supabaseServer";
import { encrypt, decrypt } from "../../../lib/crypto";

export default async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  const admin = isAdmin(user);

  if (req.method === "GET") {
    // Si es líder, RLS ya filtra para devolver solo sus jóvenes.
    // Si es admin, la política admin_full_access permite ver todos.
    const { data, error } = await supabase
      .from("jovenes")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const jovenes = data.map((j) => ({
      id: j.id,
      leader_id: j.leader_id,
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: decrypt(j.sistema_password_encriptado),
      notas: j.notas,
      created_at: j.created_at,
    }));

    return res.status(200).json(jovenes);
  }

  if (req.method === "POST") {
    const { nombre, sistema_usuario, sistema_password, notas, leader_id } = req.body || {};

    if (!nombre?.trim() || !sistema_usuario?.trim() || !sistema_password?.trim()) {
      return res.status(400).json({ error: "Nombre, usuario y contraseña son obligatorios." });
    }

    // Un líder siempre crea jóvenes bajo su propia cuenta. Un admin debe
    // indicar explícitamente a qué líder pertenece el nuevo joven.
    let targetLeaderId = user.id;
    if (admin) {
      if (!leader_id) {
        return res.status(400).json({ error: "Selecciona a qué líder pertenece este joven." });
      }
      targetLeaderId = leader_id;
    }

    const { data, error } = await supabase
      .from("jovenes")
      .insert({
        leader_id: targetLeaderId,
        nombre: nombre.trim(),
        sistema_usuario: sistema_usuario.trim(),
        sistema_password_encriptado: encrypt(sistema_password),
        notas: notas?.trim() || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      id: data.id,
      leader_id: data.leader_id,
      nombre: data.nombre,
      sistema_usuario: data.sistema_usuario,
      sistema_password,
      notas: data.notas,
      created_at: data.created_at,
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
