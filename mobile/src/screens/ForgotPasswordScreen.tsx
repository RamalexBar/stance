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
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuthClient } from "../firebase/firebaseConfig";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function ForgotPasswordScreen({ navigation }: RootStackScreenProps<"ForgotPassword">) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuthClient, email);
      setSent(true);
    } catch {
      setError("No pudimos enviar el correo. Verifica el email.");
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
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>Te enviaremos un enlace para restablecerla</Text>

        {sent ? (
          <Text style={styles.success}>Revisa tu correo ({email}) para continuar.</Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.buttonText}>Enviar enlace</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Volver a iniciar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.black, justifyContent: "center", padding: 24 },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 24 },
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
  buttonText: { color: colors.black, fontWeight: "700", fontSize: 15 },
  error: { color: colors.danger, marginBottom: 10, fontSize: 13 },
  success: { color: colors.turquoise, marginBottom: 14, fontSize: 14 },
  link: { color: colors.muted, marginTop: 16, textAlign: "center", fontSize: 13 },
});
