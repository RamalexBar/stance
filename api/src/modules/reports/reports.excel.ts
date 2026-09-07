import ExcelJS from "exceljs";
import { ReportData } from "./reports.data";

export async function buildReportExcel(data: ReportData): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Easy Kite";
  workbook.created = new Date();

  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.columns = [{ header: "Campo", key: "field", width: 30 }, { header: "Valor", key: "value", width: 40 }];
  summarySheet.addRows([
    { field: "Disciplina", value: data.video.discipline },
    { field: "Fecha", value: new Date(data.video.createdAt).toLocaleDateString() },
    { field: "Duración (s)", value: data.video.durationSeconds ?? "—" },
    { field: "Puntuación técnica", value: data.techniqueScore?.toFixed(0) ?? "—" },
  ]);
  if (data.summary) {
    summarySheet.addRow({});
    summarySheet.addRow({ field: "Métrica biomecánica", value: "Promedio" });
    for (const [key, val] of Object.entries<any>(data.summary)) {
      if (val && typeof val === "object" && "mean" in val) {
        summarySheet.addRow({ field: key, value: Number.isFinite(val.mean) ? val.mean.toFixed(2) : "—" });
      }
    }
  }
  summarySheet.getRow(1).font = { bold: true };

  // Hoja 2: Serie biomecánica completa (para análisis propio del usuario)
  if (data.series.length) {
    const seriesSheet = workbook.addWorksheet("Biomecánica (serie)");
    const firstFrame = data.series[0];
    const numericKeys = Object.keys(firstFrame).filter((k) => typeof firstFrame[k] === "number");
    seriesSheet.columns = numericKeys.map((k) => ({ header: k, key: k, width: 18 }));
    for (const frame of data.series) {
      seriesSheet.addRow(frame);
    }
    seriesSheet.getRow(1).font = { bold: true };
  }

  // Hoja 3: Errores
  const errorsSheet = workbook.addWorksheet("Errores");
  errorsSheet.columns = [
    { header: "Tipo", key: "type", width: 24 },
    { header: "Nivel", key: "level", width: 12 },
    { header: "Descripción", key: "description", width: 50 },
    { header: "Cómo corregirlo", key: "howToFix", width: 50 },
  ];
  for (const f of data.findings) {
    errorsSheet.addRow(f);
  }
  errorsSheet.getRow(1).font = { bold: true };

  // Hoja 4: Movimiento
  const movementSheet = workbook.addWorksheet("Movimiento");
  movementSheet.columns = [
    { header: "Maniobra", key: "type", width: 20 },
    { header: "Inicio (s)", key: "startSeconds", width: 12 },
    { header: "Fin (s)", key: "endSeconds", width: 12 },
    { header: "Confianza", key: "confidence", width: 12 },
  ];
  for (const s of data.segments) {
    movementSheet.addRow(s);
  }
  movementSheet.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}
