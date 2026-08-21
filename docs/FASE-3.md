# Stance — Fase 3: Visión por Computador (Detección de Pose)

## 1. Objetivo y criterios de aceptación

**Objetivo:** al reproducir un video ya subido, ver el esqueleto (33 puntos
de MediaPipe Pose: cabeza, hombros, codos, muñecas, columna, cadera,
rodillas, tobillos, pies) superpuesto sobre el video, y que ese resultado
quede guardado para que la Fase 4 pueda calcular ángulos sin repetir la
detección.

**Criterios de aceptación:**
- [ ] Web: en `/videos/[id]/analyze`, al presionar "Analizar video" se ve el
      esqueleto dibujado en tiempo real sobre el video mientras se reproduce.
- [ ] Al terminar, el análisis se guarda (`POST /pose-analysis`) y el mensaje
      de confirmación muestra cantidad de cuadros y confianza promedio.
- [ ] Mobile: desde "Mis videos" → "Analizar", se abre una pantalla con el
      mismo comportamiento (esqueleto dibujado, guardado al finalizar).
- [ ] Los puntos con confianza (`visibility`) por debajo de 0.5 se dibujan
      visiblemente más tenues que los de alta confianza (no se ocultan
      completamente, pero se distinguen).
- [ ] Un video sin cuerpo detectable (mal encuadre) termina en un mensaje de
      error claro, no en un guardado silencioso de datos vacíos/falsos.
- [ ] `GET /api/v1/videos/:id/pose-analysis` devuelve los landmarks guardados
      para ese video.

## 2. Arquitectura y por qué

```
        WEB                              MOBILE
┌─────────────────────┐          ┌──────────────────────────┐
│ <video> + <canvas>   │          │ WebView (navegador real) │
│ MediaPipe Tasks      │          │ con el MISMO motor JS/WASM│
│ Vision (WASM), en    │          │ de MediaPipe cargado      │
│ el propio navegador  │          │ desde el mismo CDN         │
└─────────┬────────────┘          └───────────┬───────────────┘
          │ detectForVideo() por cuadro                       │
          │ dibuja esqueleto en <canvas>                       │
          │ acumula { tSeconds, landmarks[33] } por cuadro     │
          ▼                                                    ▼
   al terminar el video, postMessage/llamada directa con el resultado
          │
          ▼
POST /api/v1/videos/:id/pose-analysis   (backend solo persiste, no detecta)
```

**Por qué la detección corre en el cliente y no en el backend:** MediaPipe
Pose y TFLite (elegidos en el stack original) son motores diseñados para
correr "on-device" — no necesitan GPU de servidor ni colas de procesamiento.
Procesarlo en el cliente es más rápido de entregar, más barato (sin costo de
cómputo en servidor por video), y es exactamente el patrón para el que estas
librerías fueron diseñadas.

**Por qué mobile usa un WebView en vez de un módulo nativo TFLite:** Expo en
flujo administrado no incluye un puente nativo a TensorFlow Lite/MediaPipe
sin "eject" a React Native bare (lo cual añade complejidad de build nativo
por plataforma). Un WebView es un navegador real dentro de la app: puede
ejecutar la misma librería JS/WASM que la web, sin salir del flujo
administrado de Expo. Es una solución real, no una simulación — el modelo
corre de verdad, cuadro por cuadro, dentro del WebView.

**Qué NO se corrigió con esta decisión (documentado, no oculto):** correr un
navegador embebido consume más batería/CPU que un módulo TFLite nativo
puro. Si el rendimiento en dispositivos de gama baja no es aceptable más
adelante, la alternativa es ejectar a bare workflow y usar `react-native-fast-tflite`
o `vision-camera` con un frame processor nativo — se documenta como mejora
futura, no se implementa ahora para no bloquear esta fase.

## 3. Estructura de carpetas (nuevo en esta fase)

