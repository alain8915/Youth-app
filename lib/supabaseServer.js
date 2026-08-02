import { createClient } from "@supabase/supabase-js";

// Crea un cliente de Supabase que actúa "como" el líder que hizo la
// petición (usando su token de sesión), para que las políticas de Row
// Level Security en la base de datos apliquen automáticamente.
export function getSupabaseForRequest(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function requireUser(req, res) {
  const supabase = getSupabaseForRequest(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: "No autorizado. Inicia sesión de nuevo." });
    return null;
  }
  return { supabase, user };
}

export function isAdmin(user) {
  return user?.app_metadata?.role === "admin";
}

// Igual que requireUser, pero además exige que el usuario tenga rol admin.
export async function requireAdmin(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return null;
  if (!isAdmin(auth.user)) {
    res.status(403).json({ error: "Esta acción requiere permisos de administrador." });
    return null;
  }
  return auth;
}
