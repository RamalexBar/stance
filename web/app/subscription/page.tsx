"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { initializePaddle } from "@paddle/paddle-js";
import { useAuth } from "../../context/AuthContext";
import { apiGet } from "../../lib/api";

interface PlanInfo {
  name: string;
  label: string;
  priceUsdMonthly: number;
  paddlePriceId: string | null;
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
  return (
    <Suspense fallback={null}>
      <SubscriptionPageContent />
    </Suspense>
  );
}

function SubscriptionPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [mine, setMine] = useState<MyStatus | null>(null);
  // Paddle Billing no ofrece una página de pago alojada a la que redirigir
  // (a diferencia de Stripe Checkout) — el checkout se abre como overlay en
  // el navegador con Paddle.js, así que este ref guarda la instancia ya
  // inicializada para abrirlo al hacer clic en "Suscribirse".
  const paddleRef = useRef<Awaited<ReturnType<typeof initializePaddle>> | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  // La app móvil no puede abrir Paddle.js directamente (no tiene SDK nativo),
  // así que su botón "Suscribirse" abre esta página en el navegador del
  // teléfono con ?plan=X — una vez el usuario inicia sesión aquí, se abre el
  // checkout automáticamente en vez de obligarlo a tocar "Suscribirse" de nuevo.
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    apiGet<PlanInfo[]>("/api/v1/subscriptions/plans").then(setPlans).catch(console.error);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    apiGet<MyStatus>("/api/v1/subscriptions/me").then(setMine).catch(console.error);
  }, [user, authLoading]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    initializePaddle({
      token,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
    }).then((paddle) => {
      paddleRef.current = paddle ?? null;
      setPaddleReady(!!paddle);
    });
  }, []);

  const status = searchParams.get("status");
  const requestedPlan = searchParams.get("plan");

  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!requestedPlan || !user || !paddleReady || plans.length === 0) return;
    const plan = plans.find((p) => p.name === requestedPlan);
    if (!plan || plan.name === "FREE") return;
    autoOpenedRef.current = true;
    subscribe(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPlan, user, paddleReady, plans]);

  function subscribe(plan: PlanInfo) {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!plan.paddlePriceId) {
      alert("Ese plan no está disponible para pago (falta configurar el Price ID de Paddle).");
      return;
    }
    if (!paddleRef.current) {
      alert("No se pudo iniciar el pago. Verifica que Paddle esté configurado en el sitio.");
      return;
    }
    paddleRef.current.Checkout.open({
      items: [{ priceId: plan.paddlePriceId, quantity: 1 }],
      customer: user.email ? { email: user.email } : undefined,
      customData: { userId: user.uid },
      settings: {
        successUrl: `${window.location.origin}/subscription?status=success`,
      },
    });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 960, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Planes</h1>
      <p className="subtitle">Elige el plan según cómo usas Easy Kite</p>

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
              <button className="btn-primary" onClick={() => subscribe(p)}>
                Suscribirse
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
