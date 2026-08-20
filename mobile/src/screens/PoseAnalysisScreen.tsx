import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { apiGet, apiPost } from "../api/client";
import { POSE_ENGINE_HTML } from "../pose/poseEngineHtml";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

interface VideoDetail {
  id: string;
  originalName: string | null;
  playbackUrl: string;
}

type ScreenState = "loading" | "ready" | "saving" | "done" | "error";

export default function PoseAnalysisScreen({ route }: RootStackScreenProps<"PoseAnalysis">) {
  const { videoId } = route.params;
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [state, setState] = useState<ScreenState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    apiGet<VideoDetail>(`/api/v1/videos/${videoId}`)
      .then((detail) => {
        setVideo(detail);
        setState("ready");
      })
      .catch(() => {
        setState("error");
        setMessage("No se pudo cargar el video.");
      });
  }, [videoId]);

  function isValidPosePayload(payload: any): boolean {
    return (
      payload &&
      typeof payload.fps === "number" &&
      Array.isArray(payload.frames) &&
      payload.frames.length > 0 &&
      payload.frames.every(
        (f: any) =>
          typeof f?.tSeconds === "number" &&
          Array.isArray(f?.landmarks) &&
          f.landmarks.length === 33
      )
    );
  }

  async function handleMessage(event: any) {
    try {
      const { type, payload } = JSON.parse(event.nativeEvent.data);

      if (type === "error") {
        setState("error");
        setMessage("No se detectó pose en este video. Verifica el encuadre.");
        return;
      }

      if (type === "done") {
        // El WebView corre el motor de MediaPipe cargado desde un CDN público;
        // validamos la forma del mensaje antes de reenviarlo al backend, en
        // vez de confiar ciegamente en lo que llega por postMessage.
        if (!isValidPosePayload(payload)) {
          setState("error");
          setMessage("El resultado del análisis de pose no tiene el formato esperado.");
          return;
        }
        setState("saving");
        setMessage("Guardando análisis…");
        await apiPost(`/api/v1/videos/${videoId}/pose-analysis`, payload);
        setState("done");
        setMessage(
          `Análisis guardado: ${payload.frames.length} cuadros, confianza promedio ${(
            payload.avgConfidence * 100
          ).toFixed(0)}%.`
        );
      }
    } catch (err) {
      console.error(err);
      setState("error");
      setMessage("No se pudo guardar el análisis.");
    }
  }

  if (state === "loading" || !video) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.turquoise} />
      </View>
    );
  }

  const injected = `window.__FOILIO_VIDEO_URL__ = ${JSON.stringify(video.playbackUrl)};`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Análisis de pose</Text>
      <Text style={styles.subtitle}>{video.originalName}</Text>

      <View style={styles.webviewWrap}>
        <WebView
          ref={webviewRef}
          originWhitelist={["about:blank"]}
          source={{ html: POSE_ENGINE_HTML }}
          injectedJavaScriptBeforeContentLoaded={injected}
          onMessage={handleMessage}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {message && (
        <Text style={[styles.message, state === "error" && styles.errorText]}>
          {message}
        </Text>
      )}
      {(state === "saving") && <ActivityIndicator color={colors.turquoise} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, padding: 24 },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: "center" },
  title: { color: colors.turquoise, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  webviewWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  message: { color: colors.turquoise, fontSize: 13, marginTop: 12, textAlign: "center" },
  errorText: { color: colors.danger },
});
