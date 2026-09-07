import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";

let detectorPromise: Promise<ObjectDetector> | null = null;

/**
 * Detector de personas (EfficientDet-Lite2, clase "person" de COCO) — se usa
 * como primer paso para ubicar al deportista en el cuadro ANTES de buscarle
 * los 33 puntos de pose. En deportes acuáticos grabados desde la playa, la
 * persona suele ocupar una fracción muy pequeña del cuadro; el propio
 * PoseLandmarker reduce cada cuadro a una resolución interna baja antes de
 * procesarlo, así que a esa escala una persona lejana puede quedar en unos
 * pocos píxeles — insuficiente para cualquier modelo de pose. Recortar y
 * agrandar primero la zona donde está la persona (ver personDetector.locate
 * + el recorte manual en PoseAnalyzer) resuelve ese límite de resolución.
 */
export function getPersonDetector(): Promise<ObjectDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      return ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          // "lite0" (320x320) en vez de "lite2" (448x448): bastante más
          // rápido en dispositivos débiles (mobile) — se pierde algo de
          // rango en personas extremadamente pequeñas, pero un detector que
          // hace tartamudear el video en cada cuadro no le sirve a nadie.
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        maxResults: 1,
        scoreThreshold: 0.15,
        categoryAllowlist: ["person"],
      });
    })();
  }
  return detectorPromise;
}

export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Busca a la persona en el cuadro actual del video y devuelve su caja
 * delimitadora en píxeles (coordenadas del video, no normalizadas). null si
 * no encontró a nadie con suficiente confianza en este cuadro.
 */
export function locatePerson(
  detector: ObjectDetector,
  video: HTMLVideoElement,
  timestampMs: number
): PixelBox | null {
  const result = detector.detectForVideo(video, timestampMs);
  const box = result.detections[0]?.boundingBox;
  if (!box) return null;
  return { x: box.originX, y: box.originY, width: box.width, height: box.height };
}

/**
 * Si la persona ya ocupa buena parte del cuadro (video grabado de cerca), el
 * recorte/zoom no aporta nada — solo agrega un dibujo de canvas por cuadro
 * de puro costo. Se activa solo cuando de verdad puede rescatar la detección.
 */
export function isCropWorthwhile(box: PixelBox, videoHeight: number): boolean {
  return box.height / videoHeight < 0.5;
}

/**
 * Agranda la caja de la persona con un margen (para no cortar manos/pies si
 * se mueve entre una detección y la siguiente) y la recorta contra los
 * límites del video.
 */
export function padBox(box: PixelBox, videoWidth: number, videoHeight: number, paddingRatio = 0.4): PixelBox {
  const padX = box.width * paddingRatio;
  const padY = box.height * paddingRatio;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const right = Math.min(videoWidth, box.x + box.width + padX);
  const bottom = Math.min(videoHeight, box.y + box.height + padY);
  return { x, y, width: right - x, height: bottom - y };
}
