"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../../hooks/useRequireAuth";
import { apiGet } from "../../../../../lib/api";

interface SessionSummary {
  videoId: string;
  discipline: string;
  createdAt: string;
  techniqueScore: number | null;
  errorCount: number | null;
}

interface ProgressSummary {
  sessions: SessionSummary[];
  totalSessions: number;
  totalSecondsAnalyzed: number;
  improvementTrend: string;
  errorFrequency: Record<string, number>;
  injuries: { id: string; date: string; bodyPart: string; severity: string }[];
}

const TREND_LABEL: Record<string, string> = {
  MEJORANDO: "Mejorando 📈",
  ESTABLE: "Estable →",
  RETROCEDIENDO: "En retroceso 📉",
  SIN_DATOS: "Sin suficientes datos todavía",
};

export default function AthleteProgressPage() {
  const { id, userId } = useParams<{ id: string; userId: string }>();
  const { ready } = useRequireAuth();
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiGet<ProgressSummary>(`/api/v1/groups/${id}/athletes/${userId}/progress`)
      .then(setData)
      .catch(() => setError("No tienes permiso para ver este progreso, o el deportista no pertenece a este grupo."));
  }, [id, userId, ready]);

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href={`/groups/${id}`}>← Volver al grupo</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Progreso del deportista</h1>

      {error && <p className="error-text">{error}</p>}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "20px 0" }}>
            <Stat label="Sesiones" value={String(data.totalSessions)} />
            <Stat label="Minutos analizados" value={(data.totalSecondsAnalyzed / 60).toFixed(1)} />
            <Stat label="Tendencia" value={TREND_LABEL[data.improvementTrend]} />
          </div>

          <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginBottom: 8 }}>Historial</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.sessions.slice().reverse().map((s) => (
              <li key={s.videoId} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-white)" }}>{new Date(s.createdAt).toLocaleDateString()} · {s.discipline}</span>
                <span style={{ color: "var(--color-muted)" }}>
                  {s.techniqueScore != null ? `${s.techniqueScore.toFixed(0)} pts` : "—"} · {s.errorCount ?? 0} errores
                </span>
              </li>
            ))}
          </ul>

          <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 20, marginBottom: 8 }}>Lesiones registradas</h3>
          {data.injuries.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Sin lesiones registradas.</p>
          ) : (
            data.injuries.map((inj) => (
              <p key={inj.id} style={{ color: "var(--color-muted)", fontSize: 13 }}>
                {new Date(inj.date).toLocaleDateString()} · {inj.bodyPart} ({inj.severity})
              </p>
            ))
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 14 }}>
      <div style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--color-white)", fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
