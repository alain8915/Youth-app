import { requireAdmin } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) return res.status(500).json({ error: error.message });

    const leaders = data.users
      .filter((u) => u.app_metadata?.role !== "admin")
      .map((u) => ({
        id: u.id,
        email: u.email,
        nombre: u.app_metadata?.nombre || "(sin nombre)",
      }));

    return res.status(200).json(leaders);
  }

  if (req.method === "POST") {
    const { nombre, email, password } = req.body || {};
    if (!nombre?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      app_metadata: { role: "leader", nombre: nombre.trim() },
    });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      id: data.user.id,
      email: data.user.email,
      nombre: nombre.trim(),
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} no permitido` });
}
