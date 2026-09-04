"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPoseLandmarker,
  POSE_CONNECTIONS,
  CONFIDENCE_THRESHOLD,
} from "../lib/poseLandmarker";
import { getPersonDetector, locatePerson, padBox, PixelBox } from "../lib/personDetector";
import { apiPost } from "../lib/api";

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Cada cuántos cuadros se vuelve a ubicar a la persona con el detector de
// objetos (más pesado que el de pose) para actualizar la zona de recorte.
// No hace falta en cada cuadro: el deportista no se desplaza tanto en
// 200-400ms como para que el recorte anterior deje de servir.
const PERSON_DETECT_INTERVAL = 10;

function remapToFullFrame(landmarks: Landmark[], crop: PixelBox, videoWidth: number, videoHeight: number): Landmark[] {
  return landmarks.map((l) => ({
    x: (crop.x + l.x * crop.width) / videoWidth,
    y: (crop.y + l.y * crop.height) / videoHeight,
    z: l.z,
    visibility: l.visibility,
  }));
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
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropBoxRef = useRef<PixelBox | null>(null);
  const frameIndexRef = useRef(0);
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
    setMessage("Cargando modelos…");
    framesRef.current = [];
    attemptedFramesRef.current = 0;
    cropBoxRef.current = null;
    frameIndexRef.current = 0;
    let cropAssistBroken = false;

    let landmarker, personDetector;
    try {
      [landmarker, personDetector] = await Promise.all([
        getPoseLandmarker(),
        getPersonDetector(),
      ]);
    } catch (err) {
      console.error(err);
      setState("error");
      setMessage(
        "No se pudo cargar el modelo de análisis (revisa tu conexión a internet y vuelve a intentar)."
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement("canvas");
    const cropCanvas = cropCanvasRef.current;
    const cropCtx = cropCanvas.getContext("2d");

    try {
      video.currentTime = 0;
      await video.play();
    } catch (err) {
      console.error(err);
      setState("error");
      setMessage("No se pudo reproducir el video para analizarlo.");
      return;
    }
    setMessage("Detectando pose…");

    const loop = () => {
      if (video.paused || video.ended) return;

      const now = performance.now();
      let landmarks: Landmark[] | undefined;

      try {
        // Cada PERSON_DETECT_INTERVAL cuadros, ubica (o reubica) a la
        // persona en el cuadro completo para actualizar la zona de recorte.
        // Si no la encuentra en este muestreo, mantiene la última zona
        // conocida en vez de descartarla — una ola o un giro brusco no
        // debería tirar todo el seguimiento.
        if (!cropAssistBroken && frameIndexRef.current % PERSON_DETECT_INTERVAL === 0) {
          const box = locatePerson(personDetector, video, now);
          if (box) cropBoxRef.current = padBox(box, video.videoWidth, video.videoHeight);
        }
        frameIndexRef.current += 1;

        const crop = cropBoxRef.current;

        if (!cropAssistBroken && crop && cropCtx && crop.width > 0 && crop.height > 0) {
          // Recorta la zona de la persona y la agranda antes de buscar la
          // pose — así un deportista pequeño y lejano (grabado desde la
          // playa) deja de perderse en la reducción de resolución interna
          // del modelo. Las coordenadas que devuelve están normalizadas al
          // recorte, así que se convierten de vuelta al cuadro completo.
          const targetMax = 768;
          const scale = Math.max(1, targetMax / Math.max(crop.width, crop.height));
          cropCanvas.width = Math.round(crop.width * scale);
          cropCanvas.height = Math.round(crop.height * scale);
          cropCtx.drawImage(
            video,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height
          );
          const result = landmarker.detectForVideo(cropCanvas, now);
          const raw = result.landmarks?.[0];
          if (raw && raw.length === 33) {
            landmarks = remapToFullFrame(raw, crop, video.videoWidth, video.videoHeight);
          }
        } else {
          const result = landmarker.detectForVideo(video, now);
          const raw = result.landmarks?.[0];
          if (raw && raw.length === 33) landmarks = raw;
        }
      } catch (err) {
        // Un cuadro puntual puede fallar (p. ej. el canvas de recorte queda
        // en un estado raro); no tiramos todo el análisis por eso — se
        // desactiva el recorte/zoom para el resto del video y se sigue
        // intentando sobre el cuadro completo, en vez de quedar "pegado".
        console.error("Fallo detectando un cuadro, se desactiva el recorte/zoom:", err);
        cropAssistBroken = true;
      }

      attemptedFramesRef.current += 1;

      if (landmarks) {
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
      setMessage(
        "No se detectó ninguna pose en todo el video. Revisa el encuadre: el " +
          "deportista debe verse completo (de cabeza a pies) y de lado, ocupando " +
          "buena parte del cuadro — ni tan cerca que corte pies o cabeza, ni tan " +
          "lejos que se vea como un punto pequeño. Evita que haya más de una " +
          "persona visible en el video."
      );
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
