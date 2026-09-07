import { gatherReportData } from "./reports.data";
import { buildReportPdf } from "./reports.pdf";
import { buildReportExcel } from "./reports.excel";
import { sendReportEmail } from "./reports.mailer";
import { EmailReportInput } from "./reports.dto";
import { subscriptionsService } from "../subscriptions/subscriptions.service";

async function bufferFromPdfDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export const reportsService = {
  async getPdfBuffer(userId: string, videoId: string): Promise<Buffer> {
    await subscriptionsService.assertCanUseReports(userId);
    const data = await gatherReportData(userId, videoId);
    const doc = buildReportPdf(data);
    return bufferFromPdfDoc(doc);
  },

  async getExcelBuffer(userId: string, videoId: string): Promise<Buffer> {
    await subscriptionsService.assertCanUseReports(userId);
    const data = await gatherReportData(userId, videoId);
    const buffer = await buildReportExcel(data);
    return Buffer.from(buffer);
  },

  async emailReport(userId: string, videoId: string, input: EmailReportInput) {
    await subscriptionsService.assertCanUseReports(userId);
    const data = await gatherReportData(userId, videoId);
    const toEmail = input.toEmail ?? data.user?.email;
    if (!toEmail) {
      throw new Error("No se encontró un email de destino.");
    }

    const isPdf = input.format === "pdf";
    const buffer = isPdf
      ? await bufferFromPdfDoc(buildReportPdf(data))
      : Buffer.from(await buildReportExcel(data));

    await sendReportEmail({
      toEmail,
      subject: `Easy Kite — Reporte de tu sesión de ${data.video.discipline}`,
      text: "Adjunto encontrarás el reporte de tu última sesión analizada en Easy Kite.",
      attachmentFilename: isPdf ? "reporte-easykite.pdf" : "reporte-easykite.xlsx",
      attachmentBuffer: buffer,
      attachmentContentType: isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return { sentTo: toEmail };
  },
};
