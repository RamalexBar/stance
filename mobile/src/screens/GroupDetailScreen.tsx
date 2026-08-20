import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function GroupDetailScreen({ route }: RootStackScreenProps<"GroupDetail">) {
  const { groupId, groupName } = route.params;
  const [group, setGroup] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [newTrainerId, setNewTrainerId] = useState("");
  const [newAthleteId, setNewAthleteId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const groups = await apiGet<any[]>("/api/v1/groups");
      setGroup(groups.find((g) => g.id === groupId) ?? null);
      const rankingResult = await apiGet<any[]>(`/api/v1/groups/${groupId}/ranking`);
      setRanking(rankingResult);
    } catch (err) {
      console.error(err);
    }
  }

  async function addTrainer() {
    if (!newTrainerId.trim()) return;
    setError(null);
    try {
      await apiPost(`/api/v1/groups/${groupId}/trainers`, { userId: newTrainerId });
      setNewTrainerId("");
      load();
    } catch {
      setError("No se pudo asignar. Verifica el userId y el rol Entrenador.");
    }
  }

  async function addAthlete() {
    if (!newAthleteId.trim()) return;
    setError(null);
    try {
      await apiPost(`/api/v1/groups/${groupId}/athletes`, { userId: newAthleteId });
      setNewAthleteId("");
      load();
    } catch {
      setError("No se pudo asignar el deportista.");
    }
  }

  if (!group) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>{groupName}</Text>

      <Text style={styles.sectionTitle}>Ranking</Text>
      {ranking.map((r) => (
        <Text key={r.userId} style={styles.rankRow}>
          {r.name} — {r.averageScore != null ? `${r.averageScore.toFixed(0)} pts` : "sin videos"} ({r.videosConsidered} sesiones)
        </Text>
      ))}

      <Text style={styles.sectionTitle}>Entrenadores</Text>
      {group.trainers.map((t: any) => (
        <Text key={t.userId} style={styles.memberRow}>{t.user.email}</Text>
      ))}
      <TextInput
        style={styles.input}
        placeholder="userId del entrenador"
        placeholderTextColor={colors.muted}
        value={newTrainerId}
        onChangeText={setNewTrainerId}
      />
      <TouchableOpacity style={styles.smallButton} onPress={addTrainer}>
        <Text style={styles.smallButtonText}>Asignar entrenador</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Deportistas</Text>
      {group.athletes.map((a: any) => (
        <Text key={a.userId} style={styles.memberRow}>{a.user.email}</Text>
      ))}
      <TextInput
        style={styles.input}
        placeholder="userId del deportista"
        placeholderTextColor={colors.muted}
        value={newAthleteId}
        onChangeText={setNewAthleteId}
      />
      <TouchableOpacity style={styles.smallButton} onPress={addAthlete}>
        <Text style={styles.smallButtonText}>Asignar deportista</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.helper}>
        El detalle de progreso por deportista está disponible en la versión web por ahora.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 22, fontWeight: "700", marginBottom: 16 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 6 },
  rankRow: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  memberRow: { color: colors.muted, fontSize: 13, marginBottom: 2 },
  input: { backgroundColor: colors.blackSoft, color: colors.white, borderRadius: 8, padding: 10, marginTop: 8 },
  smallButton: { backgroundColor: colors.blackSoft, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  smallButtonText: { color: colors.white, fontSize: 12 },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
  helper: { color: colors.muted, fontSize: 11, marginTop: 20, marginBottom: 32, textAlign: "center" },
});
