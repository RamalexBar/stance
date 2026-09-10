"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../../../lib/api";
import MetricChart from "../../../../components/MetricChart";
import SkeletonReplay from "../../../../components/SkeletonReplay";
import StatTile from "../../../../components/StatTile";
import SessionTimeline from "../../../../components/SessionTimeline";
import { DATA_SERIES_LEFT, DATA_SERIES_RIGHT } from "../../../../lib/dataSeriesColors";

interface MetricSummary {
  min: number;
  max: number;
  mean: number;
}

interface ChartInsight {
  explanation: string;
  recommendation: string;
}

interface BiomechanicsRecord {
  videoId: string;
  status: string;
  seriesJson: any[];
  summaryJson: Record<string, MetricSummary> & {
    estimatedKneeLoadIndexAvg: number | null;
    approxTrunkOscillationsPerMinute: number | null;
    trunkInclinationInsight: ChartInsight | null;
    balanceInsight: ChartInsight | null;
  };
}

interface VideoDetail {
  id: string;
  playbackUrl: string;
}

interface PoseAnalysisRecord {
  framesJson: { tSeconds: number; landmarks: { x: number; y: number; z?: number; visibility?: number }[] }[];
}

// Mismos umbrales que web/lib/postureEvaluator.ts (y api/.../healthyZones.ts) —
// no se inventan números nuevos, se reusa la única fuente de verdad para que
// el color de fondo del gráfico coincida con lo que reporta Errores.
const SEGMENT_COLOR = { OK: "#2ED67A", LEVE: "#FFB020", MODERADO: "#FF8A3D", ALTO: "#FF6B6B" };

const KNEE_ZONES = [
  { from: 90, to: 165, color: SEGMENT_COLOR.OK },
  { from: 165, to: 170, color: SEGMENT_COLOR.LEVE },
  { from: 170, to: 175, color: SEGMENT_COLOR.MODERADO },
  { from: 175, to: 190, color: SEGMENT_COLOR.ALTO },
];

const BALANCE_ZONES = [
  { from: -0.35, to: 0.35, color: SEGMENT_COLOR.OK },
  { from: 0.35, to: 0.5, color: SEGMENT_COLOR.LEVE },
  { from: -0.5, to: -0.35, color: SEGMENT_COLOR.LEVE },
  { from: 0.5, to: 0.65, color: SEGMENT_COLOR.MODERADO },
  { from: -0.65, to: -0.5, color: SEGMENT_COLOR.MODERADO },
  { from: 0.65, to: 1.2, color: SEGMENT_COLOR.ALTO },
  { from: -1.2, to: -0.65, color: SEGMENT_COLOR.ALTO },
];