```
api/src/modules/pose/
  pose.dto.ts            # valida 33 landmarks por frame
  pose.repository.ts
  pose.service.ts         # verifica ownership vía el video asociado
  pose.controller.ts
  (rutas montadas dentro de video.routes.ts, bajo /videos/:id/pose-analysis)

web/lib/poseLandmarker.ts        # singleton del modelo MediaPipe
web/components/PoseAnalyzer.tsx  # video + canvas + loop de detección
web/app/videos/[id]/analyze/page.tsx

mobile/src/pose/poseEngineHtml.ts   # motor de detección como HTML embebido
mobile/src/screens/PoseAnalysisScreen.tsx  # WebView + guardado en backend
```

## 4. Base de datos

Nuevo modelo `PoseAnalysis` (uno a uno con `VideoSession`): guarda `fps`,
`frameCount`, `avgConfidence`, `engine`, y `framesJson` (el array completo de
frames con sus 33 landmarks). Se eligió `Json` en vez de una tabla de
"landmarks" fila-por-fila porque este dato se lee y escribe siempre completo
(nunca se filtra un landmark individual desde SQL) — una tabla normalizada
aquí solo añadiría joins costosos sin beneficio real.

```bash
cd api
npx prisma migrate dev --name add_pose_analysis
```

## 5. Backend — nuevos endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/v1/videos/:id/pose-analysis` | guarda el resultado ya calculado en el cliente |
| GET | `/api/v1/videos/:id/pose-analysis` | devuelve los landmarks guardados |

## 6. Cómo probarlo manualmente

1. `cd api && npx prisma migrate dev --name add_pose_analysis && npm run dev`
2. Web: `cd web && npm install && npm run dev`. Sube un video (Fase 2) donde
   se vea el cuerpo completo de lado. Ve a "Mis videos" → "Analizar".
3. Presiona "Analizar video": deberías ver el esqueleto turquesa dibujado
   sobre el video mientras se reproduce. Al terminar, aparece el mensaje con
   cantidad de cuadros y confianza promedio.
4. Verifica en Prisma Studio (`npx prisma studio`) que la tabla
   `PoseAnalysis` tiene una fila para ese video con `status = COMPLETED`.
5. Mobile: `cd mobile && npm install && npx expo start`. Desde "Mis videos",
   presiona "Analizar" en un video subido. Debe abrirse el WebView, verse el
   esqueleto dibujado, y al terminar mostrar el mensaje de guardado.
6. Prueba con un video mal encuadrado (por ejemplo, solo el mar sin persona):
   debe mostrar el mensaje de error, no un "análisis guardado" falso.

## 7. Riesgos y deuda técnica conocida

- **Rendimiento en dispositivos de gama baja (mobile):** el WebView + WASM
  puede ser lento en teléfonos antiguos. No se hizo benchmarking formal en
  esta fase; si es un problema real, la mejora futura es un módulo nativo
  TFLite (ver sección 2).
- **Un solo ángulo de cámara, una sola persona en cuadro:** `numPoses: 1`.
  Videos con más de una persona visible pueden confundir la detección; se
  deja para una fase posterior decidir cómo seleccionar "la persona correcta"
  si es necesario.
- **Sin reintento automático si el modelo no carga** (por ejemplo, sin
  internet la primera vez que se descarga el WASM/modelo desde el CDN). Se
  documenta como mejora de UX futura.
- **El video se reproduce en tiempo real para analizarlo** (no hay
  "análisis acelerado" cuadro por cuadro sin reproducir) — esto es una
  limitación de correr en el hilo del navegador; videos largos tardan tanto
  como su propia duración en analizarse.

## 8. Qué queda explícitamente fuera de esta fase

Cálculo de ángulos, centro de gravedad, simetría, velocidad angular, etc.
(eso es la Fase 4 — Biomecánica, que consume exactamente el `framesJson`
guardado aquí). Esta fase solo garantiza que el esqueleto se detecta
correctamente y el resultado queda persistido.
