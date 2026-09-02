"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, ImageIcon, FileUp, Sparkles } from "lucide-react";
import { Button, Card, Textarea, buttonVariants, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveContent } from "./actions";

const TABS = [
  { value: "text", label: "Paste Text", icon: FileText },
  { value: "image", label: "Upload Image", icon: ImageIcon },
  { value: "file", label: "Upload File", icon: FileUp },
] as const;
type Tab = (typeof TABS)[number]["value"];

const MIN_RECOMMENDED_CHARS = 200;
const MAX_RECOMMENDED_CHARS = 50_000;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TEXT_EXTENSIONS = [".txt", ".md"];
const MAX_TEXT_FILE_SIZE = 2 * 1024 * 1024;
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024;
// Tesseract confidence is 0-100. Handwriting and blank/blurry images
// consistently score well below this; clear printed text scores much higher.
const MIN_CONFIDENCE = 35;

interface StagedImage {
  file: File;
  previewUrl: string;
}

// Heuristic only: file.text() always decodes as UTF-8, so a file that isn't
// really UTF-8 text doesn't throw — it comes back full of replacement
// characters (U+FFFD) or stray control characters instead. A real document
// shouldn't have more than a tiny fraction of either.
function looksLikeGarbledText(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  let badChars = 0;
  for (const char of sample) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code < 32 && char !== "\n" && char !== "\r" && char !== "\t";
    if (char === "�" || isControl) badChars += 1;
  }
  return badChars / sample.length > 0.02;
}

