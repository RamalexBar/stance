import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function GroupsScreen({ navigation }: RootStackScreenProps<"Groups">) {
  const [groups, setGroups] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const result = await apiGet<any[]>("/api/v1/groups");
      setGroups(result);
    } catch (err) {
      console.error(err);
    }
  }

  async function createGroup() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await apiPost("/api/v1/groups", { name: newName });
      setNewName("");
      load();
    } catch {
      setError("Solo cuentas con rol Escuela pueden crear grupos.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 24 }}>
        <Text style={styles.title}>Mis grupos</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre del nuevo grupo"
          placeholderTextColor={colors.muted}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.button} onPress={createGroup}>
          <Text style={styles.buttonText}>Crear grupo</Text>
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupRow}
            onPress={() => navigation.navigate("GroupDetail", { groupId: item.id, groupName: item.name })}
          >
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMeta}>
              {item.trainers.length} entrenador(es) · {item.athletes.length} deportista(s)
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.helper}>Sin grupos todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { backgroundColor: colors.blackSoft, color: colors.white, borderRadius: 10, padding: 14, marginBottom: 10 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center", marginBottom: 8 },
  buttonText: { color: colors.black, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 12 },
  groupRow: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 12 },
  groupName: { color: colors.white, fontWeight: "700", fontSize: 15 },
  groupMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  helper: { color: colors.muted, fontSize: 13 },
});
