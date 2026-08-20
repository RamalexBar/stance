"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../../../lib/api";

interface VideoDetail {
  id: string;
  discipline: string;
  originalName: string | null;
}

interface ReferenceVideo {
  id: string;
  discipline: string;
  referenceLabel: string | null;
  originalName: string | null;
}

interface Difference {
  metric: string;
  primaryValue: number;
  referenceValue: number;
  delta: number;
  unit: string;
}

interface ComparisonResult {
  primaryScore: number;
  referenceScore: number;
  metricsJson: { differences: Difference[] };
}

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

export default function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [mode, setMode] = useState<"SELF_PREVIOUS" | "PROFESSIONAL">("SELF_PREVIOUS");
  const [referenceOptions, setReferenceOptions] = useState<ReferenceVideo[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiGet<VideoDetail>(`/api/v1/videos/${id}`).then(setVideo).catch(console.error);
  }, [id, ready]);

  useEffect(() => {
    if (mode === "PROFESSIONAL" && video) {
      apiGet<ReferenceVideo[]>(`/api/v1/reference-videos?discipline=${video.discipline}`)
        .then(setReferenceOptions)
        .catch(console.error);
    }
  }, [mode, video]);

  async function runComparison() {
    setState("loading");
    setErrorMsg(null);
    try {
      const body: any = { mode };
      if (mode === "PROFESSIONAL") {
        if (!selectedReferenceId) {
          setState("error");
          setErrorMsg("Elige un video de referencia primero.");
          return;
        }
        body.referenceVideoId = selectedReferenceId;
      }
      const comparison = await apiPost<ComparisonResult>(`/api/v1/videos/${id}/compare`, body);
      setResult(comparison);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg(
        "No se pudo comparar. Verifica que ambos videos tengan biomecánica calculada, y que exista un video anterior (si elegiste ese modo)."
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Comparación</h1>
      <p className="subtitle">{video?.originalName ?? "Cargando…"}</p>

      <div className="field" style={{ maxWidth: 320 }}>
        <label>Comparar contra</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="SELF_PREVIOUS">Mi video anterior (misma disciplina)</option>
          <option value="PROFESSIONAL">Un video de referencia/profesional</option>
        </select>
      </div>

      {mode === "PROFESSIONAL" && (
        <div className="field" style={{ maxWidth: 320 }}>
          <label>Video de referencia</label>
          <select value={selectedReferenceId} onChange={(e) => setSelectedReferenceId(e.target.value)}>
            <option value="">Selecciona…</option>
            {referenceOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.referenceLabel ?? r.originalName ?? r.id}
              </option>
            ))}
          </select>
          {referenceOptions.length === 0 && (
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 6 }}>
              Todavía no hay videos de referencia para esta disciplina. Un Entrenador o
              Admin puede marcar uno desde su propio video.
            </p>
          )}
        </div>
      )}

      <button className="btn-primary" style={{ width: "auto", padding: "12px 24px" }} onClick={runComparison} disabled={state === "loading"}>
        {state === "loading" ? "Comparando…" : "Comparar"}
      </button>

      {state === "error" && <p className="error-text" style={{ marginTop: 12 }}>{errorMsg}</p>}

      {state === "ready" && result && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <ScoreCard label="Tu técnica" score={result.primaryScore} />
            <ScoreCard label={mode === "SELF_PREVIOUS" ? "Tu video anterior" : "Referencia"} score={result.referenceScore} />
          </div>

          <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 16 }}>
            La puntuación mide qué tan cerca está cada video de las zonas técnicas saludables
            definidas en la Fase 6 (no una comparación cuerpo a cuerpo — cada persona tiene
            proporciones distintas).
          </p>

          <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginBottom: 8 }}>Diferencias</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--color-muted)", textAlign: "left" }}>
                <th style={{ padding: 6 }}>Métrica</th>
                <th style={{ padding: 6 }}>Tú</th>
                <th style={{ padding: 6 }}>Referencia</th>
                <th style={{ padding: 6 }}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {result.metricsJson.differences.map((d, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: 6, color: "var(--color-white)" }}>{d.metric}</td>
                  <td style={{ padding: 6, color: "var(--color-muted)" }}>{fmt(d.primaryValue)}{d.unit}</td>
                  <td style={{ padding: 6, color: "var(--color-muted)" }}>{fmt(d.referenceValue)}{d.unit}</td>
                  <td style={{ padding: 6, color: d.delta > 0 ? "#FFB020" : "#17E0C3" }}>
                    {d.delta > 0 ? "+" : ""}{fmt(d.delta)}{d.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, flex: 1, textAlign: "center" }}>
      <div style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "var(--color-turquoise)", fontSize: 28, fontWeight: 700 }}>{score.toFixed(0)}</div>
    </div>
  );
}
