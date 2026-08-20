import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

interface Difference {
  metric: string;
  primaryValue: number;
  referenceValue: number;
  delta: number;
  unit: string;
}

interface ComparisonResult {
  primaryScore: number;
  referenceScore: number;
  metricsJson: { differences: Difference[] };
}

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

export default function CompareScreen({ route }: RootStackScreenProps<"Compare">) {
  const { videoId } = route.params;
  const [mode, setMode] = useState<"SELF_PREVIOUS" | "PROFESSIONAL">("SELF_PREVIOUS");
  const [referenceOptions, setReferenceOptions] = useState<any[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "PROFESSIONAL") {
      apiGet<any[]>(`/api/v1/reference-videos`).then(setReferenceOptions).catch(console.error);
    }
  }, [mode]);

  async function runComparison() {
    setState("loading");
    setErrorMsg(null);
    try {
      const body: any = { mode };
      if (mode === "PROFESSIONAL") {
        if (!selectedReferenceId) {
          setState("error");
          setErrorMsg("Elige un video de referencia primero.");
          return;
        }
        body.referenceVideoId = selectedReferenceId;
      }
      const comparison = await apiPost<ComparisonResult>(`/api/v1/videos/${videoId}/compare`, body);
      setResult(comparison);
      setState("ready");
    } catch {
      setState("error");
      setErrorMsg("No se pudo comparar. Verifica que ambos videos tengan biomecánica calculada.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Comparación</Text>

      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, mode === "SELF_PREVIOUS" && styles.chipActive]}
          onPress={() => setMode("SELF_PREVIOUS")}
        >
          <Text style={[styles.chipText, mode === "SELF_PREVIOUS" && styles.chipTextActive]}>
            Mi video anterior
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, mode === "PROFESSIONAL" && styles.chipActive]}
          onPress={() => setMode("PROFESSIONAL")}
        >
          <Text style={[styles.chipText, mode === "PROFESSIONAL" && styles.chipTextActive]}>
            Referencia/Profesional
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "PROFESSIONAL" && (
        <View style={{ marginBottom: 16 }}>
          {referenceOptions.length === 0 && (
            <Text style={styles.helper}>Todavía no hay videos de referencia disponibles.</Text>
          )}
          {referenceOptions.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedReferenceId(r.id)}
              style={[
                styles.refOption,
                selectedReferenceId === r.id && { borderColor: colors.turquoise },
              ]}
            >
              <Text style={{ color: colors.white }}>{r.referenceLabel ?? r.originalName ?? r.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={runComparison} disabled={state === "loading"}>
        {state === "loading" ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={styles.buttonText}>Comparar</Text>
        )}
      </TouchableOpacity>

      {state === "error" && <Text style={styles.error}>{errorMsg}</Text>}

      {state === "ready" && result && (
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <ScoreCard label="Tu técnica" score={result.primaryScore} />
            <ScoreCard label="Referencia" score={result.referenceScore} />
          </View>

          <Text style={styles.helper}>
            La puntuación mide qué tan cerca está cada video de las zonas técnicas
            saludables (Fase 6), no una comparación cuerpo a cuerpo.
          </Text>

          {result.metricsJson.differences.map((d, i) => (
            <View key={i} style={styles.diffRow}>
              <Text style={styles.diffMetric}>{d.metric}</Text>
              <Text style={styles.diffValues}>
                Tú: {fmt(d.primaryValue)}{d.unit} · Ref: {fmt(d.referenceValue)}{d.unit} ·{" "}
                <Text style={{ color: d.delta > 0 ? "#FFB020" : colors.turquoise }}>
                  {d.delta > 0 ? "+" : ""}{fmt(d.delta)}{d.unit}
                </Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, alignItems: "center" }}>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: colors.turquoise, fontSize: 26, fontWeight: "700" }}>{score.toFixed(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { borderColor: colors.turquoise },
  chipText: { color: colors.white, fontSize: 13 },
  chipTextActive: { color: colors.turquoise },
  refOption: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 12, marginBottom: 8 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: colors.black, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  helper: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  diffRow: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingVertical: 8 },
  diffMetric: { color: colors.white, fontSize: 13, fontWeight: "600" },
  diffValues: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
