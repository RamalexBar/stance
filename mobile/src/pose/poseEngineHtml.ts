/**
 * Fase 3 — Motor de detección de pose para mobile.
 *
 * Decisión de arquitectura: Expo (managed workflow) no tiene un puente
 * nativo simple a TensorFlow Lite/MediaPipe sin salir del flujo administrado
 * ("eject"). En su lugar, este mismo motor JS/WASM de MediaPipe que se usa
 * en la web se ejecuta dentro de un WebView (que es un navegador real). El
 * WebView reproduce el video, dibuja el esqueleto, y cuando termina manda
 * el resultado de vuelta a React Native por postMessage. React Native nunca
 * expone el token de autenticación dentro del WebView: la persistencia en
 * el backend la hace la pantalla nativa (PoseAnalysisScreen), no esta página.
 */
export const POSE_ENGINE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    html, body { margin: 0; background: #0A0E12; overflow: hidden; }
    #wrap { position: relative; width: 100vw; }
    video, canvas { position: absolute; top: 0; left: 0; width: 100%; }
    #status {
      position: absolute; bottom: 12px; left: 12px; right: 12px;
      color: #7C8A96; font-family: sans-serif; font-size: 13px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="wrap">
    <video id="video" muted playsinline></video>
    <canvas id="canvas"></canvas>
  </div>
  <div id="status">Cargando modelo…</div>

  <script type="module">
    import {
      FilesetResolver,
      PoseLandmarker,
      ObjectDetector,
    } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

    const CONFIDENCE_THRESHOLD = 0.5;
    // Cada cuántos cuadros se vuelve a ubicar a la persona con el detector
    // de objetos para actualizar la zona de recorte (ver PoseAnalyzer.tsx
    // en web — misma lógica).
    const PERSON_DETECT_INTERVAL = 10;
    const CONNECTIONS = [
      [11,12],[11,13],[13,15],[12,14],[14,16],
      [11,23],[12,24],[23,24],
      [23,25],[25,27],[27,29],[29,31],
      [24,26],[26,28],[28,30],[30,32],
      [9,10],
    ];

    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("status");
    const frames = [];
    const cropCanvas = document.createElement("canvas");
    const cropCtx = cropCanvas.getContext("2d");
    let cropBox = null;
    let frameIndex = 0;

    function post(type, payload) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type, payload }));
    }

    function padBox(box, videoWidth, videoHeight, paddingRatio) {
      const padX = box.width * paddingRatio;
      const padY = box.height * paddingRatio;
      const x = Math.max(0, box.originX - padX);
      const y = Math.max(0, box.originY - padY);
      const right = Math.min(videoWidth, box.originX + box.width + padX);
      const bottom = Math.min(videoHeight, box.originY + box.height + padY);
      return { x, y, width: right - x, height: bottom - y };
    }

    function remapToFullFrame(landmarks, crop, videoWidth, videoHeight) {
      return landmarks.map((l) => ({
        x: (crop.x + l.x * crop.width) / videoWidth,
        y: (crop.y + l.y * crop.height) / videoHeight,
        z: l.z,
        visibility: l.visibility,
      }));
    }

    function drawFrame(landmarks) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const toPx = (l) => [l.x * canvas.width, l.y * canvas.height];

      ctx.lineWidth = 3;
      for (const [a, b] of CONNECTIONS) {
        const la = landmarks[a], lb = landmarks[b];
        if (!la || !lb) continue;
        const conf = Math.min(la.visibility ?? 1, lb.visibility ?? 1);
        ctx.strokeStyle = conf < CONFIDENCE_THRESHOLD
          ? "rgba(23,224,195,0.25)" : "rgba(23,224,195,0.9)";
        const [ax, ay] = toPx(la), [bx, by] = toPx(lb);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      landmarks.forEach((l) => {
        const conf = l.visibility ?? 1;
        ctx.fillStyle = conf < CONFIDENCE_THRESHOLD
          ? "rgba(244,247,249,0.25)" : "rgba(244,247,249,0.95)";
        const [x, y] = toPx(l);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill();
      });
    }

    async function main() {
      const videoUrl = window.__STANCE_VIDEO_URL__;
      if (!videoUrl) {
        statusEl.textContent = "No se recibió URL de video.";
        post("error", "No se recibió la URL del video a analizar.");
        return;
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const [landmarker, personDetector] = await Promise.all([
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          // Igual que en web/lib/poseLandmarker.ts: más permisivo que el 0.5
          // por defecto para que un deportista pequeño y lejano (grabado desde
          // la playa) no se rechace de entrada.
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        }),
        ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/latest/efficientdet_lite2.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          maxResults: 1,
          scoreThreshold: 0.15,
          categoryAllowlist: ["person"],
        }),
      ]);

      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      await new Promise((resolve) => { video.onloadedmetadata = resolve; });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      document.getElementById("wrap").style.height = canvas.height * (canvas.clientWidth / canvas.width) + "px";

      statusEl.textContent = "Detectando pose…";
      await video.play();

      let cropAssistBroken = false;

      function loop() {
        if (video.paused || video.ended) return;
        const now = performance.now();
        let landmarks;

        try {
          if (!cropAssistBroken && frameIndex % PERSON_DETECT_INTERVAL === 0) {
            const detection = personDetector.detectForVideo(video, now);
            const box = detection.detections[0]?.boundingBox;
            if (box) cropBox = padBox(box, video.videoWidth, video.videoHeight, 0.4);
          }
          frameIndex += 1;

          if (!cropAssistBroken && cropBox && cropBox.width > 0 && cropBox.height > 0) {
            const targetMax = 768;
            const scale = Math.max(1, targetMax / Math.max(cropBox.width, cropBox.height));
            cropCanvas.width = Math.round(cropBox.width * scale);
            cropCanvas.height = Math.round(cropBox.height * scale);
            cropCtx.drawImage(
              video,
              cropBox.x,
              cropBox.y,
              cropBox.width,
              cropBox.height,
              0,
              0,
              cropCanvas.width,
              cropCanvas.height
            );
            const result = landmarker.detectForVideo(cropCanvas, now);
            const raw = result.landmarks?.[0];
            if (raw && raw.length === 33) {
              landmarks = remapToFullFrame(raw, cropBox, video.videoWidth, video.videoHeight);
            }
          } else {
            const result = landmarker.detectForVideo(video, now);
            const raw = result.landmarks?.[0];
            if (raw && raw.length === 33) landmarks = raw;
          }
        } catch (err) {
          // No tiramos todo el análisis por un cuadro puntual — se desactiva
          // el recorte/zoom para el resto del video en vez de quedar pegado.
          cropAssistBroken = true;
        }

        if (landmarks) {
          drawFrame(landmarks);
          frames.push({ tSeconds: video.currentTime, landmarks });
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);

      video.onended = () => {
        if (frames.length === 0) {
          const tip = "No se detectó ninguna pose en todo el video. Revisa el encuadre: " +
            "el deportista debe verse completo (de cabeza a pies) y de lado, ocupando " +
            "buena parte del cuadro — ni tan cerca que corte pies o cabeza, ni tan " +
            "lejos que se vea como un punto pequeño. Evita que haya más de una " +
            "persona visible en el video.";
          statusEl.textContent = tip;
          post("error", tip);
          return;
        }
        const duration = video.duration || frames[frames.length - 1].tSeconds || 1;
        const fps = frames.length / duration;
        const allConf = frames.flatMap((f) => f.landmarks.map((l) => l.visibility ?? 1));
        const avgConfidence = allConf.reduce((a, b) => a + b, 0) / allConf.length;

        statusEl.textContent = "Análisis completo. Guardando…";
        post("done", { fps, frames, avgConfidence, engine: "mediapipe-pose-landmarker-lite" });
      };
    }

    main().catch((err) => {
      statusEl.textContent = "Error cargando el modelo de pose.";
      post("error", String(err));
    });
  </script>
</body>
</html>
`;
