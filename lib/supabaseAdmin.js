import { createClient } from "@supabase/supabase-js";

// ADVERTENCIA: este cliente usa la Service Role Key, que tiene acceso total
// a la base de datos y a la administración de usuarios (crear/borrar
// cuentas). SOLO debe usarse dentro de archivos en pages/api/** (código de
// servidor). Nunca lo importes desde un componente de React ni expongas
// SUPABASE_SERVICE_ROLE_KEY como variable NEXT_PUBLIC_*.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
