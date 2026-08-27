"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../lib/api";
import MetricChart from "../../components/MetricChart";
import TodayConditionsBanner from "../../components/TodayConditionsBanner";

interface SessionSummary {
  videoId: string;
  discipline: string;
  createdAt: string;
  durationSeconds: number | null;
  techniqueScore: number | null;
  errorCount: number | null;
  maxJumpExcursionRelative: number | null;
  bestHangtimeSeconds: number | null;
  maxJumpHeightMeters: number | null;
  avgSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  distanceMeters: number | null;
}

interface Injury {
  id: string;
  date: string;
  bodyPart: string;
  severity: string;
  description: string | null;
}

interface InjuryErrorCorrelation {
  bodyPart: string;
  errorType: string;
  errorCount: number;
}

interface DashboardSummary {
  sessions: SessionSummary[];
  totalSessions: number;
  totalSecondsAnalyzed: number;
  disciplineBreakdown: Record<string, number>;
  errorFrequency: Record<string, number>;
  trainingFrequency: { week: string; count: number }[];
  weeklyStreak: number;
  improvementTrend: string;
  scoreProgress: { firstVideoId: string; lastVideoId: string; first: number; last: number; delta: number } | null;
  injuries: Injury[];
  injuryErrorCorrelations: InjuryErrorCorrelation[];
  notAvailable: { metric: string; reason: string }[];
  maxRelativeJumpExcursion: number;
  maxHangtimeSeconds: number;
  bestJumpHeightMeters: number;
  jumpHeightCalibrated: boolean;
  recordSpeedKmh: number;
  totalDistanceMeters: number;
}

const TREND_LABEL: Record<string, string> = {
  MEJORANDO: "Mejorando 📈",
  ESTABLE: "Estable →",
  RETROCEDIENDO: "En retroceso 📉",
  SIN_DATOS: "Sin suficientes datos todavía",
};

function fmtMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}

