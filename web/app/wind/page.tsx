"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet } from "../../lib/api";
import MetricChart from "../../components/MetricChart";

type ShoreClassification = "ONSHORE" | "CROSS_ONSHORE" | "CROSS" | "CROSS_OFFSHORE" | "OFFSHORE";
type SafetyLevel = "SEGURO" | "PRECAUCION" | "PELIGROSO";

interface ShoreResult {
  classification: ShoreClassification;
  angleDiffDeg: number;
  safetyLevel: SafetyLevel;
  safetyNote: string;
}

interface TodayWind {
  spot: { name: string | null; lat: number; lon: number; seaDirectionDeg: number };
  current: {
    time: string;
    windSpeedKmh: number;
    windGustsKmh: number;
    windDirectionFromDeg: number;
    shore: ShoreResult;
    levelCaution: string | null;
  };
  hourly: { time: string; windSpeedKmh: number; windDirectionFromDeg: number; shore: ShoreClassification }[];
  recommendation: {
    discipline: string;
    windSpeedKmh: number;
    kiteSizeM2?: { min: number; max: number };
    wingSizeM2?: { min: number; max: number };
    boardVolumeLiters?: { min: number; max: number };
    notes: string[];
  };
}

const SAFETY_COLOR: Record<SafetyLevel, string> = {
  SEGURO: "#2ED67A",
  PRECAUCION: "#FFB020",
  PELIGROSO: "#FF6B6B",
};

const CLASSIFICATION_LABEL: Record<ShoreClassification, string> = {
  ONSHORE: "Hacia la playa (onshore)",
  CROSS_ONSHORE: "Cruzado, hacia la playa",
  CROSS: "Paralelo a la costa",
  CROSS_OFFSHORE: "Cruzado, hacia el mar",
  OFFSHORE: "Hacia el mar abierto (offshore)",
};

const DISCIPLINES = ["KITESURF", "WINGFOIL"];

function fmt(n: number, decimals = 0) {
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

export default function WindPage() {
  const { ready } = useRequireAuth();
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [data, setData] = useState<TodayWind | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-spot" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, discipline]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setState("loading");
    try {
      const query = discipline ? `?discipline=${discipline}` : "";
      const result = await apiGet<TodayWind>(`/api/v1/wind/today${query}`);
      setData(result);
      setState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("spot habitual")) {
        setState("no-spot");
      } else {
        setState("error");
        setErrorMsg(message || "No se pudo cargar el viento de hoy.");
      }
    }
  }

  const hourlySeries = data?.hourly.map((h) => ({
    tSeconds: new Date(h.time).getHours(),
    windSpeedKmh: h.windSpeedKmh,
  }));

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Viento de hoy</h1>
      <p className="subtitle">Condición actual en tu spot, seguridad y equipo recomendado</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            className="btn-secondary"
            style={{
              width: "auto",
              padding: "8px 14px",
              borderColor: discipline === d ? "var(--color-turquoise)" : "rgba(255,255,255,0.15)",
              color: discipline === d ? "var(--color-turquoise)" : "var(--color-white)",
            }}
            onClick={() => setDiscipline(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {state === "loading" && <p className="success-text">Cargando…</p>}

      {state === "no-spot" && (
        <>
          <p className="error-text">
            Configura tu spot habitual (ubicación y orientación del mar) en tu perfil para ver el viento de hoy.
          </p>
          <Link href="/profile" className="btn-primary" style={{ width: "auto", padding: "10px 18px", display: "inline-block" }}>
            Ir al perfil
          </Link>
        </>
      )}

      {state === "error" && (
        <>
          <p className="error-text">{errorMsg}</p>
          <button className="btn-secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={load}>
            Reintentar
          </button>
        </>
      )}

      {state === "ready" && data && (
        <>
          <p style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 16 }}>📍 {data.spot.name}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            <Stat label="Viento actual" value={`${fmt(data.current.windSpeedKmh)} km/h`} />
            <Stat label="Ráfagas" value={`${fmt(data.current.windGustsKmh)} km/h`} />
            <Stat label="Dirección" value={`${fmt(data.current.windDirectionFromDeg)}°`} />
          </div>

          <div
            style={{
              background: "var(--color-black-soft)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              borderLeft: `4px solid ${SAFETY_COLOR[data.current.shore.safetyLevel]}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong style={{ color: "var(--color-white)" }}>
                {CLASSIFICATION_LABEL[data.current.shore.classification]}
              </strong>
              <span style={{ color: SAFETY_COLOR[data.current.shore.safetyLevel], fontSize: 12, fontWeight: 700 }}>
                {data.current.shore.safetyLevel}
              </span>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>{data.current.shore.safetyNote}</p>
            {data.current.levelCaution && (
              <p style={{ color: "#FFB020", fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                ⚠️ {data.current.levelCaution}
              </p>
            )}
          </div>

          {hourlySeries && hourlySeries.length > 0 && (
            <MetricChart
              title="Viento por hora (hoy)"
              series={hourlySeries}
              xLabel="hora del día"
              yLabel="km/h"
              lines={[{ key: "windSpeedKmh", label: "Viento", color: "#17E0C3" }]}
            />
          )}

          <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <p style={{ color: "var(--color-white)", fontWeight: 600, marginBottom: 8 }}>
              Equipo recomendado — {data.recommendation.discipline}
            </p>
            {data.recommendation.kiteSizeM2 && (
              <p style={{ color: "var(--color-turquoise)", fontSize: 15, marginBottom: 6 }}>
                Cometa: {fmt(data.recommendation.kiteSizeM2.min, 1)}–{fmt(data.recommendation.kiteSizeM2.max, 1)} m²
              </p>
            )}
            {data.recommendation.wingSizeM2 && (
              <p style={{ color: "var(--color-turquoise)", fontSize: 15, marginBottom: 6 }}>
                Ala: {fmt(data.recommendation.wingSizeM2.min, 1)}–{fmt(data.recommendation.wingSizeM2.max, 1)} m²
              </p>
            )}
            {data.recommendation.boardVolumeLiters && (
              <p style={{ color: "var(--color-turquoise)", fontSize: 15, marginBottom: 6 }}>
                Tabla: {data.recommendation.boardVolumeLiters.min}–{data.recommendation.boardVolumeLiters.max} L
              </p>
            )}
            <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18, marginTop: 8 }}>
              {data.recommendation.notes.map((note, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {note}
                </li>
              ))}
            </ul>
          </div>
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