function fmt(n: number | undefined | null, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

// Color de severidad para una tarjeta de resumen: busca en la misma banda de
// zonas que colorea el fondo del gráfico (no se inventa un umbral aparte).
function zoneColorFor(value: number | undefined | null, zones: { from: number; to: number; color: string }[], fallback: string) {
  if (value === undefined || value === null || Number.isNaN(value)) return fallback;
  const match = zones.find((z) => value >= z.from && value < z.to);
  return match ? match.color : fallback;
}

type ActiveMetric = "knee" | "trunk" | "balance" | null;

export default function BiomechanicsPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [data, setData] = useState<BiomechanicsRecord | null>(null);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [poseFrames, setPoseFrames] = useState<PoseAnalysisRecord["framesJson"]>([]);
  const [state, setState] = useState<"loading" | "computing" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [id, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      setState("computing");
      // Recalcula siempre (idempotente: sobrescribe el resultado anterior de este video).
      await apiPost(`/api/v1/videos/${id}/biomechanics`, {});
      const result = await apiGet<BiomechanicsRecord>(`/api/v1/videos/${id}/biomechanics`);
      setData(result);
      setState("ready");

      // El video + los landmarks crudos solo alimentan el overlay coloreado
      // del esqueleto; si fallan, el resto de la página sigue funcionando.
      apiGet<VideoDetail>(`/api/v1/videos/${id}`).then(setVideo).catch(console.error);
      apiGet<PoseAnalysisRecord>(`/api/v1/videos/${id}/pose-analysis`)
        .then((r) => setPoseFrames(r.framesJson ?? []))
        .catch(console.error);
    } catch (err: any) {
      setState("error");
      setErrorMsg(
        err?.message?.includes("409") || String(err).includes("análisis de pose")
          ? "Este video todavía no tiene un análisis de pose. Analízalo primero."
          : "No se pudo calcular la biomecánica de este video."
      );
    }
  }

  const summary = data?.summaryJson;
  const series = data?.seriesJson ?? [];

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 760, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Biomecánica</h1>
      <p className="subtitle">Ángulos y métricas calculados a partir del esqueleto detectado</p>

      {state === "computing" && <p className="success-text">Calculando métricas…</p>}
      {state === "error" && (
        <>
          <p className="error-text">{errorMsg}</p>
          <Link href={`/videos/${id}/analyze`} className="btn-secondary" style={{ width: "auto", padding: "10px 16px", display: "inline-block" }}>
            Ir a analizar pose
          </Link>
        </>
      )}

      {state === "ready" && summary && (
        <>
          {video && poseFrames.length > 0 && (
            <div style={{ margin: "20px 0" }}>
              <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginBottom: 8 }}>
                Repetición con avatar
              </h3>
              <SkeletonReplay videoUrl={video.playbackUrl} poseFrames={poseFrames} metricsFrames={series} />
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              margin: "20px 0",
            }}
          >
            <StatTile
              label="Rodilla izquierda"
              value={summary.kneeAngleLeft?.mean}
              unit="°"
              color={zoneColorFor(summary.kneeAngleLeft?.mean, KNEE_ZONES, SEGMENT_COLOR.OK)}
              sparklineValues={series.map((s) => s.kneeAngleLeft)}
              active={activeMetric === "knee"}
              onClick={() => setActiveMetric(activeMetric === "knee" ? null : "knee")}
            />
            <StatTile
              label="Rodilla derecha"
              value={summary.kneeAngleRight?.mean}
              unit="°"
              color={zoneColorFor(summary.kneeAngleRight?.mean, KNEE_ZONES, SEGMENT_COLOR.OK)}
              sparklineValues={series.map((s) => s.kneeAngleRight)}
              active={activeMetric === "knee"}
              onClick={() => setActiveMetric(activeMetric === "knee" ? null : "knee")}
            />
            <StatTile
              label="Inclinación de tronco"
              value={summary.trunkInclinationDeg?.mean}
              unit="°"
              color="var(--color-turquoise)"
              sparklineValues={series.map((s) => s.trunkInclinationDeg)}
              active={activeMetric === "trunk"}
              onClick={() => setActiveMetric(activeMetric === "trunk" ? null : "trunk")}
            />
            <StatTile
              label="Balance"
              value={summary.balanceOffset?.mean}
              unit=""
              decimals={2}
              color={zoneColorFor(summary.balanceOffset?.mean, BALANCE_ZONES, SEGMENT_COLOR.OK)}
              sparklineValues={series.map((s) => s.balanceOffset)}
              active={activeMetric === "balance"}
              onClick={() => setActiveMetric(activeMetric === "balance" ? null : "balance")}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, margin: "0 0 20px" }}>
            <SummaryCard label="Cadera (izq/der, promedio)" value={`${fmt(summary.hipAngleLeft?.mean)}° / ${fmt(summary.hipAngleRight?.mean)}°`} />
            <SummaryCard label="Simetría (menor = mejor)" value={`${fmt(summary.symmetryDelta?.mean)}°`} />
            <SummaryCard
              label="Índice de carga de rodilla (estimado)"
              value={summary.estimatedKneeLoadIndexAvg != null ? fmt(summary.estimatedKneeLoadIndexAvg) : "Sin peso en perfil"}
            />
            <SummaryCard
              label="Oscilación de tronco (aprox.)"
              value={summary.approxTrunkOscillationsPerMinute != null ? `${fmt(summary.approxTrunkOscillationsPerMinute, 0)} /min` : "—"}
            />
          </div>

          {series.length > 1 && (
            <SessionTimeline
              frames={series}
              segmentKey="knees"
              title="Línea de tiempo de la sesión — severidad de rodillas"
            />
          )}

          {activeMetric === null && (
            <p style={{ color: "var(--color-muted)", fontSize: 12, margin: "-8px 0 20px" }}>
              Toca una métrica arriba para ver su gráfico de detalle.
            </p>
          )}

          {activeMetric === "knee" && (
            <MetricChart
              title="Ángulo de rodilla"
              series={series}
              yLabel="grados"
              lines={[
                { key: "kneeAngleLeft", label: "Izquierda", color: DATA_SERIES_LEFT.color, unit: "°" },
                { key: "kneeAngleRight", label: "Derecha", color: DATA_SERIES_RIGHT.color, dash: DATA_SERIES_RIGHT.dash, unit: "°" },
              ]}
              zones={KNEE_ZONES}
            />
          )}

          {activeMetric === "trunk" && (
            <>
              <MetricChart
                title="Inclinación del tronco"
                series={series}
                yLabel="grados desde vertical"
                lines={[{ key: "trunkInclinationDeg", label: "Tronco", color: DATA_SERIES_LEFT.color, unit: "°" }]}
              />
              <ChartInsightBox insight={summary.trunkInclinationInsight} />
            </>
          )}

          {activeMetric === "balance" && (
            <>
              <MetricChart
                title="Balance (adelante/atrás respecto a los tobillos)"
                series={series}
                yLabel="offset relativo"
                lines={[{ key: "balanceOffset", label: "Balance", color: DATA_SERIES_LEFT.color }]}
                zones={BALANCE_ZONES}
              />
              <ChartInsightBox insight={summary.balanceInsight} />
            </>
          )}

          <ChartsGuideBox />
        </>
      )}
    </div>
  );
}

