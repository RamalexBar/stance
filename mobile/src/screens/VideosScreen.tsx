import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { apiGet, apiPatch, apiPost } from "../api/client";
import { isSupabaseConfigured, uploadVideoToSignedUrl } from "../supabase/supabaseClient";
import { colors } from "../theme/colors";
import type { RootStackScreenProps } from "../navigation/types";

const BUCKET = process.env.EXPO_PUBLIC_SUPABASE_VIDEOS_BUCKET ?? "videos";
const DISCIPLINES = ["KITESURF", "WINGFOIL"];

interface VideoItem {
  id: string;
  discipline: string;
  source: string;
  status: string;
  originalName: string | null;
  durationSeconds: number | null;
}

export default function VideosScreen({ navigation }: RootStackScreenProps<"Videos">) {
  const [discipline, setDiscipline] = useState("KITESURF");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  useEffect(() => {
    refreshVideos();
  }, []);

  async function refreshVideos() {
    try {
      const list = await apiGet<VideoItem[]>("/api/v1/videos");
      setVideos(list);
    } catch (err) {
      console.error(err);
    }
  }

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset, source: string) {
    setUploading(true);
    setStatusMsg("Preparando subida…");
    try {
      const fileName = asset.fileName ?? `video-${Date.now()}.mp4`;
      const ticket = await apiPost<{
        videoId: string;
        storagePath: string;
        token: string;
        bucket: string;
      }>("/api/v1/videos", {
        discipline,
        source,
        originalName: fileName,
        fileSizeBytes: asset.fileSize,
      });

      setStatusMsg("Subiendo video…");
      try {
        await uploadVideoToSignedUrl({
          bucket: ticket.bucket ?? BUCKET,
          storagePath: ticket.storagePath,
          token: ticket.token,
          fileUri: asset.uri,
          mimeType: asset.mimeType,
        });
      } catch (uploadErr) {
        await apiPatch(`/api/v1/videos/${ticket.videoId}/fail`, {});
        throw uploadErr;
      }

      setStatusMsg("Confirmando…");
      await apiPatch(`/api/v1/videos/${ticket.videoId}/complete`, {
        durationSeconds: asset.duration ? asset.duration / 1000 : undefined,
      });

      setStatusMsg("¡Video subido!");
      await refreshVideos();
    } catch (err) {
      console.error(err);
      setStatusMsg("Ocurrió un error subiendo el video.");
    } finally {
      setUploading(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }

  async function handleImportFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMsg("Necesitamos permiso para acceder a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      uploadAsset(result.assets[0], "GALLERY");
    }
  }

  async function handleRecord() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusMsg("Necesitamos permiso para usar la cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      uploadAsset(result.assets[0], "RECORDED_IN_APP");
    }
  }

  async function handlePlay(videoId: string) {
    try {
      const detail = await apiGet<VideoItem & { playbackUrl: string }>(
        `/api/v1/videos/${videoId}`
      );
      setPlaybackUrl(detail.playbackUrl);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis videos</Text>

      {!isSupabaseConfigured && (
        <Text style={[styles.helperText, { color: "#FF8A3D" }]}>
          La subida de videos no está disponible: falta configuración de Supabase en esta build.
        </Text>
      )}

      <View style={styles.chipRow}>
        {DISCIPLINES.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDiscipline(d)}
            style={[styles.chip, discipline === d && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, discipline === d && styles.chipTextActive]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.button, { flex: 1 }]}
          onPress={handleRecord}
          disabled={uploading || !isSupabaseConfigured}
        >
          <Text style={styles.buttonText}>Grabar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { flex: 1 }]}
          onPress={handleImportFromGallery}
          disabled={uploading || !isSupabaseConfigured}
        >
          <Text style={styles.buttonText}>Importar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        Videos de GoPro, Insta360 o DJI: expórtalos a la galería del teléfono y luego
        usa "Importar". La integración nativa directa queda como mejora futura.
      </Text>

      {uploading && <ActivityIndicator color={colors.turquoise} style={{ marginTop: 10 }} />}
      {statusMsg && <Text style={styles.status}>{statusMsg}</Text>}

      <FlatList
        style={{ marginTop: 16 }}
        data={videos}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.helperText}>Todavía no has subido ningún video.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.videoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoName}>{item.originalName ?? "Video"}</Text>
              <Text style={styles.videoMeta}>
                {item.discipline} · {item.source} · {item.status}
              </Text>
            </View>
            {item.status === "UPLOADED" && (
              <View style={{ flexDirection: "row", gap: 14 }}>
                <TouchableOpacity onPress={() => handlePlay(item.id)}>
                  <Text style={{ color: colors.turquoise }}>Ver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("PoseAnalysis", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.turquoise }}>Analizar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Biomechanics", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.blue }}>Biomecánica</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Movement", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.white }}>Movimiento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Errors", { videoId: item.id })
                  }
                >
                  <Text style={{ color: "#FF8A3D" }}>Errores</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Compare", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.white }}>Comparar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("CoachPlan", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.turquoise, fontWeight: "700" }}>Entrenador IA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Report", { videoId: item.id })
                  }
                >
                  <Text style={{ color: colors.white }}>Reporte</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={!!playbackUrl} animationType="fade" onRequestClose={() => setPlaybackUrl(null)}>
        <View style={{ flex: 1, backgroundColor: colors.black, justifyContent: "center" }}>
          {playbackUrl && (
            <Video
              source={{ uri: playbackUrl }}
              style={{ width: "100%", height: 300 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )}
          <TouchableOpacity style={styles.closeButton} onPress={() => setPlaybackUrl(null)}>
            <Text style={{ color: colors.white }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, padding: 24 },
  title: { color: colors.turquoise, fontSize: 24, fontWeight: "700", marginBottom: 16 },
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
  },
  buttonText: { color: colors.black, fontWeight: "700" },
  helperText: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  status: { color: colors.turquoise, fontSize: 13, marginBottom: 8 },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  videoName: { color: colors.white, fontWeight: "600" },
  videoMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  closeButton: { alignSelf: "center", marginTop: 20, padding: 12 },
});
