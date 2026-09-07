"use client";

import { useEffect, useRef, useState } from "react";
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

const NEUTRAL_COLOR = "#ECF3EF";

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
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Dibuja el esqueleto (líneas + puntos) sobre un contexto de canvas ya
  // preparado — se reutiliza tanto para el overlay en vivo como para el
  // canvas compuesto que se graba al exportar el clip.
  function drawSkeleton(ctx: CanvasRenderingContext2D, width: number, height: number, tSeconds: number) {
    const poseFrame = findNearestFrame(poseFrames, tSeconds);
    const metricsFrame = findNearestFrame(metricsFrames, tSeconds);
    const evalResult = metricsFrame ? evaluateFrame(metricsFrame) : null;
    if (!poseFrame) return;

    const landmarks = poseFrame.landmarks;
    const toPx = (l: Landmark): [number, number] => [l.x * width, l.y * height];

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
          drawSkeleton(ctx, canvas.width, canvas.height, video.currentTime);
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [poseFrames, metricsFrames]);

  // Graba un clip nuevo (video + esqueleto + marca) usando MediaRecorder
  // sobre un canvas compuesto — no depende de servicios externos ni de
  // procesar video en el backend, corre entero en el navegador.
  async function recordClip() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    if (typeof MediaRecorder === "undefined") {
      setRecordError("Tu navegador no soporta grabar video (MediaRecorder no disponible).");
      return;
    }

    setRecordError(null);
    setRecording(true);

    const width = video.videoWidth;
    const height = video.videoHeight;
    const recCanvas = document.createElement("canvas");
    recCanvas.width = width;
    recCanvas.height = height;
    // captureStream() no produce frames si el canvas está completamente
    // desconectado del documento, o posicionado tan lejos de pantalla que el
    // navegador no lo compone — se agrega dentro del viewport pero casi
    // transparente y detrás de todo, invisible para el usuario.
    recCanvas.style.position = "fixed";
    recCanvas.style.left = "0";
    recCanvas.style.top = "0";
    recCanvas.style.zIndex = "-1";
    recCanvas.style.opacity = "0.01";
    document.body.appendChild(recCanvas);
    const ctx = recCanvas.getContext("2d");
    if (!ctx) {
      recCanvas.remove();
      setRecording(false);
      setRecordError("No se pudo preparar el canvas de grabación.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    // captureStream(fps) usa un timer interno que en algunas versiones de
    // Chromium no queda bien sincronizado con un canvas 2D actualizado por
    // rAF y termina sin alimentar al encoder (video final vacío aunque el
    // canvas sí se esté dibujando). Se fuerza cada frame explícitamente con
    // requestFrame() como workaround conocido para ese bug.
    const stream = (recCanvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(0);
    const [track] = stream.getVideoTracks() as (MediaStreamTrack & { requestFrame?: () => void })[];
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    let raf: number;
    function frameLoop() {
      if (!video || video.paused || video.ended) return;
      try {
        ctx!.clearRect(0, 0, width, height);
        ctx!.drawImage(video, 0, 0, width, height);
        drawSkeleton(ctx!, width, height, video.currentTime);
        ctx!.font = `bold ${Math.round(height * 0.035)}px sans-serif`;
        ctx!.fillStyle = "rgba(23,224,195,0.9)";
        ctx!.fillText("Stance", 16, height - 16);
        // captureStream(0) es modo manual: cada frame hay que empujarlo
        // explícitamente, si no el video final queda vacío.
        track?.requestFrame?.();
      } catch (drawErr) {
        console.error(drawErr);
      }
      raf = requestAnimationFrame(frameLoop);
    }

    try {
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          video.addEventListener("loadeddata", () => resolve(), { once: true });
        });
      }
      video.currentTime = 0;
      await video.play();
      recorder.start();
      frameLoop();

      await new Promise<void>((resolve) => {
        video.onended = () => {
          cancelAnimationFrame(raf);
          recorder.stop();
          video.onended = null;
          resolve();
        };
      });

      await stopped;

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stance-clip.webm";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setRecordError("No se pudo grabar el clip. Intenta de nuevo.");
    } finally {
      recCanvas.remove();
      setRecording(false);
    }
  }

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
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          muted
          playsInline
          crossOrigin="anonymous"
          style={{ width: "100%", display: "block" }}
        />
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

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "10px 20px" }}
          onClick={recordClip}
          disabled={recording}
        >
          {recording ? "Grabando clip…" : "🎬 Descargar clip con esqueleto"}
        </button>
        {recordError && <p className="error-text" style={{ marginTop: 8 }}>{recordError}</p>}
        <p style={{ color: "var(--color-muted)", fontSize: 11, marginTop: 6 }}>
          Se reproduce el video una vez para grabarlo — no cierres esta pantalla mientras dice "Grabando".
        </p>
      </div>
    </div>
  );
}
