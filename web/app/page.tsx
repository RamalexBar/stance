"use client";

import { useEffect } from "react";
import Image from "next/image";
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
      <div style={{ textAlign: "center" }}>
        <Image
          src="/icon.png"
          alt="Easy Kite"
          width={96}
          height={96}
          style={{ borderRadius: 20, display: "block", margin: "0 auto 16px" }}
          priority
        />
        <p style={{ color: "var(--color-muted)" }}>Cargando Easy Kite…</p>
      </div>
    </div>
  );
}
