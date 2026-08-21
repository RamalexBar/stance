"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../../../lib/api";
import MetricChart from "../../../../components/MetricChart";
import SkeletonReplay from "../../../../components/SkeletonReplay";

interface MetricSummary {
  min: number;
  max: number;
  mean: number;
}

interface BiomechanicsRecord {
  videoId: string;
  status: string;
  seriesJson: any[];
  summaryJson: Record<string, MetricSummary> & {
    estimatedKneeLoadIndexAvg: number | null;
    approxTrunkOscillationsPerMinute: number | null;
    notesForUser: string[];
  };
}

interface VideoDetail {
  id: string;
  playbackUrl: string;
}

interface PoseAnalysisRecord {
  framesJson: { tSeconds: number; landmarks: { x: number; y: number; z?: number; visibility?: number }[] }[];
}

function fmt(n: number | undefined | null, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

export default function BiomechanicsPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [data, setData] = useState<BiomechanicsRecord | null>(null);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [poseFrames, setPoseFrames] = useState<PoseAnalysisRecord["framesJson"]>([]);
  const [state, setState] = useState<"loading" | "computing" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, margin: "20px 0" }}>
            <SummaryCard label="Rodilla (izq/der, promedio)" value={`${fmt(summary.kneeAngleLeft?.mean)}° / ${fmt(summary.kneeAngleRight?.mean)}°`} />
            <SummaryCard label="Cadera (izq/der, promedio)" value={`${fmt(summary.hipAngleLeft?.mean)}° / ${fmt(summary.hipAngleRight?.mean)}°`} />
            <SummaryCard label="Inclinación de tronco" value={`${fmt(summary.trunkInclinationDeg?.mean)}°`} />
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

          <MetricChart
            title="Ángulo de rodilla"
            series={series}
            yLabel="grados"
            lines={[
              { key: "kneeAngleLeft", label: "Izquierda", color: "#17E0C3" },
              { key: "kneeAngleRight", label: "Derecha", color: "#1E5FFF" },
            ]}
          />
          <MetricChart
            title="Inclinación del tronco"
            series={series}
            yLabel="grados desde vertical"
            lines={[{ key: "trunkInclinationDeg", label: "Tronco", color: "#17E0C3" }]}
          />
          <MetricChart
            title="Balance (adelante/atrás respecto a los tobillos)"
            series={series}
            yLabel="offset relativo"
            lines={[{ key: "balanceOffset", label: "Balance", color: "#FF6B6B" }]}
          />

          <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 16, marginTop: 24 }}>
            <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Notas importantes sobre estos números:
            </p>
            <ul style={{ color: "var(--color-muted)", fontSize: 12, paddingLeft: 18 }}>
              {summary.notesForUser?.map((note, i) => <li key={i} style={{ marginBottom: 4 }}>{note}</li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: 14 }}>
      <div style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--color-white)", fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
