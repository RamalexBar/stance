import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: number | null | undefined;
  unit: string;
  decimals?: number;
  color: string;
  sparklineValues: (number | undefined | null)[];
}

function fmt(n: number | null | undefined, decimals: number) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

export default function StatTile({ label, value, unit, decimals = 1, color, sparklineValues }: Props) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label}: ${fmt(value, decimals)}${unit}`}
    >
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color }]}>
        {fmt(value, decimals)}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
      <Sparkline values={sparklineValues} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "48%",
    backgroundColor: colors.blackSoft,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    gap: 10,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { color: colors.muted, fontSize: 11 },
  value: { fontSize: 24, fontWeight: "500" },
  unit: { fontSize: 12, color: colors.muted, fontWeight: "400" },
});
