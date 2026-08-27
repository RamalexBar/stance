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
import * as Location from "expo-location";
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

interface RawGpsPoint {
  timestamp: number;
  lat: number;
  lon: number;
  accuracyMeters?: number;
}

/**
 * El timestamp t=0 del track NO es "cuándo se abrió la cámara" sino
 * "cuándo empezó realmente la grabación", calculado hacia atrás desde el
 * momento en que la cámara nativa devolvió el video (dato preciso) menos
 * su duración (dato preciso) — evita el error que metería asumir que la
 * grabación arrancó apenas se invocó la cámara (hay demora mientras el
 * usuario encuadra antes de presionar grabar).
 */
function buildGpsTrackPoints(points: RawGpsPoint[], recordingEndedAt: number, durationMs: number) {
  const recordingStartedAt = recordingEndedAt - durationMs;
  return points
    .map((p) => ({
      tSeconds: (p.timestamp - recordingStartedAt) / 1000,
      lat: p.lat,
      lon: p.lon,
      accuracyMeters: p.accuracyMeters,
    }))
    .filter((p) => p.tSeconds >= 0 && p.tSeconds <= durationMs / 1000);
}

async function submitGpsTrack(
  videoId: string,
  rawPoints: RawGpsPoint[],
  recordingEndedAt: number,
  durationMs: number
) {
  const points = buildGpsTrackPoints(rawPoints, recordingEndedAt, durationMs);
  if (points.length < 2) return; // el backend exige al menos 2 puntos
  try {
    await apiPost(`/api/v1/videos/${videoId}/gps-track`, { points });
  } catch (err) {
    // No crítico: el video ya se subió bien. Solo se pierde velocidad/distancia.
    console.error("No se pudo subir el track GPS:", err);
  }
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

  async function uploadAsset(
    asset: ImagePicker.ImagePickerAsset,
    source: string
  ): Promise<string | null> {
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
      return ticket.videoId;
    } catch (err) {
      console.error(err);
      setStatusMsg("Ocurrió un error subiendo el video.");
      return null;
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

    // El GPS es opcional: si no se concede el permiso, se graba igual y
    // simplemente el video no tendrá velocidad/distancia en el dashboard.
    // La cámara nativa (launchCameraAsync) corre en el mismo proceso JS que
    // esta pantalla, así que watchPositionAsync sigue capturando mientras
    // está abierta — no hace falta una pantalla de cámara propia.
    const gpsPoints: RawGpsPoint[] = [];
    let gpsSubscription: Location.LocationSubscription | null = null;
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.granted) {
      gpsSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          gpsPoints.push({
            timestamp: loc.timestamp,
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracyMeters: loc.coords.accuracy ?? undefined,
          });
        }
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });
    const recordingEndedAt = Date.now();
    gpsSubscription?.remove();

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const videoId = await uploadAsset(asset, "RECORDED_IN_APP");
      if (videoId && asset.duration && gpsPoints.length >= 2) {
        await submitGpsTrack(videoId, gpsPoints, recordingEndedAt, asset.duration);
      }
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
