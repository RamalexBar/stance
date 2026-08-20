"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiGet } from "../../../../lib/api";
import PoseAnalyzer from "../../../../components/PoseAnalyzer";

interface VideoDetail {
  id: string;
  originalName: string | null;
  playbackUrl: string;
}

export default function AnalyzeVideoPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiGet<VideoDetail>(`/api/v1/videos/${id}`)
      .then(setVideo)
      .catch(() => setError("No se pudo cargar el video."));
  }, [id, ready]);

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>
        Análisis de pose
      </h1>
      <p className="subtitle">{video?.originalName ?? "Cargando…"}</p>

      {error && <p className="error-text">{error}</p>}

      {video && <PoseAnalyzer videoId={video.id} videoUrl={video.playbackUrl} />}
    </div>
  );
}
