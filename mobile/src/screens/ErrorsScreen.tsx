import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

const LEVEL_COLOR: Record<string, string> = {
  LEVE: "#FFB020",
  MODERADO: "#FF8A3D",
  ALTO: "#FF6B6B",
};

interface Finding {
  type: string;
  level: string;
  description: string;
  impact: string;
  howToFix: string;
  exercises: string[];
}

interface NotDetected {
  type: string;
  reason: string;
}

export default function ErrorsScreen({ route, navigation }: RootStackScreenProps<"Errors">) {
  const { videoId } = route.params;
  const [findings, setFindings] = useState<Finding[]>([]);
  const [notDetected, setNotDetected] = useState<NotDetected[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    load();
  }, [videoId]);

  async function load() {
    try {
      setState("loading");
      const result = await apiPost<{ findings: Finding[]; notDetectedYet: NotDetected[] }>(
        `/api/v1/videos/${videoId}/errors`,
        {}
      );
      setFindings(result.findings);
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
        <Text style={styles.error}>
          Este video necesita biomecánica y movimiento calculados primero.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Movement", { videoId })}>
          <Text style={styles.buttonText}>Ir a movimiento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Errores técnicos</Text>
      <Text style={styles.subtitle}>Detección automática basada en reglas</Text>

      {findings.length === 0 && (
        <Text style={styles.success}>No se detectaron errores con las reglas actuales. 🎉</Text>
      )}

      {findings.map((f, i) => (
        <View key={i} style={[styles.card, { borderLeftColor: LEVEL_COLOR[f.level] }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{f.type.replaceAll("_", " ")}</Text>
            <Text style={[styles.cardLevel, { color: LEVEL_COLOR[f.level] }]}>{f.level}</Text>
          </View>
          <Text style={styles.cardText}>{f.description}</Text>
          <Text style={styles.cardLabel}>
            Impacto: <Text style={styles.cardText}>{f.impact}</Text>
          </Text>
          <Text style={styles.cardLabel}>
            Cómo corregirlo: <Text style={styles.cardText}>{f.howToFix}</Text>
          </Text>
          <Text style={styles.cardLabel}>
            Ejercicios: <Text style={styles.cardText}>{f.exercises.join(" · ")}</Text>
          </Text>
        </View>
      ))}

      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>Errores que esta fase todavía no detecta:</Text>
        {notDetected.map((item) => (
          <Text key={item.type} style={styles.note}>
            • {item.type.replaceAll("_", " ")}: {item.reason}
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
  success: { color: colors.turquoise, fontSize: 14, marginBottom: 16 },
  card: { backgroundColor: colors.blackSoft, borderRadius: 10, borderLeftWidth: 4, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.white, fontWeight: "700", fontSize: 14 },
  cardLevel: { fontSize: 11, fontWeight: "700" },
  cardText: { color: colors.muted, fontSize: 12 },
  cardLabel: { color: colors.white, fontSize: 12, fontWeight: "600", marginTop: 6 },
  notesBox: { backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 32 },
  notesTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  note: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  error: { color: colors.danger, fontSize: 14, textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: colors.black, fontWeight: "700" },
});
