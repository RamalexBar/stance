"use client";

import { useEffect, useRef } from "react";
import { POSE_CONNECTIONS, CONFIDENCE_THRESHOLD } from "../lib/poseLandmarker";
import {
  evaluateFrame,
  SEGMENT_COLORS,
  SEGMENT_LABELS,
  SegmentEvaluation,
  FrameMetricsLike,
} from "../lib/postureEvaluator";

interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface PoseFrame {
  tSeconds: number;
  landmarks: Landmark[];
}

interface MetricsFrame extends FrameMetricsLike {
  tSeconds: number;
}

interface Props {
  videoUrl: string;
  poseFrames: PoseFrame[];
  metricsFrames: MetricsFrame[];
}

// Cada segmento del esqueleto se pinta según la categoría de zona saludable
// a la que pertenece (mismos umbrales que api/src/modules/errors/errors.detect.ts).
const SEGMENT_CATEGORY: Record<string, keyof SegmentEvaluation> = {
  "11-12": "shoulders",
  "11-13": "hands",
  "13-15": "hands",
  "12-14": "hands",
  "14-16": "hands",
  "11-23": "hips",
  "12-24": "hips",
  "23-24": "balance",
  "23-25": "knees",
  "25-27": "knees",
  "27-29": "knees",
  "29-31": "knees",
  "24-26": "knees",
  "26-28": "knees",
  "28-30": "knees",
  "30-32": "knees",
};

const POINT_CATEGORY: Record<number, keyof SegmentEvaluation | undefined> = {
  11: "shoulders",
  12: "shoulders",
  13: "hands",
  14: "hands",
  15: "hands",
  16: "hands",
  23: "balance",
  24: "balance",
  25: "knees",
  26: "knees",
  27: "knees",
  28: "knees",
  29: "knees",
  30: "knees",
  31: "knees",
  32: "knees",
};

const NEUTRAL_COLOR = "#F4F7F9";

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function findNearestFrame<T extends { tSeconds: number }>(frames: T[], t: number): T | null {
  if (!frames.length) return null;
  let best = frames[0];
  let bestDiff = Math.abs(frames[0].tSeconds - t);
  for (const f of frames) {
    const diff = Math.abs(f.tSeconds - t);
    if (diff < bestDiff) {
      best = f;
      bestDiff = diff;
    }
  }
  return best;
}

export default function SkeletonReplay({ videoUrl, poseFrames, metricsFrames }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.videoWidth) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const poseFrame = findNearestFrame(poseFrames, video.currentTime);
          const metricsFrame = findNearestFrame(metricsFrames, video.currentTime);
          const evalResult = metricsFrame ? evaluateFrame(metricsFrame) : null;

          if (poseFrame) {
            const landmarks = poseFrame.landmarks;
            const toPx = (l: Landmark): [number, number] => [l.x * canvas.width, l.y * canvas.height];

            ctx.lineWidth = 4;
            for (const [a, b] of POSE_CONNECTIONS) {
              const la = landmarks[a];
              const lb = landmarks[b];
              if (!la || !lb) continue;
              const confidence = Math.min(la.visibility ?? 1, lb.visibility ?? 1);
              const category = SEGMENT_CATEGORY[`${a}-${b}`];
              const color = evalResult && category ? SEGMENT_COLORS[evalResult[category]] : NEUTRAL_COLOR;
              ctx.strokeStyle = confidence < CONFIDENCE_THRESHOLD ? withAlpha(color, 0.25) : color;
              const [ax, ay] = toPx(la);
              const [bx, by] = toPx(lb);
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }

            landmarks.forEach((l, i) => {
              const confidence = l.visibility ?? 1;
              const category = POINT_CATEGORY[i];
              const color = evalResult && category ? SEGMENT_COLORS[evalResult[category]] : NEUTRAL_COLOR;
              ctx.fillStyle = confidence < CONFIDENCE_THRESHOLD ? withAlpha(color, 0.25) : color;
              const [x, y] = toPx(l);
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [poseFrames, metricsFrames]);

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          background: "#000",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <video ref={videoRef} src={videoUrl} controls muted playsInline style={{ width: "100%", display: "block" }} />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12 }}>
        {(Object.keys(SEGMENT_LABELS) as (keyof SegmentEvaluation)[]).map((key) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: SEGMENT_COLORS.OK, display: "inline-block" }} />
            {SEGMENT_LABELS[key]}
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--color-muted)", marginTop: 6 }}>
        Verde = dentro de rango saludable · Ámbar/Naranja = leve/moderado · Rojo = alto (mismos umbrales que la pantalla de Errores)
      </p>
    </div>
  );
}
