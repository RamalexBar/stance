"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPoseLandmarker,
  POSE_CONNECTIONS,
  CONFIDENCE_THRESHOLD,
} from "../lib/poseLandmarker";
import { apiPost } from "../lib/api";

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface CapturedFrame {
  tSeconds: number;
  landmarks: Landmark[];
}

interface Props {
  videoId: string;
  videoUrl: string;
}

type AnalysisState = "idle" | "running" | "saving" | "done" | "error";

export default function PoseAnalyzer({ videoId, videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<CapturedFrame[]>([]);
  const attemptedFramesRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<AnalysisState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function drawFrame(landmarks: Landmark[]) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toPx = (l: Landmark) => [l.x * canvas.width, l.y * canvas.height];

    // Líneas del esqueleto
    ctx.lineWidth = 3;
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (!la || !lb) continue;
      const confidence = Math.min(la.visibility ?? 1, lb.visibility ?? 1);
      ctx.strokeStyle =
        confidence < CONFIDENCE_THRESHOLD
          ? "rgba(23, 224, 195, 0.25)" // atenuado: baja confianza
          : "rgba(23, 224, 195, 0.9)";
      const [ax, ay] = toPx(la);
      const [bx, by] = toPx(lb);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Puntos (keypoints)
    landmarks.forEach((l) => {
      const confidence = l.visibility ?? 1;
      ctx.fillStyle =
        confidence < CONFIDENCE_THRESHOLD
          ? "rgba(244, 247, 249, 0.25)"
          : "rgba(244, 247, 249, 0.95)";
      const [x, y] = toPx(l);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  async function startAnalysis() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setState("running");
    setMessage("Cargando modelo de pose…");
    framesRef.current = [];
    attemptedFramesRef.current = 0;

    const landmarker = await getPoseLandmarker();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    video.currentTime = 0;
    await video.play();
    setMessage("Detectando pose…");

    const loop = () => {
      if (video.paused || video.ended) return;

      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0];
      attemptedFramesRef.current += 1;

      if (landmarks && landmarks.length === 33) {
        drawFrame(landmarks);
        framesRef.current.push({ tSeconds: video.currentTime, landmarks });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    video.onended = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      finishAnalysis();
    };
  }

  async function finishAnalysis() {
    const frames = framesRef.current;
    const video = videoRef.current;

    if (frames.length === 0) {
      setState("error");
      setMessage("No se detectó ninguna pose en el video. Verifica el encuadre.");
      return;
    }

    setState("saving");
    setMessage("Guardando análisis…");

    const duration = video?.duration || frames[frames.length - 1].tSeconds || 1;
    const fps = frames.length / duration;
    const allConfidences = frames.flatMap((f) =>
      f.landmarks.map((l) => l.visibility ?? 1)
    );
    const avgConfidence =
      allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;

    const attempted = attemptedFramesRef.current || frames.length;
    const captureRate = frames.length / attempted;

    try {
      await apiPost(`/api/v1/videos/${videoId}/pose-analysis`, {
        fps,
        frames,
        avgConfidence,
        engine: "mediapipe-pose-landmarker-lite",
      });
      setState("done");
      const base = `Análisis guardado: ${frames.length} cuadros, confianza promedio ${(
        avgConfidence * 100
      ).toFixed(0)}%.`;
      // Los saltos son justo donde el cuerpo suele salir parcialmente de
      // cuadro y MediaPipe pierde la detección — avisamos en vez de dejar
      // que el usuario piense que el análisis cubrió todo el video.
      setMessage(
        captureRate < 0.7
          ? `${base} Solo se detectó la pose en ${(captureRate * 100).toFixed(
              0
            )}% del video — es normal en momentos de mucho movimiento (saltos), pero si el número es muy bajo revisa que el deportista esté siempre en cuadro.`
          : base
      );
    } catch (err) {
      console.error(err);
      setState("error");
      setMessage("No se pudo guardar el análisis. Intenta de nuevo.");
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
          muted
          playsInline
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

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "12px 24px" }}
          onClick={startAnalysis}
          disabled={state === "running" || state === "saving"}
        >
          {state === "idle" && "Analizar video"}
          {state === "running" && "Detectando…"}
          {state === "saving" && "Guardando…"}
          {state === "done" && "Analizar de nuevo"}
          {state === "error" && "Reintentar"}
        </button>
        {message && (
          <p
            className={state === "error" ? "error-text" : "success-text"}
            style={{ marginTop: 10 }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
