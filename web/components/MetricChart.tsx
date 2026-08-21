"use client";

import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryLegend } from "victory";

interface Series {
  tSeconds: number;
  [key: string]: number;
}

interface Props {
  title: string;
  series: Series[];
  lines: { key: string; label: string; color: string }[];
  yLabel: string;
  xLabel?: string;
}

export default function MetricChart({ title, series, lines, yLabel, xLabel = "segundos" }: Props) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginBottom: 4 }}>
        {title}
      </h3>
      <VictoryChart theme={VictoryTheme.clean} height={220} padding={{ top: 10, bottom: 40, left: 50, right: 20 }}>
        <VictoryAxis
          label={xLabel}
          style={{
            axisLabel: { fill: "#7C8A96", padding: 28 },
            tickLabels: { fill: "#7C8A96", fontSize: 10 },
            axis: { stroke: "rgba(255,255,255,0.15)" },
          }}
        />
        <VictoryAxis
          dependentAxis
          label={yLabel}
          style={{
            axisLabel: { fill: "#7C8A96", padding: 38 },
            tickLabels: { fill: "#7C8A96", fontSize: 10 },
            axis: { stroke: "rgba(255,255,255,0.15)" },
          }}
        />
        {lines.map((line) => (
          <VictoryLine
            key={line.key}
            data={series}
            x="tSeconds"
            y={line.key}
            style={{ data: { stroke: line.color, strokeWidth: 2 } }}
          />
        ))}
        <VictoryLegend
          x={60}
          y={0}
          orientation="horizontal"
          gutter={16}
          style={{ labels: { fill: "#F4F7F9", fontSize: 10 } }}
          data={lines.map((l) => ({ name: l.label, symbol: { fill: l.color } }))}
        />
      </VictoryChart>
    </div>
  );
}
