import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";
import StatTile from "../components/StatTile";
import SessionTimeline from "../components/SessionTimeline";

interface MetricSummary {
  min: number;
  max: number;
  mean: number;
}

interface BiomechanicsRecord {
  seriesJson: { tSeconds: number; [key: string]: number }[];
  summaryJson: Record<string, MetricSummary> & {
    estimatedKneeLoadIndexAvg: number | null;
    approxTrunkOscillationsPerMinute: number | null;
  };
}

// Mismos umbrales que mobile/src/lib/postureEvaluator.ts, web/lib/postureEvaluator.ts
// y api/.../healthyZones.ts — no se inventan números nuevos, se reusa la
// única fuente de verdad.
const SEGMENT_COLOR = { OK: "#2ED67A", LEVE: "#FFB020", MODERADO: "#FF8A3D", ALTO: "#FF6B6B" };

const KNEE_ZONES = [
  { from: 90, to: 165, color: SEGMENT_COLOR.OK },
  { from: 165, to: 170, color: SEGMENT_COLOR.LEVE },
  { from: 170, to: 175, color: SEGMENT_COLOR.MODERADO },
  { from: 175, to: 190, color: SEGMENT_COLOR.ALTO },
];

const BALANCE_ZONES = [
  { from: -0.35, to: 0.35, color: SEGMENT_COLOR.OK },
  { from: 0.35, to: 0.5, color: SEGMENT_COLOR.LEVE },
  { from: -0.5, to: -0.35, color: SEGMENT_COLOR.LEVE },
  { from: 0.5, to: 0.65, color: SEGMENT_COLOR.MODERADO },
  { from: -0.65, to: -0.5, color: SEGMENT_COLOR.MODERADO },
  { from: 0.65, to: 1.2, color: SEGMENT_COLOR.ALTO },
  { from: -1.2, to: -0.65, color: SEGMENT_COLOR.ALTO },
];

function fmt(n: number | undefined | null, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function zoneColorFor(value: number | undefined | null, zones: { from: number; to: number; color: string }[], fallback: string) {
  if (value === undefined || value === null || Number.isNaN(value)) return fallback;
  const match = zones.find((z) => value >= z.from && value < z.to);
  return match ? match.color : fallback;
}

export default function BiomechanicsScreen({ route, navigation }: RootStackScreenProps<"Biomechanics">) {
  const { videoId } = route.params;
  const [data, setData] = useState<BiomechanicsRecord | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [videoId]);

  async function load() {
    try {
      setState("loading");
      await apiPost(`/api/v1/videos/${videoId}/biomechanics`, {});
      const result = await apiGet<BiomechanicsRecord>(`/api/v1/videos/${videoId}/biomechanics`);
      setData(result);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg("Este video necesita un análisis de pose primero (pantalla 'Analizar').");
    }
  }

  if (state === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.turquoise} />
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.error}>{errorMsg}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("PoseAnalysis", { videoId })}
        >
          <Text style={styles.buttonText}>Ir a analizar pose</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = data!.summaryJson;
  const series = data!.seriesJson ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Biomecánica</Text>
      <Text style={styles.subtitle}>Resumen de esta sesión</Text>

      <View style={styles.tileGrid}>
        <StatTile
          label="Rodilla izquierda"
          value={s.kneeAngleLeft?.mean}
          unit="°"
          color={zoneColorFor(s.kneeAngleLeft?.mean, KNEE_ZONES, SEGMENT_COLOR.OK)}
          sparklineValues={series.map((f) => f.kneeAngleLeft)}
        />
        <StatTile
          label="Rodilla derecha"
          value={s.kneeAngleRight?.mean}
          unit="°"
          color={zoneColorFor(s.kneeAngleRight?.mean, KNEE_ZONES, SEGMENT_COLOR.OK)}
          sparklineValues={series.map((f) => f.kneeAngleRight)}
        />
        <StatTile
          label="Inclinación de tronco"
          value={s.trunkInclinationDeg?.mean}
          unit="°"
          color={colors.turquoise}
          sparklineValues={series.map((f) => f.trunkInclinationDeg)}
        />
        <StatTile
          label="Balance"
          value={s.balanceOffset?.mean}
          unit=""
          decimals={2}
          color={zoneColorFor(s.balanceOffset?.mean, BALANCE_ZONES, SEGMENT_COLOR.OK)}
          sparklineValues={series.map((f) => f.balanceOffset)}
        />
      </View>

      {series.length > 1 && (
        <SessionTimeline frames={series} segmentKey="knees" title="Línea de tiempo de la sesión — severidad de rodillas" />
      )}

      <Card label="Cadera izq / der (promedio)" value={`${fmt(s.hipAngleLeft?.mean)}° / ${fmt(s.hipAngleRight?.mean)}°`} />
      <Card label="Simetría (menor = mejor)" value={`${fmt(s.symmetryDelta?.mean)}°`} />
      <Card
        label="Índice de carga de rodilla (estimado)"
        value={s.estimatedKneeLoadIndexAvg != null ? fmt(s.estimatedKneeLoadIndexAvg) : "Agrega tu peso en el perfil"}
      />
      <Card
        label="Oscilación de tronco (aprox.)"
        value={s.approxTrunkOscillationsPerMinute != null ? `${fmt(s.approxTrunkOscillationsPerMinute, 0)} /min` : "—"}
      />

      <Text style={styles.helper}>
        El punto de color y el número de cada tarjeta usan la misma escala
        que la pantalla de Errores (verde = bien, ámbar/naranja/rojo = error
        leve, moderado o alto). Para el gráfico de detalle con la curva
        completa segundo a segundo, usa la versión web.
      </Text>
    </ScrollView>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: "center" },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: {
    backgroundColor: colors.blackSoft,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  cardValue: { color: colors.white, fontSize: 18, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 11, marginTop: 16, marginBottom: 32, textAlign: "center" },
  error: { color: colors.danger, fontSize: 14, textAlign: "center", marginBottom: 16 },
  button: {
    backgroundColor: colors.turquoise,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.black, fontWeight: "700" },
});
