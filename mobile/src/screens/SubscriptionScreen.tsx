import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { apiGet, apiPost } from "../api/client";
import { colors } from "../theme/colors";

interface PlanInfo {
  name: string;
  label: string;
  priceUsdMonthly: number;
  maxGroups: number;
  maxNewEnrollmentsPerMonth: number;
  allowReferenceComparison: boolean;
  allowReports: boolean;
}

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [mine, setMine] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PlanInfo[]>("/api/v1/subscriptions/plans").then(setPlans).catch(console.error);
    apiGet<any>("/api/v1/subscriptions/me").then(setMine).catch(console.error);
  }, []);

  async function subscribe(planName: string) {
    setBusy(planName);
    try {
      const result = await apiPost<{ url: string }>("/api/v1/subscriptions/checkout", { plan: planName });
      Linking.openURL(result.url);
    } catch {
      // Silenciosamente falla si Stripe no está configurado; el usuario reintenta.
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Planes</Text>
      {mine && (
        <Text style={styles.currentPlan}>
          Tu plan actual: <Text style={{ color: colors.turquoise }}>{mine.config.label}</Text>
        </Text>
      )}

      {plans.map((p) => (
        <View key={p.name} style={[styles.card, mine?.plan === p.name && { borderColor: colors.turquoise }]}>
          <Text style={styles.planLabel}>{p.label}</Text>
          <Text style={styles.planPrice}>${p.priceUsdMonthly}/mes</Text>
          {p.maxGroups > 0 && (
            <Text style={styles.feature}>Hasta {p.maxGroups} grupo(s) · {p.maxNewEnrollmentsPerMonth} inscripciones/mes</Text>
          )}
          <Text style={styles.feature}>{p.allowReferenceComparison ? "Comparación con referencia ✓" : "Sin comparación con referencia"}</Text>
          <Text style={styles.feature}>{p.allowReports ? "Reportes PDF/Excel ✓" : "Sin reportes"}</Text>

          {p.name !== "FREE" && mine?.plan !== p.name && (
            <TouchableOpacity style={styles.button} onPress={() => subscribe(p.name)} disabled={busy === p.name}>
              <Text style={styles.buttonText}>{busy === p.name ? "Abriendo…" : "Suscribirse"}</Text>
            </TouchableOpacity>
          )}
          {mine?.plan === p.name && <Text style={styles.currentTag}>Plan actual</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 8 },
  currentPlan: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  card: {
    backgroundColor: colors.blackSoft,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  planLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  planPrice: { color: colors.turquoise, fontSize: 22, fontWeight: "700", marginVertical: 6 },
  feature: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  button: { backgroundColor: colors.turquoise, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: colors.black, fontWeight: "700" },
  currentTag: { color: colors.turquoise, fontSize: 12, textAlign: "center", marginTop: 8 },
});