export default function DashboardPage() {
  const { ready } = useRequireAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [bodyPart, setBodyPart] = useState("");
  const [severity, setSeverity] = useState("LEVE");
  const [description, setDescription] = useState("");
  const [injuryError, setInjuryError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoadError(null);
    try {
      const result = await apiGet<DashboardSummary>("/api/v1/dashboard/summary");
      setData(result);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
    }
  }

  async function addInjury() {
    if (!bodyPart) return;
    setInjuryError(null);
    try {
      await apiPost("/api/v1/injuries", {
        date: new Date().toISOString(),
        bodyPart,
        severity,
        description: description || undefined,
      });
      setBodyPart("");
      setDescription("");
      setShowInjuryForm(false);
      load();
    } catch (err) {
      setInjuryError(err instanceof Error ? err.message : "No se pudo registrar la lesión.");
    }
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 820, margin: "0 auto" }}>
        <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
          <Link href="/profile">← Volver al perfil</Link>
        </p>
        {loadError ? (
          <>
            <p className="error-text">{loadError}</p>
            <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px", marginTop: 12 }} onClick={load}>
              Reintentar
            </button>
          </>
        ) : (
          <p style={{ color: "var(--color-muted)" }}>Cargando…</p>
        )}
      </div>
    );
  }

  const scoreSeries = data.sessions
    .filter((s) => s.techniqueScore !== null)
    .map((s) => ({ tSeconds: new Date(s.createdAt).getTime() / 86400000, techniqueScore: s.techniqueScore! }));

  const hangtimeSeries = data.sessions
    .filter((s) => s.bestHangtimeSeconds !== null)
    .map((s) => ({ tSeconds: new Date(s.createdAt).getTime() / 86400000, hangtime: s.bestHangtimeSeconds! }));

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 820, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Dashboard</h1>
      <p className="subtitle">Tu progreso a lo largo del tiempo</p>

      <TodayConditionsBanner />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <Stat label="Sesiones analizadas" value={String(data.totalSessions)} />
        <Stat label="Tiempo total analizado" value={`${fmtMinutes(data.totalSecondsAnalyzed)} min`} />
        <Stat
          label="Racha semanal"
          value={data.weeklyStreak > 0 ? `🔥 ${data.weeklyStreak} semana${data.weeklyStreak === 1 ? "" : "s"}` : "—"}
        />
        <Stat label="Tendencia" value={TREND_LABEL[data.improvementTrend]} />
      </div>

      {data.maxHangtimeSeconds > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(23,224,195,0.14), rgba(30,95,255,0.06))",
            border: "1px solid var(--color-turquoise)",
            borderRadius: 12,
            padding: 18,
            marginBottom: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ color: "var(--color-turquoise)", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              🏆 RÉCORD PERSONAL
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Mejor hangtime en todas tus sesiones</p>
          </div>
          <p style={{ color: "var(--color-white)", fontSize: 32, fontWeight: 700 }}>
            {data.maxHangtimeSeconds.toFixed(1)}s
          </p>
        </div>
      )}

      {data.bestJumpHeightMeters > 0 ? (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255,196,0,0.14), rgba(30,95,255,0.06))",
            border: "1px solid #FFC400",
            borderRadius: 12,
            padding: 18,
            marginBottom: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ color: "#FFC400", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              🚀 SALTO MÁS ALTO
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
              Estimado a partir del video, calibrado con tu estatura — no es una medición de laboratorio.
            </p>
          </div>
          <p style={{ color: "var(--color-white)", fontSize: 32, fontWeight: 700 }}>
            {data.bestJumpHeightMeters.toFixed(2)} m
          </p>
        </div>
      ) : !data.jumpHeightCalibrated && data.maxHangtimeSeconds > 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 28 }}>
          Agrega tu estatura en tu <Link href="/profile">perfil</Link> para ver la altura estimada de tus saltos en metros.
        </p>
      ) : null}

      {data.recordSpeedKmh > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(30,95,255,0.14), rgba(23,224,195,0.06))",
            border: "1px solid var(--color-blue)",
            borderRadius: 12,
            padding: 18,
            marginBottom: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p style={{ color: "var(--color-blue)", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              🌊 VELOCIDAD Y DISTANCIA
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
              Medido por GPS en las sesiones grabadas desde la app
            </p>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <div>
              <p style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 2 }}>Velocidad punta</p>
              <p style={{ color: "var(--color-white)", fontSize: 28, fontWeight: 700 }}>
                {data.recordSpeedKmh.toFixed(1)} km/h
              </p>
            </div>
            <div>
              <p style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 2 }}>Distancia total</p>
              <p style={{ color: "var(--color-white)", fontSize: 28, fontWeight: 700 }}>
                {(data.totalDistanceMeters / 1000).toFixed(1)} km
              </p>
            </div>
          </div>
        </div>
      )}

      {scoreSeries.length >= 2 && (
        <MetricChart
          title="Puntuación técnica en el tiempo"
          series={scoreSeries}
          yLabel="puntuación (0-100)"
          lines={[{ key: "techniqueScore", label: "Puntuación", color: "#17E0C3" }]}
        />
      )}

      {hangtimeSeries.length >= 2 && (
        <MetricChart
          title="Hangtime en el tiempo"
          series={hangtimeSeries}
          yLabel="segundos"
          lines={[{ key: "hangtime", label: "Hangtime", color: "#1E5FFF" }]}
        />
      )}

      {data.scoreProgress && (
        <div
          style={{
            background: "var(--color-black-soft)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 4 }}>
              Antes / después — primera sesión analizada vs. la más reciente
            </p>
            <p style={{ color: "var(--color-white)", fontSize: 15 }}>
              {data.scoreProgress.first.toFixed(0)} → {data.scoreProgress.last.toFixed(0)} puntos
              <span style={{ color: data.scoreProgress.delta >= 0 ? "#2ED67A" : "#FF6B6B", fontWeight: 700, marginLeft: 8 }}>
                {data.scoreProgress.delta >= 0 ? "+" : ""}
                {data.scoreProgress.delta.toFixed(0)}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href={`/videos/${data.scoreProgress.firstVideoId}/biomechanics`}
              className="btn-secondary"
              style={{ width: "auto", padding: "8px 14px" }}
            >
              Ver primera sesión
            </Link>
            <Link
              href={`/videos/${data.scoreProgress.lastVideoId}/biomechanics`}
              className="btn-secondary"
              style={{ width: "auto", padding: "8px 14px" }}
            >
              Ver última sesión
            </Link>
          </div>
        </div>
      )}

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 8, marginBottom: 8 }}>
        Errores más frecuentes
      </h3>
      {Object.keys(data.errorFrequency).length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Sin errores registrados aún.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
          {Object.entries(data.errorFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <li key={type} style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>
                {type.replaceAll("_", " ")}: <strong style={{ color: "var(--color-white)" }}>{count}</strong>
              </li>
            ))}
        </ul>
      )}

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginBottom: 8 }}>Historial de sesiones</h3>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
        {data.sessions.slice().reverse().map((s) => (
          <li key={s.videoId} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-white)" }}>{new Date(s.createdAt).toLocaleDateString()} · {s.discipline}</span>
            <span style={{ color: "var(--color-muted)" }}>
              {s.techniqueScore != null ? `Puntuación: ${s.techniqueScore.toFixed(0)}` : "Sin biomecánica"}
              {s.errorCount != null ? ` · ${s.errorCount} errores` : ""}
              {s.distanceMeters != null ? ` · ${(s.distanceMeters / 1000).toFixed(1)} km` : ""}
            </span>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ color: "var(--color-white)", fontSize: "1rem", margin: 0 }}>Lesiones registradas</h3>
        <button className="btn-secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setShowInjuryForm(!showInjuryForm)}>
          {showInjuryForm ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {showInjuryForm && (
        <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="field">
            <label>Zona del cuerpo</label>
            <input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="Ej. rodilla derecha" />
          </div>
          <div className="field">
            <label>Severidad</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="LEVE">Leve</option>
              <option value="MODERADO">Moderado</option>
              <option value="ALTO">Alto</option>
            </select>
          </div>
          <div className="field">
            <label>Descripción (opcional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {injuryError && <p className="error-text">{injuryError}</p>}
          <button className="btn-primary" onClick={addInjury}>Guardar</button>
        </div>
      )}

      {data.injuries.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 24 }}>
          Este registro lo completas tú — no se detecta automáticamente desde los videos.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: data.injuryErrorCorrelations.length ? 12 : 24 }}>
          {data.injuries.map((inj) => (
            <li key={inj.id} style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 6 }}>
              {new Date(inj.date).toLocaleDateString()} · <strong style={{ color: "var(--color-white)" }}>{inj.bodyPart}</strong> ({inj.severity})
              {inj.description ? ` — ${inj.description}` : ""}
            </li>
          ))}
        </ul>
      )}

      {data.injuryErrorCorrelations.length > 0 && (
        <div
          style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid #FF6B6B",
            borderRadius: 10,
            padding: 14,
            marginBottom: 24,
          }}
        >
          <p style={{ color: "#FF6B6B", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            ⚠️ Posible relación entre tus lesiones y errores técnicos detectados
          </p>
          <ul style={{ color: "var(--color-muted)", fontSize: 13, paddingLeft: 18, marginBottom: 6 }}>
            {data.injuryErrorCorrelations.map((c, i) => (
              <li key={i}>
                <strong style={{ color: "var(--color-white)" }}>{c.bodyPart}</strong> — coincide con{" "}
                <strong style={{ color: "var(--color-white)" }}>{c.errorType.replaceAll("_", " ")}</strong>, detectado en {c.errorCount} video{c.errorCount === 1 ? "" : "s"}.
              </li>
            ))}
          </ul>
          <p style={{ color: "var(--color-muted)", fontSize: 11, fontStyle: "italic" }}>
            Esto es una señal para revisar con atención, no un diagnóstico médico.
          </p>
        </div>
      )}

      {data.notAvailable.length > 0 && (
        <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16 }}>
          <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            Métricas que este dashboard todavía no muestra (y por qué):
          </p>
          <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18 }}>
            {data.notAvailable.map((item) => (
              <li key={item.metric} style={{ marginBottom: 4 }}>
                <strong>{item.metric}:</strong> {item.reason}
              </li>
            ))}
          </ul>
        </div>
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
