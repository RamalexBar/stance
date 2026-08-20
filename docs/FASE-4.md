# Foilio — Fase 4: Biomecánica

## 1. Objetivo y criterios de aceptación

**Objetivo:** a partir de los landmarks guardados en la Fase 3, calcular
automáticamente ángulos y métricas biomecánicas, mostrarlas con su evolución
en el tiempo, y marcar claramente cuáles son mediciones directas y cuáles
son estimaciones.

**Criterios de aceptación:**
- [ ] Al entrar a "Biomecánica" de un video ya analizado (Fase 3), se calculan
      y muestran: ángulo de rodilla, cadera, tobillo, hombro y codo (izq/der),
      inclinación de tronco, rotación de tronco (estimada), balance, simetría.
- [ ] Web: cada métrica principal tiene un gráfico de su evolución en el
      tiempo (Victory Charts), además de tarjetas de resumen (promedio).
- [ ] Mobile: se muestran las mismas tarjetas de resumen (sin gráficos de
      serie temporal — ver sección 7).
- [ ] Si el usuario intenta ver biomecánica de un video SIN análisis de pose
      previo, el sistema lo dice explícitamente y ofrece ir a analizarlo,
      en vez de mostrar números vacíos o inventados.
- [ ] Las métricas que son estimaciones (carga articular, rotación de tronco,
      centro de masa, "cadencia") están visualmente etiquetadas como tal, con
      una explicación de por qué son aproximadas.
- [ ] "Potencia estimada", "fuerzas aplicadas" y "tiempo de reacción" NO
      aparecen en esta fase (ver sección 8) — no se inventan números para
      rellenar el módulo original.

## 2. Arquitectura y por qué

Este cálculo corre **en el backend**, a diferencia de la detección de pose
(Fase 3, que corría en el cliente). La razón es simple: convertir landmarks
en ángulos es trigonometría determinista (`Math.acos`, `Math.atan2`), no
inferencia de un modelo de IA. Hacerlo en el backend permite:
- Recalcular sin que el usuario vuelva a analizar el video.
- Tener la misma lógica para web y mobile sin duplicar código de cálculo.

```
GET  pose-analysis (Fase 3, ya guardado)
        │
        ▼
POST /api/v1/videos/:id/biomechanics
        │  1. verifica que el usuario es dueño del video
        │  2. verifica que existe un PoseAnalysis para ese video
        │  3. calcula ángulos/métricas frame por frame (geometry.ts)
        │  4. guarda serie completa + resumen (min/max/mean)
        ▼
GET /api/v1/videos/:id/biomechanics  →  usado por web (gráficos) y mobile (tarjetas)
```

**Decisión explícita sobre qué SÍ y qué NO se calcula** (aplicando la mejora
que se había anotado en el prompt maestro para esta fase): con una sola
cámara 2D no hay forma honesta de calcular fuerza real en Newtons ni
potencia en vatios — eso requiere masa, aceleración *real* (con escala
métrica) y idealmente sensores. Por eso:
- Se calculan con precisión real: todos los ángulos (son geometría pura,
  no dependen de escala real, solo de las proporciones del cuerpo en la
  imagen).
- Se calculan como estimación explícita y etiquetada: centro de masa,
  balance, rotación de tronco (usa `z` de MediaPipe, que es una profundidad
  relativa, no una medición 3D calibrada), "carga articular" (índice
  relativo, no una fuerza real), "oscilación de tronco" (sustituto de
  cadencia para una maniobra que no es cíclica).
- No se calculan en absoluto: potencia estimada, fuerzas aplicadas, tiempo
  de reacción. Se documentan como pendientes de datos que hoy no existen
  (ver sección 8).

## 3. Estructura de carpetas (nuevo en esta fase)

```
api/src/modules/biomechanics/
  geometry.ts              # funciones matemáticas puras (ángulos, distancias)
  landmarkIndex.ts          # índices de los 33 puntos de MediaPipe Pose
  biomechanics.compute.ts   # calcula todas las métricas a partir de los frames
  biomechanics.repository.ts
  biomechanics.service.ts   # orquesta: ownership + pose existente + cálculo + guardado
  biomechanics.controller.ts
  (rutas en video.routes.ts, bajo /videos/:id/biomechanics)

web/components/MetricChart.tsx        # gráfico reutilizable (Victory)
web/app/videos/[id]/biomechanics/page.tsx

mobile/src/screens/BiomechanicsScreen.tsx   # tarjetas de resumen
```

