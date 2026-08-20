import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Cliente con la Service Role Key: puede firmar URLs de subida/descarga
 * para CUALQUIER usuario. Por eso vive solo en el backend — nunca se expone
 * al cliente. El cliente (web/mobile) usa su propio SDK de Supabase con la
 * clave anónima solo para EJECUTAR la subida a la URL ya firmada.
 */
export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { persistSession: false },
});

export const VIDEOS_BUCKET = env.supabase.videosBucket;
