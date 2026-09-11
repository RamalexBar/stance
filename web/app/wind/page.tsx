"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet } from "../../lib/api";

type ShoreClassification = "ONSHORE" | "CROSS_ONSHORE" | "CROSS" | "CROSS_OFFSHORE" | "OFFSHORE";
type SafetyLevel = "SEGURO" | "PRECAUCION" | "PELIGROSO";
type WindSpeedBandId = "INVIABLE" | "MARGINAL" | "BUENO" | "PERFECTO" | "AVANZADO" | "EXIGENTE" | "PELIGROSO";

interface ShoreResult {
  classification: ShoreClassification;
  angleDiffDeg: number;
  safetyLevel: SafetyLevel;
  safetyNote: string;
}

interface TodayWind {
  spot: { name: string | null; lat: number; lon: number; seaDirectionDeg: number };
  date: string;
  isToday: boolean;
  current: {
    time: string;
    windSpeedKt: number;
    windGustsKt: number;
    windDirectionFromDeg: number;
    shore: ShoreResult;
    levelCaution: string | null;
  };
  hourly: {
    time: string;
    windSpeedKt: number;
    windGustsKt: number;
    windDirectionFromDeg: number;
    shore: ShoreClassification;
    shoreSafetyLevel: SafetyLevel;
    band: WindSpeedBandId;
    gustBand: WindSpeedBandId;
  }[];
  recommendation: {
    discipline: string;
    windSpeedKt: number;
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

const SHORE_SHORT_LABEL: Record<ShoreClassification, string> = {
  ONSHORE: "Playa",
  CROSS_ONSHORE: "Playa ↘",
  CROSS: "Lateral",
  CROSS_OFFSHORE: "Mar ↘",
  OFFSHORE: "Mar",
};

// Escala de 7 colores estilo Windy/Windfinder para foil (kite y wing),
// evaluada en nudos — debe coincidir con WIND_SPEED_BANDS en
// api/src/modules/wind/wind.compute.ts.
const BAND_COLOR: Record<WindSpeedBandId, string> = {
  INVIABLE: "#8ECFEA",
  MARGINAL: "#9CCB4A",
  BUENO: "#2E7D32",
  PERFECTO: "#FFD600",
  AVANZADO: "#FF9800",
  EXIGENTE: "#E53935",
  PELIGROSO: "#8E24AA",
};

const BAND_LABEL: Record<WindSpeedBandId, string> = {
  INVIABLE: "Inviable",
  MARGINAL: "Marginal",
  BUENO: "Bueno",
  PERFECTO: "Perfecto (sweet spot)",
  AVANZADO: "Avanzado",
  EXIGENTE: "Exigente",
  PELIGROSO: "Peligroso",
};

const DISCIPLINES = ["KITESURF", "WINGFOIL"];

const WEEKDAY_LABEL = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Mismo rango que MAX_FORECAST_DAYS en api/src/modules/wind/wind.client.ts.
function nextDays(count: number) {
  const out: { iso: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Hoy" : i === 1 ? "Mañana" : WEEKDAY_LABEL[d.getDay()];
    out.push({ iso, label });
  }
  return out;
}

function fmt(n: number, decimals = 0) {
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

export default function WindPage() {
  const { ready } = useRequireAuth();
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => nextDays(1)[0].iso);
  const [data, setData] = useState<TodayWind | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-spot" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const days = nextDays(7);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, discipline, date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setState("loading");
    try {
      const params = new URLSearchParams({ date });
      if (discipline) params.set("discipline", discipline);
      const result = await apiGet<TodayWind>(`/api/v1/wind/today?${params.toString()}`);
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

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Pronóstico de viento</h1>
      <p className="subtitle">Condición en tu spot por día, seguridad y equipo recomendado</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d) => (
          <button
            key={d.iso}
            className="btn-secondary"
            style={{
              width: "auto",
              padding: "8px 14px",
              flexShrink: 0,
              borderColor: date === d.iso ? "var(--color-turquoise)" : "rgba(255,255,255,0.15)",
              color: date === d.iso ? "var(--color-turquoise)" : "var(--color-white)",
            }}
            onClick={() => setDate(d.iso)}
          >
            {d.label}
          </button>
        ))}
      </div>

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
            <Stat label={data.isToday ? "Viento actual" : "Viento (mediodía aprox.)"} value={`${fmt(data.current.windSpeedKt)} kt`} />
            <Stat label="Ráfagas" value={`${fmt(data.current.windGustsKt)} kt`} />
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

          {data.hourly.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "var(--color-white)", fontWeight: 600, marginBottom: 4 }}>
                Viento por hora ({days.find((d) => d.iso === data.date)?.label.toLowerCase() ?? data.date})
              </p>
              <p style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 8 }}>
                Color = intensidad del viento para foil/kite · flecha = hacia dónde sopla · ⚠️ = dirección hacia mar
                abierto
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", marginBottom: 10, fontSize: 10.5, color: "var(--color-muted)" }}>
                {(Object.keys(BAND_LABEL) as WindSpeedBandId[]).map((id) => (
                  <LegendDot key={id} color={BAND_COLOR[id]} label={BAND_LABEL[id]} />
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
                  gap: 8,
                }}
              >
                {data.hourly.map((h) => {
                  const hour = new Date(h.time).getHours();
                  const color = BAND_COLOR[h.band];
                  const travelDeg = (h.windDirectionFromDeg + 180) % 360;
                  const gustRiskier = h.gustBand !== h.band;
                  const offshoreRisk = h.shoreSafetyLevel === "PELIGROSO";
                  return (
                    <div
                      key={h.time}
                      title={`${BAND_LABEL[h.band]} · ${CLASSIFICATION_LABEL[h.shore]}`}
                      style={{
                        position: "relative",
                        background: "var(--color-black-soft)",
                        borderRadius: 8,
                        padding: "8px 6px",
                        textAlign: "center",
                        borderTop: `4px solid ${color}`,
                      }}
                    >
                      {offshoreRisk && (
                        <span style={{ position: "absolute", top: 2, right: 4, fontSize: 10 }}>⚠️</span>
                      )}
                      <div style={{ color: "var(--color-white)", fontSize: 12, fontWeight: 700 }}>
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                      <div style={{ color, fontSize: 14, fontWeight: 700, margin: "4px 0" }}>
                        {fmt(h.windSpeedKt)} kt
                      </div>
                      {gustRiskier && (
                        <div style={{ color: BAND_COLOR[h.gustBand], fontSize: 9, marginBottom: 2 }}>
                          ráfagas {fmt(h.windGustsKt)}
                        </div>
                      )}
                      <div
                        style={{
                          display: "inline-block",
                          transform: `rotate(${travelDeg}deg)`,
                          color: "var(--color-muted)",
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        ↑
                      </div>
                      <div style={{ color: "var(--color-muted)", fontSize: 10, marginTop: 2 }}>
                        {SHORE_SHORT_LABEL[h.shore]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <p style={{ color: "var(--color-white)", fontWeight: 600, marginBottom: 2 }}>
              Equipo recomendado — {data.recommendation.discipline}
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 8 }}>
              Estimación aproximada a partir de peso, nivel y viento actual — ajusta según las tablas de tu marca de
              equipo y tu sensación en el agua.
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
            {data.recommendation.notes.length > 0 && (
              <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18, marginTop: 8 }}>
                {data.recommendation.notes.map((note, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {note}
                  </li>
                ))}
              </ul>
            )}
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