export function ContentUploader({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("text");
  const [savedUploadId, setSavedUploadId] = useState<string | null>(null);

  // Paste Text tab
  const [pasteText, setPasteText] = useState("");
  const [savingText, setSavingText] = useState(false);

  // Upload Image tab
  const [images, setImages] = useState<StagedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imageText, setImageText] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload File tab
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  function switchTab(next: Tab) {
    setTab(next);
    setSavedUploadId(null);
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const accepted: StagedImage[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (unsupported file type)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (over 10MB)`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (rejected.length > 0) {
      showToast(`Skipped: ${rejected.join(", ")}`, "warning");
    }
    if (accepted.length > 0) {
      setImages((current) => [...current, ...accepted]);
      setOcrError(null);
    }
  }

  function removeImage(index: number) {
    setImages((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files) addFiles(event.dataTransfer.files);
  }

  async function extractPdfText(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      standardFontDataUrl: "/pdf-standard-fonts/",
    }).promise;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pageTexts.push(text.trim());
    }

    return pageTexts.filter(Boolean).join("\n\n");
  }

  async function loadTextFile(file: File) {
    const lowerName = file.name.toLowerCase();
    const extensionSaysPdf = lowerName.endsWith(".pdf");
    const hasAcceptedExtension =
      extensionSaysPdf || ACCEPTED_TEXT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    if (!hasAcceptedExtension) {
      showToast(`${file.name} is not a .txt, .md, or .pdf file`, "warning");
      return;
    }

    // Trust the file's own magic bytes over its extension — a renamed file
    // (a PDF saved as .txt, or vice versa) would otherwise be read through
    // the wrong path and silently save garbled/binary content.
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const contentIsPdf = String.fromCharCode(...header) === "%PDF-";
    const isPdf = contentIsPdf || extensionSaysPdf;

    const maxSize = isPdf ? MAX_PDF_FILE_SIZE : MAX_TEXT_FILE_SIZE;
    if (file.size > maxSize) {
      showToast(`${file.name} is over ${isPdf ? "10MB" : "2MB"}`, "warning");
      return;
    }

    setFileReadError(null);
    setReadingFile(true);
    try {
      const text = isPdf ? await extractPdfText(file) : await file.text();
      if (isPdf && text.trim().length < 20) {
        setFileReadError(
          "We could not find text in this PDF. It may be a scanned document — try the Upload Image tab instead, or paste the text directly."
        );
      } else if (!isPdf && looksLikeGarbledText(text)) {
        // file.text() always decodes as UTF-8; a file that isn't real UTF-8
        // text (a mislabeled binary file, or a different text encoding)
        // comes back full of replacement/control characters instead of an
        // error, so this is the only signal we get.
        setFileReadError(
          "This file doesn't look like readable text — it may not be a plain UTF-8 text file. Try opening it and pasting the text instead."
        );
      }
      setFileText(text);
      setFileName(file.name);
    } catch {
      setFileReadError("Could not read this file. Try opening it and pasting the text instead.");
    } finally {
      setReadingFile(false);
    }
  }

  function handleTextFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.[0]) void loadTextFile(event.target.files[0]);
    event.target.value = "";
  }

  function handleTextFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setFileDragOver(false);
    if (event.dataTransfer.files?.[0]) void loadTextFile(event.dataTransfer.files[0]);
  }

  async function runOcr() {
    if (images.length === 0) return;
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrError(null);

    try {
      const { createWorker } = await import("tesseract.js");
      let currentIndex = 0;
      const worker = await createWorker(["eng", "urd", "ara"], undefined, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            const overall = ((currentIndex + message.progress) / images.length) * 100;
            setOcrProgress(Math.min(99, Math.round(overall)));
          }
        },
      });

      const pieces: string[] = [];
      let confidenceTotal = 0;

      for (let i = 0; i < images.length; i++) {
        currentIndex = i;
        const { data } = await worker.recognize(images[i].file);
        pieces.push(data.text.trim());
        confidenceTotal += data.confidence;
      }

      await worker.terminate();
      setOcrProgress(100);

      const combined = pieces.filter(Boolean).join("\n\n");
      const avgConfidence = confidenceTotal / images.length;

      if (combined.length < 20 || avgConfidence < MIN_CONFIDENCE) {
        setOcrError(
          "We could not read text from this image. Try a clearer screenshot, or use the Paste Text tab instead."
        );
      }
      setImageText(combined);
    } catch {
      setOcrError(
        "We could not read text from this image. Try a clearer screenshot, or use the Paste Text tab instead."
      );
    } finally {
      setOcrRunning(false);
    }
  }

  async function handleSaveText() {
    setSavingText(true);
    try {
      const saved = await saveContent(courseId, {
        sourceType: "text",
        rawText: pasteText,
      });
      showToast("Content saved", "success");
      setSavedUploadId(saved.id);
      setPasteText("");
      router.refresh();
    } catch {
      showToast("Could not save content", "danger");
    } finally {
      setSavingText(false);
    }
  }

  async function handleSaveImage() {
    setSavingImage(true);
    try {
      const filenames = images.map((image) => image.file.name).join(", ");
      const saved = await saveContent(courseId, {
        sourceType: "image",
        rawText: imageText,
        originalFilename: filenames || null,
      });
      showToast("Content saved", "success");
      setSavedUploadId(saved.id);
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setImages([]);
      setImageText("");
      setOcrError(null);
      router.refresh();
    } catch {
      showToast("Could not save content", "danger");
    } finally {
      setSavingImage(false);
    }
  }

  async function handleSaveFile() {
    setSavingFile(true);
    try {
      const saved = await saveContent(courseId, {
        sourceType: "text",
        rawText: fileText,
        originalFilename: fileName,
      });
      showToast("Content saved", "success");
      setSavedUploadId(saved.id);
      setFileText("");
      setFileName(null);
      router.refresh();
    } catch {
      showToast("Could not save content", "danger");
    } finally {
      setSavingFile(false);
    }
  }

  const charCount = pasteText.length;
  const tooShort = charCount > 0 && charCount < MIN_RECOMMENDED_CHARS;
  const tooLong = charCount > MAX_RECOMMENDED_CHARS;

  const fileCharCount = fileText.length;
  const fileTooShort = fileCharCount > 0 && fileCharCount < MIN_RECOMMENDED_CHARS;
  const fileTooLong = fileCharCount > MAX_RECOMMENDED_CHARS;

  return (
    <Card className="p-6">
      <div
        role="tablist"
        aria-label="Content source"
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background p-1"
      >
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => switchTab(value)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === value
                ? "bg-primary-subtle text-secondary"
                : "text-fg-secondary hover:text-fg"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="mt-6 space-y-3">
          <Textarea
            label="Study material"
            rows={12}
            placeholder="Paste your study material here..."
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-fg-muted">{charCount.toLocaleString()} characters</span>
            {tooShort && (
              <span className="text-warning">
                This is quite short — AI may not create good questions from it.
              </span>
            )}
            {tooLong && (
              <span className="text-warning">
                This is very long — consider splitting it into smaller uploads.
              </span>
            )}
          </div>
          <Button onClick={handleSaveText} loading={savingText} disabled={!pasteText.trim()}>
            Save content
          </Button>
        </div>
      )}

      {tab === "image" && (
        <div className="mt-6 space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary-faint" : "border-border hover:bg-surface-raised"
            )}
          >
            <Upload className="size-8 text-fg-muted" />
            <p className="text-sm font-medium text-fg">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-xs text-fg-muted">PNG, JPG, or WEBP — up to 10MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-1">
              {images.map((image, index) => (
                <div key={image.previewUrl} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="size-20 rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove ${image.file.name}`}
                    className="absolute -top-2.5 -right-2.5 flex size-8 items-center justify-center rounded-full bg-danger text-white hover:opacity-90"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <Button
              variant="secondary"
              onClick={runOcr}
              loading={ocrRunning}
              disabled={ocrRunning}
            >
              <Sparkles className="size-4" /> Extract text
            </Button>
          )}

          {ocrRunning && (
            <div
              className="space-y-2"
              role="progressbar"
              aria-valuenow={ocrProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <p className="text-sm text-fg-secondary">
                Reading your image, this may take up to 20 seconds...
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {ocrError && <p className="text-sm text-danger">{ocrError}</p>}

          {(imageText || !ocrRunning) && images.length > 0 && (
            <Textarea
              label="Extracted text (edit as needed before saving)"
              rows={10}
              placeholder="Extracted text will appear here once you click Extract text..."
              value={imageText}
              onChange={(event) => setImageText(event.target.value)}
            />
          )}

          <Button
            onClick={handleSaveImage}
            loading={savingImage}
            disabled={!imageText.trim()}
          >
            Save content
          </Button>
        </div>
      )}

      {tab === "file" && (
        <div className="mt-6 space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setFileDragOver(true);
            }}
            onDragLeave={() => setFileDragOver(false)}
            onDrop={handleTextFileDrop}
            onClick={() => textFileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") textFileInputRef.current?.click();
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              fileDragOver
                ? "border-primary bg-primary-faint"
                : "border-border hover:bg-surface-raised"
            )}
          >
            <Upload className="size-8 text-fg-muted" />
            <p className="text-sm font-medium text-fg">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-fg-muted">
              .TXT or .MD up to 2MB, or .PDF up to 10MB
            </p>
            <input
              ref={textFileInputRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              className="hidden"
              onChange={handleTextFileInputChange}
            />
          </div>

          {readingFile && <p className="text-sm text-fg-secondary">Reading your file...</p>}
          {fileReadError && <p className="text-sm text-danger">{fileReadError}</p>}
          {fileName && !readingFile && (
            <p className="text-sm text-fg-secondary">Loaded: {fileName}</p>
          )}

          {(fileText || fileName) && (
            <>
              <Textarea
                label="File content (edit as needed before saving)"
                rows={12}
                value={fileText}
                onChange={(event) => setFileText(event.target.value)}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-fg-muted">{fileCharCount.toLocaleString()} characters</span>
                {fileTooShort && (
                  <span className="text-warning">
                    This is quite short — AI may not create good questions from it.
                  </span>
                )}
                {fileTooLong && (
                  <span className="text-warning">
                    This is very long — consider splitting it into smaller uploads.
                  </span>
                )}
              </div>
            </>
          )}

          <Button onClick={handleSaveFile} loading={savingFile} disabled={!fileText.trim()}>
            Save content
          </Button>
        </div>
      )}

      {savedUploadId && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-success/30 bg-success-bg p-4">
          <p className="text-sm font-medium text-success">Content saved.</p>
          <Link
            href={`/dashboard/quizzes/generate?courseId=${courseId}&contentId=${savedUploadId}`}
            className={buttonVariants({ size: "sm" })}
          >
            Generate questions
          </Link>
        </div>
      )}
    </Card>
  );
}
