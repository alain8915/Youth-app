import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// Público a propósito: es el punto de entrada para que un líder cree su
// propia cuenta. La única barrera es el código de registro
// (LEADER_SIGNUP_CODE), que solo conocen las personas autorizadas.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  const { nombre, email, password, codigo, barrio_id } = req.body || {};

  if (!nombre?.trim() || !email?.trim() || !password?.trim() || !codigo?.trim() || !barrio_id) {
    return res.status(400).json({ error: "Todos los campos son obligatorios, incluyendo el Barrio." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const expectedCode = process.env.LEADER_SIGNUP_CODE;
  if (!expectedCode) {
    return res.status(500).json({
      error: "El auto-registro no está configurado todavía. Pide al administrador que lo active.",
    });
  }
  if (codigo.trim() !== expectedCode) {
    return res.status(403).json({ error: "Código de registro incorrecto." });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { role: "leader", nombre: nombre.trim() },
  });

  if (error) {
    const yaExiste = /already been registered|already registered|already exists/i.test(error.message || "");
    return res.status(400).json({
      error: yaExiste ? "Ese correo ya tiene una cuenta registrada." : error.message,
    });
  }

  // Asigna al nuevo líder al Barrio que eligió. Si esto falla, deshacemos
  // la creación de la cuenta para no dejar un líder "huérfano" sin Barrio.
  const { error: assignError } = await supabaseAdmin
    .from("leader_barrios")
    .insert({ leader_id: data.user.id, barrio_id });

  if (assignError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(400).json({ error: "No se pudo asignar el Barrio seleccionado. Intenta de nuevo." });
  }

  return res.status(201).json({ id: data.user.id, email: data.user.email });
}
