import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

const LABELS: Record<string, string> = {
  NAVEGACION: "Navegación",
  SALTO: "Salto",
  ATERRIZAJE: "Aterrizaje",
  RECEPCION: "Recepción",
  CAMBIO_DIRECCION: "Cambio de dirección",
};

const COLORS_MAP: Record<string, string> = {
  NAVEGACION: colors.muted,
  SALTO: colors.turquoise,
  ATERRIZAJE: colors.blue,
  RECEPCION: "#8B5CF6",
  CAMBIO_DIRECCION: "#FFB020",
};

interface Segment {
  type: string;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
}

interface NotDetected {
  maneuver: string;
  reason: string;
}

export default function MovementScreen({ route, navigation }: RootStackScreenProps<"Movement">) {
  const { videoId } = route.params;
  const [segments, setSegments] = useState<Segment[]>([]);
  const [notDetected, setNotDetected] = useState<NotDetected[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    load();
  }, [videoId]);

  async function load() {
    try {
      setState("loading");
      const result = await apiPost<{ segments: Segment[]; notDetectedYet: NotDetected[] }>(
        `/api/v1/videos/${videoId}/movement`,
        {}
      );
      setSegments(result.segments);
      setNotDetected(result.notDetectedYet);
      setState("ready");
    } catch {
      setState("error");
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
        <Text style={styles.error}>Este video necesita biomecánica calculada primero.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Biomechanics", { videoId })}
        >
          <Text style={styles.buttonText}>Ir a biomecánica</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Movimiento</Text>
      <Text style={styles.subtitle}>Maniobras detectadas en esta sesión</Text>

      {segments
        .filter((s) => s.type !== "NAVEGACION")
        .map((seg, i) => (
          <View key={i} style={[styles.segment, { borderLeftColor: COLORS_MAP[seg.type] }]}>
            <Text style={styles.segmentType}>{LABELS[seg.type] ?? seg.type}</Text>
            <Text style={styles.segmentMeta}>
              {seg.startSeconds.toFixed(1)}s – {seg.endSeconds.toFixed(1)}s · confianza{" "}
              {(seg.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        ))}

      {segments.filter((s) => s.type !== "NAVEGACION").length === 0 && (
        <Text style={styles.helper}>No se detectaron saltos ni cambios de dirección marcados.</Text>
      )}

      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>Maniobras que esta fase todavía no detecta:</Text>
        {notDetected.map((item) => (
          <Text key={item.maneuver} style={styles.note}>
            • {item.maneuver}: {item.reason}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: "center" },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  segment: {
    borderLeftWidth: 3,
    backgroundColor: colors.blackSoft,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  segmentType: { color: colors.white, fontWeight: "700", fontSize: 14 },
  segmentMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  helper: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  notesBox: { backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, marginTop: 16, marginBottom: 32 },
  notesTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  note: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  error: { color: colors.danger, fontSize: 14, textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: colors.black, fontWeight: "700" },
});
