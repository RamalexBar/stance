"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet, apiPatch, apiPost } from "../../lib/api";
import { supabaseClient } from "../../lib/supabaseClient";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET ?? "videos";

const DISCIPLINES = ["KITESURF", "WINGFOIL"];

interface VideoItem {
  id: string;
  discipline: string;
  source: string;
  status: string;
  originalName: string | null;
  durationSeconds: number | null;
  createdAt: string;
  hasPoseAnalysis?: boolean;
  hasBiomechanics?: boolean;
  hasMovement?: boolean;
  hasErrors?: boolean;
}

interface UploadTicket {
  videoId: string;
  storagePath: string;
  signedUrl: string;
  token: string;
  bucket: string;
}

function StepLink({
  href,
  label,
  enabled,
  disabledReason,
  color,
  bold,
}: {
  href: string;
  label: string;
  enabled: boolean;
  disabledReason?: string;
  color?: string;
  bold?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    width: "auto",
    padding: "8px 14px",
    display: "inline-flex",
    alignItems: "center",
    fontWeight: bold ? 600 : undefined,
  };

  if (!enabled) {
    return (
      <span
        className="btn-secondary"
        title={disabledReason ?? "Todavía no disponible para este video."}
        style={{ ...baseStyle, opacity: 0.4, cursor: "not-allowed" }}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="btn-secondary"
      style={{ ...baseStyle, color, borderColor: color }}
    >
      {label}
    </Link>
  );
}

export default function VideosPage() {
  const { ready } = useRequireAuth();
  const [discipline, setDiscipline] = useState("KITESURF");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    refreshVideos();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshVideos() {
    try {
      const list = await apiGet<VideoItem[]>("/api/v1/videos");
      setVideos(list);
    } catch (err) {
      console.error(err);
    }
  }

  async function uploadFile(file: File, source: string) {
    setUploading(true);
    setProgressMsg("Preparando subida…");
    try {
      const ticket = await apiPost<UploadTicket>("/api/v1/videos", {
        discipline,
        source,
        originalName: file.name,
        fileSizeBytes: file.size,
      });

      setProgressMsg("Subiendo video a almacenamiento…");
      const { error } = await supabaseClient.storage
        .from(ticket.bucket ?? BUCKET)
        .uploadToSignedUrl(ticket.storagePath, ticket.token, file);

      if (error) {
        await apiPatch(`/api/v1/videos/${ticket.videoId}/fail`, {});
        throw error;
      }

      setProgressMsg("Confirmando subida…");
      await apiPatch(`/api/v1/videos/${ticket.videoId}/complete`, {});

      setProgressMsg("¡Video subido con éxito!");
      await refreshVideos();
    } catch (err) {
      console.error(err);
      setProgressMsg("Ocurrió un error subiendo el video.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgressMsg(null), 3000);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>, source: string) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, source);
    e.target.value = "";
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

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Mis videos</h1>
      <p className="subtitle">Sube o importa un video para analizarlo</p>

      <div className="field" style={{ maxWidth: 260 }}>
        <label>Disciplina del video</label>
        <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "12px 20px" }}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          Importar desde galería
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileSelected(e, "GALLERY")}
        />
      </div>

      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Videos exportados desde GoPro, Insta360 o DJI: expórtalos como archivo de video
        estándar a tu galería y súbelos con el botón de arriba. La integración nativa
        directa con esas cámaras queda documentada como mejora futura (ver README de esta
        fase).
      </p>

      {progressMsg && <p className="success-text">{progressMsg}</p>}

      <h2 style={{ marginTop: 32, fontSize: "1.1rem", color: "var(--color-white)" }}>
        Historial
      </h2>

      {videos.length === 0 && (
        <p style={{ color: "var(--color-muted)" }}>Todavía no has subido ningún video.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {videos.map((v) => (
          <li
            key={v.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{v.originalName ?? "Video"}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {v.discipline} · {v.source} · {v.status}
                {v.durationSeconds ? ` · ${Math.round(v.durationSeconds)}s` : ""}
              </div>
            </div>
            {v.status === "UPLOADED" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  className="btn-secondary"
                  style={{ width: "auto", padding: "8px 14px", margin: 0 }}
                  onClick={() => handlePlay(v.id)}
                >
                  Reproducir
                </button>
                <StepLink
                  href={`/videos/${v.id}/analyze`}
                  label="Analizar"
                  enabled
                  color="var(--color-turquoise)"
                />
                <StepLink
                  href={`/videos/${v.id}/biomechanics`}
                  label="Biomecánica"
                  enabled={!!v.hasPoseAnalysis}
                  disabledReason="Primero corre 'Analizar' en este video."
                  color="var(--color-blue)"
                />
                <StepLink
                  href={`/videos/${v.id}/movement`}
                  label="Movimiento"
                  enabled={!!v.hasPoseAnalysis}
                  disabledReason="Primero corre 'Analizar' en este video."
                />
                <StepLink
                  href={`/videos/${v.id}/errors`}
                  label="Errores"
                  enabled={!!v.hasBiomechanics && !!v.hasMovement}
                  disabledReason="Primero corre 'Biomecánica' y 'Movimiento' en este video."
                  color="#FF8A3D"
                />
                <StepLink
                  href={`/videos/${v.id}/compare`}
                  label="Comparar"
                  enabled={!!v.hasPoseAnalysis}
                  disabledReason="Primero corre 'Analizar' en este video."
                />
                <StepLink
                  href={`/videos/${v.id}/coach`}
                  label="Entrenador IA"
                  enabled={!!v.hasBiomechanics && !!v.hasMovement && !!v.hasErrors}
                  disabledReason="Primero corre 'Biomecánica', 'Movimiento' y 'Errores' en este video."
                  color="var(--color-turquoise)"
                  bold
                />
                <StepLink
                  href={`/videos/${v.id}/report`}
                  label="Reporte"
                  enabled={!!v.hasPoseAnalysis}
                  disabledReason="Primero corre 'Analizar' en este video."
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {playbackUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setPlaybackUrl(null)}
        >
          <video
            src={playbackUrl}
            controls
            autoPlay
            style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
