import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

interface MetricSummary {
  min: number;
  max: number;
  mean: number;
}

interface BiomechanicsRecord {
  summaryJson: Record<string, MetricSummary> & {
    estimatedKneeLoadIndexAvg: number | null;
    approxTrunkOscillationsPerMinute: number | null;
  };
}

function fmt(n: number | undefined | null, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Biomecánica</Text>
      <Text style={styles.subtitle}>Resumen de esta sesión</Text>

      <Card label="Rodilla izq / der (promedio)" value={`${fmt(s.kneeAngleLeft?.mean)}° / ${fmt(s.kneeAngleRight?.mean)}°`} />
      <Card label="Cadera izq / der (promedio)" value={`${fmt(s.hipAngleLeft?.mean)}° / ${fmt(s.hipAngleRight?.mean)}°`} />
      <Card label="Inclinación de tronco" value={`${fmt(s.trunkInclinationDeg?.mean)}°`} />
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
        Para ver la evolución en el tiempo con gráficos, y la repetición con
        el avatar coloreado (verde = bien, ámbar/naranja/rojo = error leve,
        moderado o alto), usa la versión web — esta pantalla muestra el
        resumen para consulta rápida en el teléfono.
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
