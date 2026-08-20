"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiPost } from "../../../../lib/api";

interface CoachPlanData {
  resumen: string;
  fortalezas: string[];
  erroresExplicados: { type: string; explicacion: string }[];
  planMejora: string;
  planSemanal: { dia: string; enfoque: string; ejercicios: string[] }[];
  planMensual: { semana: number; objetivo: string }[];
  ejerciciosPrioritarios: string[];
  sugerenciasBusqueda: string[];
}

interface CoachPlanRecord {
  planJson: CoachPlanData;
}

export default function CoachPlanPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();
  const [plan, setPlan] = useState<CoachPlanData | null>(null);
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function generate() {
    setState("loading");
    setErrorMsg(null);
    try {
      const result = await apiPost<CoachPlanRecord>(`/api/v1/videos/${id}/coach-plan`, {
        userNotes: notes || undefined,
      });
      setPlan(result.planJson);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg(
        "No se pudo generar el plan. Verifica que este video tenga biomecánica, movimiento y errores calculados."
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 760, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Entrenador IA</h1>
      <p className="subtitle">Plan personalizado generado a partir de tu análisis</p>

      {state !== "ready" && (
        <>
          <div className="field" style={{ maxWidth: 480 }}>
            <label>Notas para el entrenador (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. me duele la rodilla derecha, quiero enfocarme en saltos"
            />
          </div>
          <button className="btn-primary" style={{ width: "auto", padding: "12px 24px" }} onClick={generate} disabled={state === "loading"}>
            {state === "loading" ? "Generando plan…" : "Generar plan"}
          </button>
          {state === "error" && <p className="error-text" style={{ marginTop: 12 }}>{errorMsg}</p>}
        </>
      )}

      {state === "ready" && plan && (
        <div style={{ marginTop: 20 }}>
          <Section title="Resumen">
            <p style={{ color: "var(--color-muted)", fontSize: 14 }}>{plan.resumen}</p>
          </Section>

          <Section title="Fortalezas">
            <ul style={{ paddingLeft: 18 }}>
              {plan.fortalezas.map((f, i) => (
                <li key={i} style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 4 }}>{f}</li>
              ))}
            </ul>
          </Section>

          <Section title="Errores explicados">
            {plan.erroresExplicados.map((e, i) => (
              <p key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                <strong style={{ color: "var(--color-white)" }}>{e.type.replaceAll("_", " ")}: </strong>
                <span style={{ color: "var(--color-muted)" }}>{e.explicacion}</span>
              </p>
            ))}
          </Section>

          <Section title="Prioridad de mejora">
            <p style={{ color: "var(--color-muted)", fontSize: 14 }}>{plan.planMejora}</p>
          </Section>

          <Section title="Plan semanal">
            {plan.planSemanal.map((d, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--color-white)", fontSize: 13 }}>{d.dia}: </strong>
                <span style={{ color: "var(--color-muted)", fontSize: 13 }}>{d.enfoque}</span>
                <ul style={{ paddingLeft: 18, marginTop: 2 }}>
                  {d.ejercicios.map((ex, j) => (
                    <li key={j} style={{ color: "var(--color-muted)", fontSize: 12 }}>{ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section title="Plan mensual">
            {plan.planMensual.map((s, i) => (
              <p key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                <strong style={{ color: "var(--color-white)" }}>Semana {s.semana}: </strong>
                <span style={{ color: "var(--color-muted)" }}>{s.objetivo}</span>
              </p>
            ))}
          </Section>

          <Section title="Ejercicios prioritarios">
            <ul style={{ paddingLeft: 18 }}>
              {plan.ejerciciosPrioritarios.map((ex, i) => (
                <li key={i} style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 4 }}>{ex}</li>
              ))}
            </ul>
          </Section>

          <Section title="Para buscar en YouTube">
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 8 }}>
              Consultas sugeridas, no videos verificados por la plataforma — búscalas tú mismo:
            </p>
            <ul style={{ paddingLeft: 18 }}>
              {plan.sugerenciasBusqueda.map((s, i) => (
                <li key={i} style={{ color: "var(--color-turquoise)", fontSize: 13, marginBottom: 4 }}>"{s}"</li>
              ))}
            </ul>
          </Section>

          <button className="btn-secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setState("idle")}>
            Generar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <h3 style={{ color: "var(--color-white)", fontSize: "0.95rem", marginTop: 0, marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
  );
}
