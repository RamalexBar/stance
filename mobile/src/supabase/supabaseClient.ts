import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Se crea perezosamente (no al importar el módulo): si faltan las env vars,
// queremos que solo falle la pantalla que efectivamente sube el video, no
// que tumbe toda la app al arrancar (App.tsx importa VideosScreen de forma
// estática, y este módulo se importa desde ahí).
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "La app no tiene configurado Supabase (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  }
  return client;
}

/**
 * Sube un archivo local a una signed upload URL de Supabase Storage
 * transmitiéndolo directamente desde disco (FileSystem.uploadAsync, nativo),
 * sin pasar por `fetch().blob()` en JS. La versión con `supabaseClient.storage
 * .uploadToSignedUrl(...)` requiere cargar el archivo completo en memoria
 * como Blob antes de subirlo — para un video de hasta 60s eso puede acercarse
 * o superar el límite de memoria de dispositivos gama baja/media.
 *
 * Replica el mismo endpoint que usa el SDK internamente
 * (`PUT /storage/v1/object/upload/sign/{bucket}/{path}?token=...`) con el
 * archivo como cuerpo binario crudo, en vez de multipart.
 */
export async function uploadVideoToSignedUrl(params: {
  bucket: string;
  storagePath: string;
  token: string;
  fileUri: string;
  mimeType?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "La app no tiene configurado Supabase (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${params.bucket}/${params.storagePath}?token=${encodeURIComponent(params.token)}`;

  const result = await FileSystem.uploadAsync(uploadUrl, params.fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "x-upsert": "false",
      "cache-control": "3600",
      "content-type": params.mimeType ?? "video/mp4",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Supabase Storage respondió ${result.status}: ${result.body}`);
  }
}