## 4. Base de datos

Nuevo modelo `BiomechanicsAnalysis` (uno a uno con `VideoSession`): guarda
`seriesJson` (un array con, por cada frame, todos los ángulos calculados) y
`summaryJson` (min/max/mean de cada métrica + los valores estimados +
las notas de advertencia). Igual que `PoseAnalysis`, se usa `Json` porque
se lee/escribe siempre como bloque completo.

```bash
cd api
npx prisma migrate dev --name add_biomechanics_analysis
```

## 5. Backend — nuevos endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/v1/videos/:id/biomechanics` | calcula (o recalcula) y guarda las métricas |
| GET | `/api/v1/videos/:id/biomechanics` | devuelve la serie completa + el resumen |

## 6. Cómo probarlo manualmente

1. `cd api && npx prisma migrate dev --name add_biomechanics_analysis && npm run dev`
2. Asegúrate de tener al menos un video con análisis de pose ya guardado
   (Fase 3). Completa también tu peso en el perfil (Fase 1) para ver el
   índice de carga de rodilla calculado en vez de "Agrega tu peso...".
3. Web: entra a "Mis videos" → botón "Biomecánica" en ese video. Deberías
   ver 6 tarjetas de resumen y 3 gráficos (rodilla, tronco, balance).
4. Prueba con un video que NO tenga análisis de pose: debe mostrar el
   mensaje "Este video todavía no tiene un análisis de pose" con un botón
   para ir a analizarlo — no debe mostrar un gráfico vacío o con ceros.
5. Mobile: desde "Mis videos" → "Biomecánica" en un video ya analizado.
   Deben verse las mismas tarjetas de resumen (sin gráficos).

## 7. Riesgos y deuda técnica conocida

- **Sin gráficos de series en mobile:** se decidió, por alcance de esta
  fase, mostrar solo tarjetas de resumen en el teléfono. Una librería de
  gráficos nativa (`victory-native` u otra) añade dependencias nativas
  adicionales; se evalúa en una fase de pulido de mobile si vale la pena.
- **Oclusión en cámara lateral:** el lado del cuerpo más lejano a la cámara
  puede tener landmarks menos confiables, lo que puede inflar la métrica de
  "simetría" sin que sea una asimetría real del deportista. Está anotado en
  `notesForUser`, visible directamente en la interfaz.
- **`trunkRotationDegEstimated` depende del campo `z` de MediaPipe**, que es
  una profundidad relativa aproximada del modelo, no una medición 3D
  calibrada con múltiples cámaras. Se etiqueta como estimado en todo el
  sistema (nombre del campo, UI, notas).
- **El índice de carga de rodilla es una fórmula ilustrativa** (peso ×
  función del ángulo de flexión), pensada para comparar el mismo usuario
  entre videos distintos — no es una medición clínica ni debe usarse para
  decisiones médicas.

## 8. Qué queda explícitamente fuera de esta fase

- **Potencia estimada y fuerzas aplicadas:** requieren una referencia de
  escala real (por ejemplo, calibrar con un objeto de tamaño conocido en el
  encuadre, o datos de un sensor IMU) que la plataforma no tiene todavía.
  Se revisita cuando exista esa fuente de datos (posiblemente Fase 13).
- **Tiempo de reacción:** solo tiene sentido con un evento de inicio claro
  (ej. una señal, una salida). La maniobra actual (navegación en línea
  recta) no tiene ese evento. Se implementa cuando se agreguen maniobras
  con inicio definido (Fase 5 — Análisis del Movimiento).
- **Detección de errores técnicos** (rodillas rígidas, espalda curvada,
  centro de gravedad adelantado/retrasado, etc.) usa estos mismos ángulos
  como insumo, pero es la Fase 6 — aquí solo se calculan y muestran los
  números, no se juzga si son "buenos" o "malos" todavía.
