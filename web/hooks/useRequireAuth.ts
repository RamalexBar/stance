"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

/**
 * Redirige a /login si, una vez resuelto el estado de Firebase Auth, no hay
 * usuario. `ready` solo es true cuando ya sabemos que HAY usuario — las
 * páginas deben usarlo (no `!authLoading`) como gate para disparar su propia
 * carga de datos, así nunca llaman a la API antes de que exista sesión.
 */
export function useRequireAuth() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  return { user, authLoading, ready: !authLoading && !!user };
}