function ChartInsightBox({ insight }: { insight: ChartInsight | null }) {
  if (!insight) return null;
  return (
    <div
      style={{
        background: "var(--color-black-soft)",
        borderRadius: 10,
        padding: 14,
        marginTop: -8,
        marginBottom: 20,
        borderLeft: "3px solid var(--color-turquoise)",
      }}
    >
      <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 8 }}>{insight.explanation}</p>
      <p style={{ color: "var(--color-white)", fontSize: 13, fontWeight: 600 }}>💡 {insight.recommendation}</p>
    </div>
  );
}

function ChartsGuideBox() {
  const items = [
    "El número grande de cada tarjeta es el promedio de la sesión. El punto de color y el borde usan la misma escala que la pantalla de Errores: verde = rango saludable, ámbar = leve, naranja = moderado, rojo = alto.",
    "La línea pequeña dentro de la tarjeta muestra cómo varió esa métrica cuadro a cuadro durante todo el video.",
    "Toca una tarjeta para abrir su gráfico de detalle: la curva suavizada, las mismas bandas de color de fondo, y al pasar el cursor por la línea ves el valor exacto en cada segundo.",
    "La franja debajo de las tarjetas es la línea de tiempo de la sesión: cada bloque resume unos segundos y se colorea según la peor severidad de rodilla detectada en ese tramo, para ubicar en qué momento se perdió la forma.",
  ];
  return (
    <div
      style={{
        background: "var(--color-black-soft)",
        borderRadius: 10,
        padding: 16,
        marginTop: 24,
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <p style={{ color: "var(--color-white)", fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
        Cómo leer estos gráficos
      </p>
      <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 14 }}>
      <div style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--color-white)", fontSize: 18, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
