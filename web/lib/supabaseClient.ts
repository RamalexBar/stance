import { createClient } from "@supabase/supabase-js";

// Clave ANÓNIMA (pública): solo puede usarse para subir a una URL ya
// firmada por el backend. No tiene permiso para listar ni leer nada por
// su cuenta — eso lo controla la política de Storage en Supabase.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);
