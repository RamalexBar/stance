import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuthClient } from "../firebase/firebaseConfig";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function LoginScreen({ navigation }: RootStackScreenProps<"Login">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuthClient, email, password);
      // La navegación a Profile ocurre automáticamente vía AuthContext + RootNavigator.
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.black }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Easy Kite</Text>
        <Text style={styles.subtitle}>Inicia sesión para analizar tu técnica</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/*
          TODO (deuda técnica documentada en la Fase 1):
          Login con Google/Apple/Facebook en Expo requiere módulos nativos
          adicionales (expo-auth-session, expo-apple-authentication) y
          configuración de esquemas de URL por plataforma. Se implementa
          en una iteración posterior de esta misma fase; el flujo de
          email/password ya es completamente funcional.
        */}

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.black,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.turquoise,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.blackSoft,
    color: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.turquoise,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: colors.black,
    fontWeight: "700",
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    marginBottom: 10,
    fontSize: 13,
  },
  link: {
    color: colors.muted,
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
  },
});
