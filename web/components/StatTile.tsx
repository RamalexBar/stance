"use client";

import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: number | null | undefined;
  unit: string;
  decimals?: number;
  /** Color semántico (misma paleta de severidad que Errores) o de marca si
   *  la métrica no tiene umbral saludable definido. */
  color: string;
  statusLabel?: string;
  sparklineValues: (number | undefined | null)[];
  active?: boolean;
  onClick?: () => void;
}

function fmt(n: number | null | undefined, decimals: number) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

export default function StatTile({
  label,
  value,
  unit,
  decimals = 1,
  color,
  statusLabel,
  sparklineValues,
  active,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      aria-label={`${label}: ${fmt(value, decimals)}${unit}${statusLabel ? `, ${statusLabel}` : ""}. Toca para ver el detalle.`}
      style={{
        textAlign: "left",
        background: "var(--color-black-soft)",
        border: active ? `0.5px solid ${color}` : "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
        font: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 400 }}>{label}</span>
      </div>
      <div
        style={{
          color,
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums lining-nums",
        }}
      >
        {fmt(value, decimals)}
        <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: 4, fontWeight: 400 }}>{unit}</span>
      </div>
      <Sparkline values={sparklineValues} color={color} />
    </button>
  );
}
