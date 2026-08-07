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

// "admin" (nivel general del sistema) y "estaca" (líder de estaca) tienen
// el mismo nivel de acceso: ambos ven y administran todos los Barrios,
// líderes de barrio, y jóvenes. La diferencia es solo de etiqueta/contexto.
const STAFF_ROLES = ["admin", "estaca"];

export function isAdmin(user) {
  return STAFF_ROLES.includes(user?.app_metadata?.role);
}

// Igual que requireUser, pero además exige rol admin o estaca.
export async function requireAdmin(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) return null;
  if (!isAdmin(auth.user)) {
    res.status(403).json({ error: "Esta acción requiere permisos de administrador o de estaca." });
    return null;
  }
  return auth;
}
