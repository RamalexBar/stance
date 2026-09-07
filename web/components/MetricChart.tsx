"use client";

import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryLegend } from "victory";

interface Series {
  tSeconds: number;
  [key: string]: number;
}

interface Zone {
  from: number;
  to: number;
  color: string;
}

interface Props {
  title: string;
  series: Series[];
  lines: { key: string; label: string; color: string }[];
  yLabel: string;
  xLabel?: string;
  /** Bandas de fondo verde/ámbar/naranja/rojo — mismos umbrales que la pantalla
   *  de Errores (ver web/lib/postureEvaluator.ts). Omitir si esta métrica no
   *  tiene un rango saludable definido (evita inventar un umbral). */
  zones?: Zone[];
  /** Tamaño de la ventana de media móvil para suavizar la línea (0 = sin suavizar).
   *  Los datos crudos son cuadro a cuadro (~30fps) y muy ruidosos para leer una
   *  tendencia a simple vista; el resumen numérico ya usa el dato crudo, esto
   *  solo afecta el trazo del gráfico. */
  smoothWindow?: number;
}

function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) return values;
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end).filter((v) => Number.isFinite(v));
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : values[i];
  });
}

export default function MetricChart({
  title,
  series,
  lines,
  yLabel,
  xLabel = "segundos",
  zones,
  smoothWindow = 7,
}: Props) {
  const tValues = series.map((s) => s.tSeconds);
  const tMin = tValues.length ? Math.min(...tValues) : 0;
  const tMax = tValues.length ? Math.max(...tValues) : 1;

  const smoothedByKey: Record<string, Series[]> = {};
  for (const line of lines) {
    const raw = series.map((s) => s[line.key]);
    const smoothed = movingAverage(raw, smoothWindow);
    smoothedByKey[line.key] = series.map((s, i) => ({ ...s, [line.key]: smoothed[i] }));
  }

  const allValues = lines
    .flatMap((l) => series.map((s) => s[l.key]))
    .filter((v) => Number.isFinite(v));
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataMax = allValues.length ? Math.max(...allValues) : 1;
  const pad = (dataMax - dataMin) * 0.15 || 1;
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;

  const visibleZones = (zones ?? [])
    .map((z) => ({ ...z, from: Math.max(z.from, yMin), to: Math.min(z.to, yMax) }))
    .filter((z) => z.to > z.from);

  return (
    <div style={{ background: "var(--color-black-soft)", borderRadius: 10, padding: "14px 4px 4px", marginBottom: 20 }}>
      <h3 style={{ color: "var(--color-white)", fontSize: "0.95rem", margin: "0 16px 4px" }}>{title}</h3>
      <VictoryChart
        height={220}
        padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
        domain={allValues.length ? { y: [yMin, yMax] } : undefined}
      >
        {visibleZones.map((zone, i) => (
          <VictoryArea
            key={i}
            data={[
              { x: tMin, y0: zone.from, y: zone.to },
              { x: tMax, y0: zone.from, y: zone.to },
            ]}
            style={{ data: { fill: zone.color, fillOpacity: 0.16, stroke: "none" } }}
          />
        ))}
        <VictoryAxis
          label={xLabel}
          style={{
            axisLabel: { fill: "#8FA8A3", padding: 28, fontSize: 10 },
            tickLabels: { fill: "#8FA8A3", fontSize: 10 },
            axis: { stroke: "rgba(255,255,255,0.15)" },
            grid: { stroke: "rgba(255,255,255,0.05)" },
          }}
        />
        <VictoryAxis
          dependentAxis
          label={yLabel}
          style={{
            axisLabel: { fill: "#8FA8A3", padding: 38, fontSize: 10 },
            tickLabels: { fill: "#8FA8A3", fontSize: 10 },
            axis: { stroke: "rgba(255,255,255,0.15)" },
            grid: { stroke: "rgba(255,255,255,0.05)" },
          }}
        />
        {lines.map((line) => (
          <VictoryLine
            key={line.key}
            data={smoothedByKey[line.key]}
            x="tSeconds"
            y={line.key}
            interpolation="monotoneX"
            style={{ data: { stroke: line.color, strokeWidth: 2.5, strokeLinecap: "round" } }}
          />
        ))}
        {lines.length > 1 && (
          <VictoryLegend
            x={60}
            y={0}
            orientation="horizontal"
            gutter={16}
            style={{ labels: { fill: "#ECF3EF", fontSize: 10 } }}
            data={lines.map((l) => ({ name: l.label, symbol: { fill: l.color } }))}
          />
        )}
      </VictoryChart>
      {visibleZones.length > 0 && (
        <p style={{ color: "var(--color-muted)", fontSize: 10, padding: "0 16px 12px", marginTop: -6 }}>
          Fondo: verde = rango saludable · ámbar = leve · naranja = moderado · rojo = alto (mismos umbrales que la
          pantalla de Errores).
        </p>
      )}
    </div>
  );
}
