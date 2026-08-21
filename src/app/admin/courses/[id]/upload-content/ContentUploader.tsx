"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, ImageIcon, Sparkles } from "lucide-react";
import { Button, Card, Textarea, buttonVariants, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveContent } from "./actions";

const TABS = [
  { value: "text", label: "Paste Text", icon: FileText },
  { value: "image", label: "Upload Image", icon: ImageIcon },
] as const;
type Tab = (typeof TABS)[number]["value"];

const MIN_RECOMMENDED_CHARS = 200;
const MAX_RECOMMENDED_CHARS = 50_000;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Tesseract confidence is 0-100. Handwriting and blank/blurry images
// consistently score well below this; clear printed text scores much higher.
const MIN_CONFIDENCE = 35;

interface StagedImage {
  file: File;
  previewUrl: string;
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

  const charCount = pasteText.length;
  const tooShort = charCount > 0 && charCount < MIN_RECOMMENDED_CHARS;
  const tooLong = charCount > MAX_RECOMMENDED_CHARS;

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
                ? "bg-primary-subtle text-primary"
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
            <div className="flex flex-wrap gap-3">
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
                    className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-danger text-white hover:opacity-90"
                  >
                    <X className="size-3.5" />
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

      {savedUploadId && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-success/30 bg-success-bg p-4">
          <p className="text-sm font-medium text-success">Content saved.</p>
          <Link
            href={`/admin/quizzes/generate?courseId=${courseId}&contentId=${savedUploadId}`}
            className={buttonVariants({ size: "sm" })}
          >
            Generate questions
          </Link>
        </div>
      )}
    </Card>
  );
}
