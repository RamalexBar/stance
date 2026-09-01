import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Sharing from "expo-sharing";
import { apiDownloadFile, apiPost } from "../api/client";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

export default function ReportScreen({ route }: RootStackScreenProps<"Report">) {
  const { videoId } = route.params;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");

  async function handleShare(format: "pdf" | "excel") {
    setBusy(format);
    setMessage(null);
    try {
      const filename = format === "pdf" ? "reporte-stance.pdf" : "reporte-stance.xlsx";
      const uri = await apiDownloadFile(`/api/v1/videos/${videoId}/report/${format}`, filename);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        setMessage(`Archivo descargado en: ${uri}`);
      }
    } catch (err) {
      setMessage("No se pudo generar el reporte. Verifica que el video tenga biomecánica calculada.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(format: "pdf" | "excel") {
    setBusy(`email-${format}`);
    setMessage(null);
    try {
      const result = await apiPost<{ sentTo: string }>(`/api/v1/videos/${videoId}/report/email`, {
        format,
        toEmail: emailTo || undefined,
      });
      setMessage(`Reporte enviado a ${result.sentTo}.`);
    } catch (err) {
      setMessage("No se pudo enviar el correo. Verifica que el servidor tenga SMTP configurado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultado</Text>
      <Text style={styles.subtitle}>Descarga, comparte o envía el análisis por correo</Text>

      <TouchableOpacity style={styles.button} onPress={() => handleShare("pdf")} disabled={busy === "pdf"}>
        {busy === "pdf" ? <ActivityIndicator color={colors.black} /> : <Text style={styles.buttonText}>Compartir PDF</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleShare("excel")} disabled={busy === "excel"}>
        {busy === "excel" ? <ActivityIndicator color={colors.white} /> : <Text style={styles.secondaryButtonText}>Compartir Excel</Text>}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Enviar a (opcional, por defecto tu email)"
        placeholderTextColor={colors.muted}
        value={emailTo}
        onChangeText={setEmailTo}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleEmail("pdf")} disabled={busy === "email-pdf"}>
        {busy === "email-pdf" ? <ActivityIndicator color={colors.white} /> : <Text style={styles.secondaryButtonText}>Enviar PDF por correo</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleEmail("excel")} disabled={busy === "email-excel"}>
        {busy === "email-excel" ? <ActivityIndicator color={colors.white} /> : <Text style={styles.secondaryButtonText}>Enviar Excel por correo</Text>}
      </TouchableOpacity>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, padding: 24 },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 20 },
  button: { backgroundColor: colors.turquoise, borderRadius: 10, padding: 14, alignItems: "center", marginBottom: 10 },
  buttonText: { color: colors.black, fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: { color: colors.white },
  input: {
    backgroundColor: colors.blackSoft,
    color: colors.white,
    borderRadius: 10,
    padding: 14,
    marginVertical: 14,
  },
  message: { color: colors.turquoise, fontSize: 13, marginTop: 10, textAlign: "center" },
});
