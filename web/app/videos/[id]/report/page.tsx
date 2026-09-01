"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { apiDownload, apiPost } from "../../../../lib/api";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");

  async function handleDownload(format: "pdf" | "excel") {
    setBusy(format);
    setMessage(null);
    try {
      await apiDownload(
        `/api/v1/videos/${id}/report/${format}`,
        format === "pdf" ? "reporte-stance.pdf" : "reporte-stance.xlsx"
      );
    } catch (err) {
      setMessage("No se pudo generar el reporte. Verifica que el video tenga biomecánica calculada.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare(format: "pdf" | "excel") {
    setBusy(`share-${format}`);
    setMessage(null);
    try {
      const blob = await apiDownload(
        `/api/v1/videos/${id}/report/${format}`,
        format === "pdf" ? "reporte-stance.pdf" : "reporte-stance.xlsx"
      );
      const file = new File([blob], format === "pdf" ? "reporte-stance.pdf" : "reporte-stance.xlsx", {
        type: blob.type,
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Reporte Stance" });
      } else {
        setMessage("Tu navegador no soporta compartir directamente; el archivo ya se descargó.");
      }
    } catch (err) {
      // El usuario pudo haber cancelado el share sheet; no es necesariamente un error.
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(format: "pdf" | "excel") {
    setBusy(`email-${format}`);
    setMessage(null);
    try {
      const result = await apiPost<{ sentTo: string }>(`/api/v1/videos/${id}/report/email`, {
        format,
        toEmail: emailTo || undefined,
      });
      setMessage(`Reporte enviado a ${result.sentTo}.`);
    } catch (err) {
      setMessage(
        "No se pudo enviar el correo. Verifica que el servidor tenga configurado el envío de emails (SMTP)."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 560, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/videos">← Volver a mis videos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Resultado</h1>
      <p className="subtitle">Descarga, comparte o envía el análisis de esta sesión</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button className="btn-primary" style={{ width: "auto", padding: "10px 18px" }} onClick={() => handleDownload("pdf")} disabled={busy === "pdf"}>
          {busy === "pdf" ? "Generando…" : "Descargar PDF"}
        </button>
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px" }} onClick={() => handleDownload("excel")} disabled={busy === "excel"}>
          {busy === "excel" ? "Generando…" : "Descargar Excel"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px" }} onClick={() => handleShare("pdf")} disabled={busy === "share-pdf"}>
          Compartir PDF
        </button>
      </div>

      <div className="field" style={{ maxWidth: 320 }}>
        <label>Enviar por correo a (opcional, por defecto tu email)</label>
        <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="entrenador@ejemplo.com" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px" }} onClick={() => handleEmail("pdf")} disabled={busy === "email-pdf"}>
          {busy === "email-pdf" ? "Enviando…" : "Enviar PDF por correo"}
        </button>
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px" }} onClick={() => handleEmail("excel")} disabled={busy === "email-excel"}>
          {busy === "email-excel" ? "Enviando…" : "Enviar Excel por correo"}
        </button>
      </div>

      {message && <p className="success-text" style={{ marginTop: 16 }}>{message}</p>}
    </div>
  );
}
