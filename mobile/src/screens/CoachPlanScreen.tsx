import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function CoachPlanScreen({ route }: RootStackScreenProps<"CoachPlan">) {
  const { videoId } = route.params;
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function generate() {
    setState("loading");
    try {
      const result = await apiPost<any>(`/api/v1/videos/${videoId}/coach-plan`, {
        userNotes: notes || undefined,
      });
      setPlan(result.planJson);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  if (state === "ready" && plan) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Entrenador IA</Text>

        <Section title="Resumen"><Text style={styles.text}>{plan.resumen}</Text></Section>

        <Section title="Fortalezas">
          {plan.fortalezas.map((f: string, i: number) => (
            <Text key={i} style={styles.listItem}>• {f}</Text>
          ))}
        </Section>

        <Section title="Prioridad de mejora">
          <Text style={styles.text}>{plan.planMejora}</Text>
        </Section>

        <Section title="Plan semanal">
          {plan.planSemanal.map((d: any, i: number) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.dayTitle}>{d.dia}: {d.enfoque}</Text>
              {d.ejercicios.map((ex: string, j: number) => (
                <Text key={j} style={styles.listItem}>  • {ex}</Text>
              ))}
            </View>
          ))}
        </Section>

        <Section title="Ejercicios prioritarios">
          {plan.ejerciciosPrioritarios.map((ex: string, i: number) => (
            <Text key={i} style={styles.listItem}>• {ex}</Text>
          ))}
        </Section>

        <Section title="Para buscar en YouTube">
          {plan.sugerenciasBusqueda.map((s: string, i: number) => (
            <Text key={i} style={[styles.listItem, { color: colors.turquoise }]}>"{s}"</Text>
          ))}
        </Section>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setState("idle")}>
          <Text style={{ color: colors.white }}>Generar de nuevo</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 24 }}>
        <Text style={styles.title}>Entrenador IA</Text>
        <TextInput
          style={styles.input}
          placeholder="Notas para el entrenador (opcional)"
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
        />
        <TouchableOpacity style={styles.button} onPress={generate} disabled={state === "loading"}>
          {state === "loading" ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.buttonText}>Generar plan</Text>
          )}
        </TouchableOpacity>
        {state === "error" && (
          <Text style={styles.error}>
            No se pudo generar. Verifica que el video tenga biomecánica, movimiento y errores calculados.
          </Text>
        )}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { backgroundColor: colors.blackSoft, color: colors.white, borderRadius: 10, padding: 14, marginBottom: 14 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: colors.black, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  section: { backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  text: { color: colors.muted, fontSize: 13 },
  listItem: { color: colors.muted, fontSize: 12, marginBottom: 3 },
  dayTitle: { color: colors.white, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 40,
  },
});
