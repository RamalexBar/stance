"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

// Tiempo mínimo que se muestra el splash — es la primera impresión de la
// app, así que aunque Firebase resuelva la sesión al instante, se ve un
// momento como pantalla propia en vez de solo parpadear.
const MIN_SPLASH_MS = 1100;

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minTimeElapsed) return;
    router.replace(user ? "/profile" : "/login");
  }, [user, loading, minTimeElapsed, router]);

  return (
    <div className="splash-screen">
      <Image src="/icon.png" alt="Easy Kite" width={140} height={140} className="splash-icon" priority />
    </div>
  );
}
