import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";

const TREND_LABEL: Record<string, string> = {
  MEJORANDO: "Mejorando",
  ESTABLE: "Estable",
  RETROCEDIENDO: "En retroceso",
  SIN_DATOS: "Sin datos suficientes",
};

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [bodyPart, setBodyPart] = useState("");
  const [severity, setSeverity] = useState("LEVE");
  const [injuryError, setInjuryError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const result = await apiGet("/api/v1/dashboard/summary");
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }

  async function addInjury() {
    if (!bodyPart) return;
    setInjuryError(null);
    try {
      await apiPost("/api/v1/injuries", {
        date: new Date().toISOString(),
        bodyPart,
        severity,
      });
      setBodyPart("");
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      setInjuryError("No se pudo registrar la lesión. Intenta de nuevo.");
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.turquoise} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.statsRow}>
        <StatCard label="Sesiones" value={String(data.totalSessions)} />
        <StatCard label="Minutos" value={(data.totalSecondsAnalyzed / 60).toFixed(1)} />
        <StatCard label="Tendencia" value={TREND_LABEL[data.improvementTrend]} />
      </View>

      <Text style={styles.sectionTitle}>Historial</Text>
      {data.sessions
        .slice()
        .reverse()
        .map((s: any) => (
          <View key={s.videoId} style={styles.sessionRow}>
            <Text style={styles.sessionDiscipline}>
              {new Date(s.createdAt).toLocaleDateString()} · {s.discipline}
            </Text>
            <Text style={styles.sessionScore}>
              {s.techniqueScore != null ? `${s.techniqueScore.toFixed(0)} pts` : "—"}
            </Text>
          </View>
        ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lesiones</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Text style={{ color: colors.turquoise }}>{showForm ? "Cancelar" : "+ Registrar"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Zona del cuerpo"
            placeholderTextColor={colors.muted}
            value={bodyPart}
            onChangeText={setBodyPart}
          />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            {["LEVE", "MODERADO", "ALTO"].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                onPress={() => setSeverity(lvl)}
                style={[styles.severityChip, severity === lvl && { borderColor: colors.turquoise }]}
              >
                <Text style={{ color: colors.white, fontSize: 12 }}>{lvl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {injuryError && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{injuryError}</Text>}
          <TouchableOpacity style={styles.button} onPress={addInjury}>
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      )}

      {data.injuries.length === 0 ? (
        <Text style={styles.helper}>Este registro lo completas tú — no se detecta automáticamente.</Text>
      ) : (
        data.injuries.map((inj: any) => (
          <Text key={inj.id} style={styles.injuryRow}>
            {new Date(inj.date).toLocaleDateString()} · {inj.bodyPart} ({inj.severity})
          </Text>
        ))
      )}

      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>No disponible todavía:</Text>
        {data.notAvailable.map((item: any) => (
          <Text key={item.metric} style={styles.note}>
            • {item.metric}: {item.reason}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: "center" },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: colors.blackSoft, borderRadius: 10, padding: 10 },
  statLabel: { color: colors.muted, fontSize: 10 },
  statValue: { color: colors.white, fontSize: 15, fontWeight: "700", marginTop: 2 },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  sessionDiscipline: { color: colors.white, fontSize: 13 },
  sessionScore: { color: colors.muted, fontSize: 13 },
  form: { backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, marginBottom: 12 },
  input: { backgroundColor: colors.black, color: colors.white, borderRadius: 8, padding: 10, marginBottom: 10 },
  severityChip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  button: { backgroundColor: colors.turquoise, borderRadius: 8, padding: 10, alignItems: "center" },
  buttonText: { color: colors.black, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 12, marginBottom: 16 },
  injuryRow: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  notesBox: { backgroundColor: colors.blackSoft, borderRadius: 10, padding: 14, marginTop: 16, marginBottom: 32 },
  notesTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  note: { color: colors.muted, fontSize: 12, marginBottom: 4 },
});
