"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../../../lib/api";
import MovementTimeline from "../../../../components/MovementTimeline";

interface NotDetected {
  maneuver: string;
  reason: string;
}

interface MovementResult {
  segments: any[];
  notDetectedYet: NotDetected[];
}

function JumpsSummary({ segments }: { segments: any[] }) {
  const jumps = segments
    .filter((s) => s.type === "SALTO")
    .map((s) => s.endSeconds - s.startSeconds)
    .filter((seconds) => seconds > 0);

  if (jumps.length === 0) return null;

  const best = Math.max(...jumps);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(23,224,195,0.14), rgba(30,95,255,0.06))",
        border: "1px solid var(--color-turquoise)",
        borderRadius: 12,
        padding: 18,
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <p style={{ color: "var(--color-turquoise)", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
          🪂 SALTOS DETECTADOS
        </p>
        <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
          {jumps.length} salto{jumps.length === 1 ? "" : "s"} en este video
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ color: "var(--color-white)", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
          {best.toFixed(1)}s
        </p>
        <p style={{ color: "var(--color-muted)", fontSize: 12 }}>mejor hangtime</p>
      </div>
    </div>
  );
}

export default function MovementPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [data, setData] = useState<MovementResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [id, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      setState("loading");
      const result = await apiPost<MovementResult>(`/api/v1/videos/${id}/movement`, {});
      setData(result);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg("Este video necesita biomecánica calculada primero.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 760, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Análisis del movimiento</h1>
      <p className="subtitle">Segmentación automática de la sesión</p>

      {state === "loading" && <p className="success-text">Detectando maniobras…</p>}
      {state === "error" && (
        <>
          <p className="error-text">{errorMsg}</p>
          <Link href={`/videos/${id}/biomechanics`} className="btn-secondary" style={{ width: "auto", padding: "10px 16px", display: "inline-block" }}>
            Ir a biomecánica
          </Link>
        </>
      )}

      {state === "ready" && data && (
        <>
          <JumpsSummary segments={data.segments} />

          <MovementTimeline segments={data.segments} />

          <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginTop: 28 }}>
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Maniobras que esta fase todavía NO detecta (y por qué):
            </p>
            <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18 }}>
              {data.notDetectedYet.map((item) => (
                <li key={item.maneuver} style={{ marginBottom: 4 }}>
                  <strong>{item.maneuver}:</strong> {item.reason}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
