"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../lib/api";

interface PlanInfo {
  name: string;
  label: string;
  priceUsdMonthly: number;
  maxVideosPerMonth: number;
  maxGroups: number;
  maxAthletesPerGroup: number;
  maxNewEnrollmentsPerMonth: number;
  allowReferenceComparison: boolean;
  allowReports: boolean;
}

interface MyStatus {
  plan: string;
  config: PlanInfo;
}

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [mine, setMine] = useState<MyStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PlanInfo[]>("/api/v1/subscriptions/plans").then(setPlans).catch(console.error);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    apiGet<MyStatus>("/api/v1/subscriptions/me").then(setMine).catch(console.error);
  }, [user, authLoading]);

  const status = searchParams.get("status");

  async function subscribe(planName: string) {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(planName);
    try {
      const result = await apiPost<{ url: string }>("/api/v1/subscriptions/checkout", { plan: planName });
      window.location.href = result.url;
    } catch (err) {
      alert("No se pudo iniciar el pago. Verifica que Stripe esté configurado en el servidor.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 960, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Planes</h1>
      <p className="subtitle">Elige el plan según cómo usas Stance</p>

      {status === "success" && <p className="success-text">¡Suscripción exitosa! Puede tardar unos segundos en reflejarse.</p>}
      {status === "canceled" && <p style={{ color: "var(--color-muted)" }}>Pago cancelado.</p>}

      {mine && (
        <p style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 20 }}>
          Tu plan actual: <strong style={{ color: "var(--color-turquoise)" }}>{mine.config.label}</strong>
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              background: "var(--color-black-soft)",
              borderRadius: 12,
              padding: 20,
              border: mine?.plan === p.name ? "1px solid var(--color-turquoise)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 style={{ color: "var(--color-white)", margin: 0 }}>{p.label}</h3>
            <p style={{ color: "var(--color-turquoise)", fontSize: 24, fontWeight: 700, margin: "8px 0" }}>
              ${p.priceUsdMonthly}
              <span style={{ fontSize: 12, color: "var(--color-muted)" }}>/mes</span>
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 12, color: "var(--color-muted)" }}>
              <li>{p.maxVideosPerMonth === null || p.maxVideosPerMonth > 999 ? "Videos ilimitados" : `${p.maxVideosPerMonth} videos/mes`}</li>
              {p.maxGroups > 0 && <li>Hasta {p.maxGroups} grupo(s)</li>}
              {p.maxGroups > 0 && <li>{p.maxNewEnrollmentsPerMonth} inscripciones nuevas/mes</li>}
              <li>{p.allowReferenceComparison ? "Comparación con referencia ✓" : "Sin comparación con referencia"}</li>
              <li>{p.allowReports ? "Reportes PDF/Excel ✓" : "Sin reportes"}</li>
            </ul>
            {p.name !== "FREE" && mine?.plan !== p.name && (
              <button
                className="btn-primary"
                onClick={() => subscribe(p.name)}
                disabled={busy === p.name}
              >
                {busy === p.name ? "Redirigiendo…" : "Suscribirse"}
              </button>
            )}
            {mine?.plan === p.name && (
              <p style={{ color: "var(--color-turquoise)", fontSize: 12, textAlign: "center" }}>Plan actual</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
