"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/profile" : "/login");
  }, [user, loading, router]);

  return (
    <div className="auth-shell">
      <p style={{ color: "var(--color-muted)" }}>Cargando Easy Kite…</p>
    </div>
  );
}
