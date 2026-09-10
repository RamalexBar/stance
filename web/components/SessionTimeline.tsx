"use client";

import { evaluateFrame, SEGMENT_COLORS, SegmentEvaluation, SegmentLevel, FrameMetricsLike } from "../lib/postureEvaluator";

interface Frame extends FrameMetricsLike {
  tSeconds: number;
}

interface Props {
  frames: Frame[];
  segmentKey: keyof SegmentEvaluation;
  title: string;
  bucketCount?: number;
}

const SEVERITY_RANK: Record<SegmentLevel, number> = { OK: 0, LEVE: 1, MODERADO: 2, ALTO: 3 };

export default function SessionTimeline({ frames, segmentKey, title, bucketCount = 60 }: Props) {
  if (frames.length < 2) return null;

  const startT = frames[0].tSeconds;
  const endT = frames[frames.length - 1].tSeconds;
  const duration = endT - startT || 1;
  const bucketSize = duration / bucketCount;

  const worstPerBucket: SegmentLevel[] = new Array(bucketCount).fill("OK");
  for (const frame of frames) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((frame.tSeconds - startT) / bucketSize)));
    const level = evaluateFrame(frame)[segmentKey];
    if (SEVERITY_RANK[level] > SEVERITY_RANK[worstPerBucket[idx]]) worstPerBucket[idx] = level;
  }

  return (
    <div style={{ margin: "8px 0 20px" }}>
      <p style={{ color: "var(--color-muted)", fontSize: 11, marginBottom: 6 }}>{title}</p>
      <div
        role="img"
        aria-label={`${title}: línea de tiempo de severidad a lo largo de la sesión, de ${startT.toFixed(0)} a ${endT.toFixed(0)} segundos`}
        style={{ display: "flex", gap: 2, height: 22, borderRadius: 6, overflow: "hidden" }}
      >
        {worstPerBucket.map((level, i) => (
          <div
            key={i}
            title={`${(startT + i * bucketSize).toFixed(1)}s · ${level}`}
            style={{ flex: 1, background: SEGMENT_COLORS[level] }}
          />
        ))}
      </div>
    </div>
  );
}
