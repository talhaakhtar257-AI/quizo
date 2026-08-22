import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/format";

export interface CertificateData {
  studentName: string;
  quizTitle: string;
  courseTitle: string;
  percentage: number;
  issuedAt: string;
  certificateCode: string;
}

const INDIGO: [number, number, number] = [79, 70, 229]; // #4F46E5
const INK: [number, number, number] = [15, 23, 42]; // #0F172A
const SLATE: [number, number, number] = [71, 85, 105]; // #475569
const MUTED: [number, number, number] = [148, 163, 184]; // #94A3B8

function letterSpacedCaps(text: string) {
  return text.toUpperCase();
}

// Shrinks the font until the text fits maxWidth, so a long name never wraps
// or overflows the page — measured against the font already set on `doc`.
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize: number) {
  let size = startSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minSize) {
    size -= 1;
    doc.setFontSize(size);
  }
  return size;
}

export function buildCertificatePdf(data: CertificateData): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const centerX = pageWidth / 2;

  // Background stays explicitly white — this document is always light,
  // regardless of the app's theme, since it gets printed.
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Border, 8mm inside the page edge.
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Title.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.setFontSize(30);
  doc.text(letterSpacedCaps("Certificate of Achievement"), centerX, 46, { align: "center", charSpace: 2 });

  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.6);
  doc.line(centerX - 55, 53, centerX + 55, 53);

  // Intro line.
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE);
  doc.setFontSize(13);
  doc.text("This is to certify that", centerX, 70, { align: "center" });

  // Student name — the hero of the page. Shrinks to fit one line.
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...INDIGO);
  const nameSize = fitFontSize(doc, data.studentName, pageWidth - 60, 36, 18);
  doc.setFontSize(nameSize);
  doc.text(data.studentName, centerX, 92, { align: "center" });

  // "has successfully completed"
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE);
  doc.setFontSize(13);
  doc.text("has successfully completed", centerX, 106, { align: "center" });

  // Quiz title, course name smaller below.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  const quizSize = fitFontSize(doc, data.quizTitle, pageWidth - 70, 20, 13);
  doc.setFontSize(quizSize);
  doc.text(data.quizTitle, centerX, 120, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(12);
  doc.text(data.courseTitle, centerX, 128, { align: "center" });

  // Row of three details: Score, Date, Certificate code.
  const details = [
    { label: "Score", value: `${data.percentage}%` },
    { label: "Date", value: formatDate(data.issuedAt) },
    { label: "Certificate Code", value: data.certificateCode },
  ];
  const detailY = 150;
  const slotWidth = (pageWidth - 100) / 3;
  details.forEach((detail, index) => {
    const x = 50 + slotWidth * index + slotWidth / 2;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(letterSpacedCaps(detail.label), x, detailY, { align: "center", charSpace: 1 });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.setFontSize(13);
    doc.text(detail.value, x, detailY + 7, { align: "center" });
  });

  // Bottom left: certificate code in small grey.
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text(data.certificateCode, 20, pageHeight - 16);

  // Bottom right: signature line with "Administrator".
  const sigRight = pageWidth - 20;
  const sigLeft = sigRight - 55;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.line(sigLeft, pageHeight - 24, sigRight, pageHeight - 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text("Administrator", (sigLeft + sigRight) / 2, pageHeight - 18, { align: "center" });

  return doc;
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "quiz";
}

export function certificateFilename(quizTitle: string, issuedAt: string): string {
  const date = new Date(issuedAt).toISOString().slice(0, 10);
  return `certificate-${slugify(quizTitle)}-${date}.pdf`;
}
