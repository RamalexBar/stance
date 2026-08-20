import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { signOut } from "firebase/auth";
import { firebaseAuthClient } from "../firebase/firebaseConfig";
import { apiGet, apiPut } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  level: string | null;
  dominance: string | null;
  disciplines: string[];
  roles: string[];
}

const DISCIPLINES = ["KITESURF", "WINGFOIL"];

export default function ProfileScreen({ navigation }: RootStackScreenProps<"Profile">) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Profile>("/api/v1/users/me").then(setProfile).catch(console.error);
  }, []);

  function toggleDiscipline(discipline: string) {
    if (!profile) return;
    const has = profile.disciplines.includes(discipline);
    setProfile({
      ...profile,
      disciplines: has
        ? profile.disciplines.filter((d) => d !== discipline)
        : [...profile.disciplines, discipline],
    });
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiPut<Profile>("/api/v1/users/me", {
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        age: profile.age || undefined,
        weightKg: profile.weightKg || undefined,
        heightCm: profile.heightCm || undefined,
        disciplines: profile.disciplines.length ? profile.disciplines : undefined,
      });
      setProfile(updated);
      setMessage("Perfil actualizado.");
    } catch {
      setMessage("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.turquoise} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Mi perfil</Text>
      <Text style={styles.subtitle}>
        {profile.email} · Roles: {profile.roles.join(", ")}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor={colors.muted}
        value={profile.firstName ?? ""}
        onChangeText={(v) => setProfile({ ...profile, firstName: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Apellido"
        placeholderTextColor={colors.muted}
        value={profile.lastName ?? ""}
        onChangeText={(v) => setProfile({ ...profile, lastName: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Edad"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        value={profile.age?.toString() ?? ""}
        onChangeText={(v) => setProfile({ ...profile, age: Number(v) || null })}
      />
      <TextInput
        style={styles.input}
        placeholder="Peso (kg)"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        value={profile.weightKg?.toString() ?? ""}
        onChangeText={(v) => setProfile({ ...profile, weightKg: Number(v) || null })}
      />
      <TextInput
        style={styles.input}
        placeholder="Altura (cm)"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        value={profile.heightCm?.toString() ?? ""}
        onChangeText={(v) => setProfile({ ...profile, heightCm: Number(v) || null })}
      />

      <View style={styles.chipRow}>
        {DISCIPLINES.map((d) => {
          const active = profile.disciplines.includes(d);
          return (
            <TouchableOpacity
              key={d}
              onPress={() => toggleDiscipline(d)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {message && <Text style={styles.success}>{message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={styles.buttonText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Subscription")}
      >
        <Text style={styles.secondaryButtonText}>Planes y suscripción</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Groups")}
      >
        <Text style={styles.secondaryButtonText}>Mis grupos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Dashboard")}
      >
        <Text style={styles.secondaryButtonText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Videos")}
      >
        <Text style={styles.secondaryButtonText}>Mis videos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => signOut(firebaseAuthClient)}
      >
        <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 20 },
  input: {
    backgroundColor: colors.blackSoft,
    color: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { borderColor: colors.turquoise },
  chipText: { color: colors.white, fontSize: 13 },
  chipTextActive: { color: colors.turquoise },
  button: {
    backgroundColor: colors.turquoise,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: colors.black, fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 40,
  },
  secondaryButtonText: { color: colors.white, fontSize: 14 },
  success: { color: colors.turquoise, marginBottom: 10, fontSize: 13 },
});
