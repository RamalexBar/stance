import * as FileSystem from "expo-file-system";
import { firebaseAuthClient } from "../firebase/firebaseConfig";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function authHeader(): Promise<Record<string, string>> {
  const currentUser = firebaseAuthClient.currentUser;
  if (!currentUser) return {};
  const idToken = await currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

/** Descarga un archivo autenticado (PDF/Excel) al almacenamiento local del dispositivo. */
export async function apiDownloadFile(path: string, filename: string): Promise<string> {
  const headers = await authHeader();
  const fileUri = FileSystem.documentDirectory + filename;
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, fileUri, { headers });
  if (result.status !== 200) {
    throw new Error(`Error ${result.status} al descargar ${path}`);
  }
  return result.uri;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  const json = await res.json();
  return json.data as T;
}
