import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/format";

// Fetches an academy's logo (organizations.logo_url — a plain URL the admin
// pastes in, not an upload; there is no image storage in this project) and
// returns it as a data: URI ready for buildCertificatePdf. Every failure
// path (missing URL, network error, too large, wrong content type) returns
// null rather than throwing — a bad logo link must never break certificate
// generation for a student who just passed.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function fetchLogoDataUri(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_LOGO_BYTES) return null;
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export interface CertificateData {
  studentName: string;
  quizTitle: string;
  courseTitle: string;
  academyName: string;
  score: number;
  issuedAt: string;
  certificateNumber: string;
  /** Free shows the Quizo badge; Pro adds the academy's own logo/colour on
   * top of it; Institution removes the Quizo badge entirely. Matches
   * plan_limits.has_custom_branding / has_white_label. */
  hasCustomBranding: boolean;
  hasWhiteLabel: boolean;
  /** Pro/Institution only — a hex string like "#1B4D3E". Falls back to the
   * Quizo brand spruce when absent or invalid. */
  accentColor?: string | null;
  /** Pro/Institution only — a data: URI already fetched by the caller. The
   * caller is responsible for fetching organizations.logo_url and handling
   * a failed fetch; this function never fetches over the network itself,
   * so a bad or slow logo URL can never break certificate generation. */
  logoDataUri?: string | null;
}

// Quizo brand defaults (docs/DESIGN-SYSTEM.md).
const SPRUCE: [number, number, number] = [27, 77, 62]; // #1B4D3E
const GOLD: [number, number, number] = [244, 163, 0]; // #F4A300
const INK: [number, number, number] = [15, 23, 42]; // #0F172A
const SLATE: [number, number, number] = [71, 85, 105]; // #475569
const MUTED: [number, number, number] = [148, 163, 184]; // #94A3B8

function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

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

  const accent = (data.hasCustomBranding && hexToRgb(data.accentColor)) || SPRUCE;

  // Background stays explicitly white — this document is always light,
  // regardless of the app's theme, since it gets printed.
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Border, 8mm inside the page edge.
  doc.setDrawColor(...accent);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  let titleY = 46;

  // Academy logo, top-center, above the title — Pro/Institution only, and
  // only when the caller successfully fetched one. getImageProperties reads
  // the real width/height so a non-square logo never looks stretched.
  if (data.hasCustomBranding && data.logoDataUri) {
    try {
      const props = doc.getImageProperties(data.logoDataUri);
      const logoHeight = 18;
      const logoWidth = logoHeight * (props.width / props.height);
      doc.addImage(data.logoDataUri, props.fileType, centerX - logoWidth / 2, 20, logoWidth, logoHeight);
      titleY = 50;
    } catch {
      // A corrupt or unsupported image never breaks the certificate — the
      // title just renders at its default position instead.
    }
  }

  // Title.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.setFontSize(30);
  doc.text(letterSpacedCaps("Certificate of Achievement"), centerX, titleY, { align: "center", charSpace: 2 });

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  doc.line(centerX - 55, titleY + 7, centerX + 55, titleY + 7);

  // Issuing academy name.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.setFontSize(11);
  doc.text(letterSpacedCaps(data.academyName), centerX, titleY + 16, { align: "center", charSpace: 1 });

  // Intro line.
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE);
  doc.setFontSize(13);
  doc.text("This is to certify that", centerX, titleY + 24, { align: "center" });

  // Student name — the hero of the page. Shrinks to fit one line.
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...accent);
  const nameSize = fitFontSize(doc, data.studentName, pageWidth - 60, 36, 18);
  doc.setFontSize(nameSize);
  doc.text(data.studentName, centerX, titleY + 46, { align: "center" });

  // "has successfully completed"
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE);
  doc.setFontSize(13);
  doc.text("has successfully completed", centerX, titleY + 60, { align: "center" });

  // Quiz title, course name smaller below.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  const quizSize = fitFontSize(doc, data.quizTitle, pageWidth - 70, 20, 13);
  doc.setFontSize(quizSize);
  doc.text(data.quizTitle, centerX, titleY + 74, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(12);
  doc.text(data.courseTitle, centerX, titleY + 82, { align: "center" });

  // Row of three details: Score, Date, Certificate number.
  const details = [
    { label: "Score", value: `${data.score}%` },
    { label: "Date", value: formatDate(data.issuedAt) },
    { label: "Certificate Number", value: data.certificateNumber },
  ];
  const detailY = titleY + 104;
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

  // Bottom left: certificate number in small grey.
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text(data.certificateNumber, 20, pageHeight - 16);

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

  // "Powered by Quizo" badge, bottom-center — every plan except Institution
  // (full white-label), per docs/FEATURES.md §8.
  if (!data.hasWhiteLabel) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GOLD);
    doc.setFontSize(8);
    doc.text("Powered by Quizo", centerX, pageHeight - 12, { align: "center" });
  }

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
