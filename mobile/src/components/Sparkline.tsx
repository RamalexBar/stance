import React from "react";
import { View } from "react-native";

interface Props {
  values: (number | undefined | null)[];
  color: string;
  height?: number;
  maxBars?: number;
}

// Barras en vez de una polilínea SVG: evita sumar react-native-svg como
// dependencia nueva justo cuando lo que más importa es que el build compile
// limpio con la firma correcta. Un video son miles de cuadros — se
// reagrupan en como mucho `maxBars` barras (promedio por grupo) para no
// montar miles de Views.
function downsample(values: (number | null)[], maxBars: number): (number | null)[] {
  if (values.length <= maxBars) return values;
  const bucketSize = values.length / maxBars;
  const out: (number | null)[] = [];
  for (let i = 0; i < maxBars; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = values.slice(start, end).filter((v): v is number => v !== null);
    out.push(bucket.length ? bucket.reduce((a, b) => a + b, 0) / bucket.length : null);
  }
  return out;
}

export default function Sparkline({ values, color, height = 24, maxBars = 36 }: Props) {
  const clean = downsample(
    values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null)),
    maxBars
  );
  const finite = clean.filter((v): v is number => v !== null);
  if (finite.length < 2) return <View style={{ height }} />;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min || 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 1 }}>
      {clean.map((v, i) => {
        const ratio = v === null ? 0.05 : Math.max(0.08, (v - min) / range);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${ratio * 100}%`,
              backgroundColor: color,
              opacity: v === null ? 0.15 : 0.85,
              borderRadius: 1,
            }}
          />
        );
      })}
    </View>
  );
}
