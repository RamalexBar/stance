"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../lib/api";

type SafetyLevel = "SEGURO" | "PRECAUCION" | "PELIGROSO";

interface TodayWind {
  spot: { name: string | null };
  current: {
    windSpeedKt: number;
    windGustsKt: number;
    shore: { classification: string; safetyLevel: SafetyLevel; safetyNote: string };
    levelCaution: string | null;
  };
}

const SAFETY_COLOR: Record<SafetyLevel, string> = {
  SEGURO: "#2ED67A",
  PRECAUCION: "#FFB020",
  PELIGROSO: "#FF6B6B",
};

const SAFETY_LABEL: Record<SafetyLevel, string> = {
  SEGURO: "Buenas condiciones",
  PRECAUCION: "Precaución",
  PELIGROSO: "Peligroso hoy",
};

/**
 * Muestra el viento/seguridad de HOY en el spot habitual del usuario apenas
 * abre la app, en vez de que tenga que ir a buscarlo a /wind. Es la versión
 * "pull" de una notificación proactiva: sin infraestructura de push, pero
 * con el mismo efecto de "la app me avisa" en el momento en que sí abre la
 * app. Si no hay spot configurado o falla la consulta, no muestra nada —
 * el dashboard no debe romperse por esto.
 */
export default function TodayConditionsBanner() {
  const [data, setData] = useState<TodayWind | null>(null);

  useEffect(() => {
    apiGet<TodayWind>("/api/v1/wind/today")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const { shore } = data.current;

  return (
    <Link
      href="/wind"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--color-black-soft)",
        border: `1px solid ${SAFETY_COLOR[shore.safetyLevel]}`,
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 2 }}>
            🌬️ Hoy en {data.spot.name ?? "tu spot"}
          </p>
          <p style={{ color: "var(--color-white)", fontSize: 14 }}>
            {data.current.windSpeedKt.toFixed(0)} kt (ráfagas {data.current.windGustsKt.toFixed(0)}) ·{" "}
            <span style={{ color: SAFETY_COLOR[shore.safetyLevel], fontWeight: 700 }}>
              {SAFETY_LABEL[shore.safetyLevel]}
            </span>
          </p>
        </div>
        <span style={{ color: "var(--color-turquoise)", fontSize: 13 }}>Ver detalle →</span>
      </div>
      {data.current.levelCaution && (
        <p style={{ color: "#FFB020", fontSize: 12, marginTop: 8, fontWeight: 600 }}>
          ⚠️ {data.current.levelCaution}
        </p>
      )}
    </Link>
  );
}
