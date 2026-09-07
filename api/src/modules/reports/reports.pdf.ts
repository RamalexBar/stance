import PDFDocument from "pdfkit";
import { ReportData } from "./reports.data";

const TURQUOISE = "#0e8f7e";
const MUTED = "#666666";

function fmt(n: number | null | undefined, decimals = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

export function buildReportPdf(data: ReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.fontSize(20).fillColor(TURQUOISE).text("Easy Kite — Reporte de sesión", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(MUTED).text(
    `${data.video.discipline} · ${new Date(data.video.createdAt).toLocaleDateString()} · ${data.video.originalName ?? "Video"}`
  );
  doc.moveDown(1);

  if (data.techniqueScore !== null) {
    doc.fontSize(14).fillColor("#000").text(`Puntuación técnica: ${fmt(data.techniqueScore, 0)} / 100`);
    doc.moveDown(1);
  }

  // Biomecánica
  doc.fontSize(14).fillColor("#000").text("Biomecánica (promedios)");
  doc.moveDown(0.3);
  if (data.summary) {
    const rows: [string, string][] = [
      ["Ángulo de rodilla (izq/der)", `${fmt(data.summary.kneeAngleLeft?.mean)}° / ${fmt(data.summary.kneeAngleRight?.mean)}°`],
      ["Ángulo de cadera (izq/der)", `${fmt(data.summary.hipAngleLeft?.mean)}° / ${fmt(data.summary.hipAngleRight?.mean)}°`],
      ["Inclinación de tronco", `${fmt(data.summary.trunkInclinationDeg?.mean)}°`],
      ["Balance (adelante/atrás)", fmt(data.summary.balanceOffset?.mean, 2)],
      ["Simetría (menor = mejor)", `${fmt(data.summary.symmetryDelta?.mean)}°`],
    ];
    for (const [label, value] of rows) {
      doc.fontSize(10).fillColor(MUTED).text(`${label}: `, { continued: true }).fillColor("#000").text(value);
    }
  } else {
    doc.fontSize(10).fillColor(MUTED).text("Este video no tiene biomecánica calculada.");
  }
  doc.moveDown(1);

  // Errores
  doc.fontSize(14).fillColor("#000").text("Errores técnicos detectados");
  doc.moveDown(0.3);
  if (data.findings.length === 0) {
    doc.fontSize(10).fillColor(MUTED).text("No se detectaron errores con las reglas actuales.");
  } else {
    for (const f of data.findings) {
      doc.fontSize(11).fillColor("#000").text(`${String(f.type).replaceAll("_", " ")} — ${f.level}`);
      doc.fontSize(9).fillColor(MUTED).text(f.description);
      doc.fontSize(9).fillColor(MUTED).text(`Corrección: ${f.howToFix}`);
      doc.moveDown(0.4);
    }
  }
  doc.moveDown(0.5);

  // Movimiento
  doc.fontSize(14).fillColor("#000").text("Maniobras detectadas");
  doc.moveDown(0.3);
  const specialSegments = data.segments.filter((s: any) => s.type !== "NAVEGACION");
  if (specialSegments.length === 0) {
    doc.fontSize(10).fillColor(MUTED).text("No se detectaron saltos ni cambios de dirección.");
  } else {
    for (const s of specialSegments) {
      doc.fontSize(10).fillColor(MUTED).text(
        `${String(s.type).replaceAll("_", " ")}: ${s.startSeconds.toFixed(1)}s – ${s.endSeconds.toFixed(1)}s`
      );
    }
  }
  doc.moveDown(1);

  // Plan del entrenador IA (si existe)
  if (data.coachPlan?.planJson) {
    const plan = data.coachPlan.planJson as any;
    doc.addPage();
    doc.fontSize(14).fillColor("#000").text("Plan del entrenador IA");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(MUTED).text(plan.resumen ?? "");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#000").text("Prioridad de mejora");
    doc.fontSize(10).fillColor(MUTED).text(plan.planMejora ?? "");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#000").text("Ejercicios prioritarios");
    for (const ex of plan.ejerciciosPrioritarios ?? []) {
      doc.fontSize(10).fillColor(MUTED).text(`• ${ex}`);
    }
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor(MUTED).text(
    "Nota: las métricas de centro de masa, rotación de tronco y carga articular son estimaciones a partir de una sola cámara 2D, no mediciones exactas. Este reporte no constituye un diagnóstico médico.",
    { align: "left" }
  );

  return doc;
}
