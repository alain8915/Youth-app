import { requireUser } from "../../../lib/supabaseServer";
import { encrypt, decrypt } from "../../../lib/crypto";

export default async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  if (req.method === "GET") {
    // RLS filtra automáticamente: un líder ve solo los jóvenes de los
    // Barrios a los que está asignado; el admin ve todos.
    const { data, error } = await supabase
      .from("jovenes")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const jovenes = data.map((j) => ({
      id: j.id,
      barrio_id: j.barrio_id,
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: decrypt(j.sistema_password_encriptado),
      notas: j.notas,
      created_at: j.created_at,
    }));

    return res.status(200).json(jovenes);
  }

  if (req.method === "POST") {
    const { nombre, sistema_usuario, sistema_password, notas, barrio_id } = req.body || {};

    if (!nombre?.trim() || !sistema_usuario?.trim() || !sistema_password?.trim() || !barrio_id) {
      return res.status(400).json({ error: "Nombre, usuario, contraseña y Barrio son obligatorios." });
    }

    const { data, error } = await supabase
      .from("jovenes")
      .insert({
        barrio_id,
        nombre: nombre.trim(),
        sistema_usuario: sistema_usuario.trim(),
        sistema_password_encriptado: encrypt(sistema_password),
        notas: notas?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      // RLS bloquea insertar en un Barrio al que el líder no está asignado.
      const sinPermiso = /row-level security/i.test(error.message || "");
      return res.status(sinPermiso ? 403 : 500).json({
        error: sinPermiso
          ? "No tienes permiso para agregar jóvenes a ese Barrio."
          : error.message,
      });
    }

    return res.status(201).json({
      id: data.id,
      barrio_id: data.barrio_id,
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
