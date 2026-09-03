import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Carga perezosa y única del modelo. El WASM y el modelo .task se descargan
 * la primera vez desde el CDN oficial de MediaPipe; el navegador los cachea.
 */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        // Por defecto estos tres están en 0.5 — muy estricto para deportes
        // acuáticos grabados desde lejos (playa/drone), donde el deportista
        // ocupa pocos píxeles del cuadro. Bajarlos no cambia el modelo ni el
        // rendimiento, solo qué tan dispuesto está a aceptar una detección
        // de menor certeza en vez de reportar "no hay pose".
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
    })();
  }
  return landmarkerPromise;
}

// Pares de índices que forman el "esqueleto" de los 33 landmarks de MediaPipe Pose.
export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // hombros
  [11, 13], [13, 15], // brazo izq
  [12, 14], [14, 16], // brazo der
  [11, 23], [12, 24], // torso
  [23, 24], // cadera
  [23, 25], [25, 27], [27, 29], [29, 31], // pierna izq
  [24, 26], [26, 28], [28, 30], [30, 32], // pierna der
  [9, 10], // cabeza (orejas aprox.)
];

// Umbral mínimo de confianza por keypoint (definido en la Fase 0/3):
// por debajo de esto, el punto se dibuja atenuado en vez de sólido.
export const CONFIDENCE_THRESHOLD = 0.5;
