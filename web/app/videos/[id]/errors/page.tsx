"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiPost } from "../../../../lib/api";

interface Finding {
  type: string;
  level: "LEVE" | "MODERADO" | "ALTO";
  measuredValue: number;
  description: string;
  impact: string;
  howToFix: string;
  exercises: string[];
}

interface NotDetected {
  type: string;
  reason: string;
}

const LEVEL_COLOR: Record<string, string> = {
  LEVE: "#FFB020",
  MODERADO: "#FF8A3D",
  ALTO: "#FF6B6B",
};

export default function ErrorsPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [notDetected, setNotDetected] = useState<NotDetected[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [id, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      setState("loading");
      const result = await apiPost<{ findings: Finding[]; notDetectedYet: NotDetected[] }>(
        `/api/v1/videos/${id}/errors`,
        {}
      );
      setFindings(result.findings);
      setNotDetected(result.notDetectedYet);
      setState("ready");
    } catch {
      setState("error");
      setErrorMsg("Este video necesita biomecánica y análisis de movimiento calculados primero.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 760, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Errores técnicos</h1>
      <p className="subtitle">Detección automática basada en reglas biomecánicas</p>

      {state === "loading" && <p className="success-text">Analizando…</p>}
      {state === "error" && (
        <>
          <p className="error-text">{errorMsg}</p>
          <Link href={`/videos/${id}/movement`} className="btn-secondary" style={{ width: "auto", padding: "10px 16px", display: "inline-block" }}>
            Ir a análisis de movimiento
          </Link>
        </>
      )}

      {state === "ready" && findings && (
        <>
          {findings.length === 0 && (
            <p className="success-text">No se detectaron errores con las reglas actuales. 🎉</p>
          )}

          {findings.map((f, i) => (
            <div
              key={i}
              style={{
                background: "var(--color-black-soft)",
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
                borderLeft: `4px solid ${LEVEL_COLOR[f.level]}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--color-white)" }}>
                  {f.type.replaceAll("_", " ")}
                </strong>
                <span style={{ color: LEVEL_COLOR[f.level], fontSize: 12, fontWeight: 700 }}>
                  {f.level}
                </span>
              </div>
              <p style={{ color: "var(--color-muted)", fontSize: 13, marginTop: 8 }}>{f.description}</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>
                <strong style={{ color: "var(--color-white)" }}>Impacto: </strong>
                <span style={{ color: "var(--color-muted)" }}>{f.impact}</span>
              </p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                <strong style={{ color: "var(--color-white)" }}>Cómo corregirlo: </strong>
                <span style={{ color: "var(--color-muted)" }}>{f.howToFix}</span>
              </p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                <strong style={{ color: "var(--color-white)" }}>Ejercicios: </strong>
                <span style={{ color: "var(--color-muted)" }}>{f.exercises.join(" · ")}</span>
              </p>
            </div>
          ))}

          <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginTop: 20 }}>
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Errores que esta fase todavía no detecta:
            </p>
            <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18 }}>
              {notDetected.map((item) => (
                <li key={item.type} style={{ marginBottom: 4 }}>
                  <strong>{item.type.replaceAll("_", " ")}:</strong> {item.reason}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
