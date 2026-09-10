"use client";

interface Props {
  values: (number | undefined | null)[];
  color: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ values, color, width = 100, height = 28 }: Props) {
  const clean = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN));
  const finite = clean.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return <svg width={width} height={height} aria-hidden="true" />;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min || 1;
  const step = clean.length > 1 ? width / (clean.length - 1) : width;

  const points = clean
    .map((v, i) => {
      const x = i * step;
      const y = Number.isFinite(v) ? height - ((v - min) / range) * height : height / 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
