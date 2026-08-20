"use client";

interface Segment {
  type: string;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  notes?: string;
}

const COLORS: Record<string, string> = {
  NAVEGACION: "#2a3540",
  SALTO: "#17E0C3",
  ATERRIZAJE: "#1E5FFF",
  RECEPCION: "#8B5CF6",
  CAMBIO_DIRECCION: "#FFB020",
};

const LABELS: Record<string, string> = {
  NAVEGACION: "Navegación",
  SALTO: "Salto",
  ATERRIZAJE: "Aterrizaje",
  RECEPCION: "Recepción",
  CAMBIO_DIRECCION: "Cambio de dirección",
};

export default function MovementTimeline({ segments }: { segments: Segment[] }) {
  if (!segments.length) return <p style={{ color: "var(--color-muted)" }}>Sin segmentos detectados.</p>;

  const totalStart = segments[0].startSeconds;
  const totalEnd = segments[segments.length - 1].endSeconds;
  const totalDuration = Math.max(totalEnd - totalStart, 0.001);

  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 44,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {segments.map((seg, i) => {
          const widthPct = ((seg.endSeconds - seg.startSeconds) / totalDuration) * 100;
          return (
            <div
              key={i}
              title={`${LABELS[seg.type] ?? seg.type} · ${seg.startSeconds.toFixed(1)}s–${seg.endSeconds.toFixed(1)}s`}
              style={{
                width: `${widthPct}%`,
                background: COLORS[seg.type] ?? "#555",
                opacity: 0.5 + seg.confidence * 0.5,
                borderRight: "1px solid rgba(0,0,0,0.3)",
              }}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[key], display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {segments
          .filter((s) => s.type !== "NAVEGACION")
          .map((seg, i) => (
            <li
              key={i}
              style={{
                borderLeft: `3px solid ${COLORS[seg.type]}`,
                padding: "6px 12px",
                marginBottom: 6,
                fontSize: 13,
                color: "var(--color-white)",
              }}
            >
              {LABELS[seg.type] ?? seg.type} · {seg.startSeconds.toFixed(1)}s a {seg.endSeconds.toFixed(1)}s
              <span style={{ color: "var(--color-muted)" }}> · confianza {(seg.confidence * 100).toFixed(0)}%</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
