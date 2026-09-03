import { firebaseAuthClient } from "./firebase";

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === "production") {
  // Sin esta variable, todas las llamadas irían silenciosamente a localhost
  // (inalcanzable en producción) y parecerían errores genéricos de red.
  throw new Error(
    "Falta la variable de entorno NEXT_PUBLIC_API_URL en este build de producción."
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function authHeader(): Promise<Record<string, string>> {
  const currentUser = firebaseAuthClient.currentUser;
  if (!currentUser) return {};
  const idToken = await currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const json = await res.json();
    if (typeof json?.message === "string") message = json.message;
    else if (typeof json?.error === "string") message = json.error;
  } catch {
    // el body no era JSON (p. ej. 502 de un proxy); usamos el mensaje genérico
  }
  throw new Error(message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} al consultar ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiDownload(path: string, filename: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} al descargar ${path}`);
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return blob;
}
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} al actualizar ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} al crear ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} al eliminar ${path}`);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, `Error ${res.status} en ${path}`);
  const json = await res.json();
  return json.data as T;
}
