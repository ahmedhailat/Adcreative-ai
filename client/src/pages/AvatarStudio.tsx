import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "@/contexts/LangContext";
import {
  UserCircle2, Video, Upload, X, Sparkles, AlertCircle,
  CheckCircle2, Loader2, Clock, Download, RefreshCw, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, resolveUrl } from "@/lib/queryClient";

// ─── types ───────────────────────────────────────────────────────────────────

type FileUpload =
  | { state: "empty" }
  | { state: "uploading"; localUrl: string; fileName: string }
  | { state: "ready"; localUrl: string; serverUrl: string; fileName: string; fileSize: number }
  | { state: "error"; message: string; localUrl?: string; fileName?: string };

type JobPhase =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "polling"; jobId: number; status: "pending" | "processing" }
  | { phase: "done"; jobId: number; outputVideoUrl: string }
  | { phase: "failed"; jobId: number; errorMessage: string };

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({
  accept,
  maxSizeMB,
  label,
  labelAr,
  hint,
  hintAr,
  icon: Icon,
  upload,
  onFile,
  onClear,
  isRTL,
  testId,
  disabled,
}: {
  accept: string;
  maxSizeMB: number;
  label: string;
  labelAr: string;
  hint: string;
  hintAr: string;
  icon: React.ElementType;
  upload: FileUpload;
  onFile: (file: File) => void;
  onClear: () => void;
  isRTL: boolean;
  testId: string;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    const exts = accept.split(",").map((s) => s.trim().toLowerCase());
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!exts.includes(ext)) {
      return isRTL
        ? `نوع الملف غير مدعوم. المسموح به: ${accept}`
        : `Unsupported file type. Allowed: ${accept}`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return isRTL
        ? `حجم الملف يتجاوز ${maxSizeMB} ميغابايت`
        : `File exceeds ${maxSizeMB} MB limit`;
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) {
      onFile(Object.assign(file, { __validationError: err }));
      return;
    }
    onFile(file);
  }, [accept, maxSizeMB, isRTL]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const isVideo = accept.includes(".mp4") || accept.includes(".mov");
  const isUploading = upload.state === "uploading";
  const isReady = upload.state === "ready";
  const hasError = upload.state === "error";

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10">
          <Icon className="w-3.5 h-3.5 text-violet-400" />
        </span>
        <div className={isRTL ? "text-right" : "text-left"}>
          <p className="text-sm font-semibold text-foreground">{isRTL ? labelAr : label}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? hintAr : hint}</p>
        </div>
        {isReady && (
          <div className={`${isRTL ? "mr-auto" : "ml-auto"} flex items-center gap-1 text-green-400 text-xs font-medium`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isRTL ? "جاهز" : "Ready"}
          </div>
        )}
        {isUploading && (
          <div className={`${isRTL ? "mr-auto" : "ml-auto"} flex items-center gap-1 text-violet-400 text-xs font-medium`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isRTL ? "جارٍ الرفع…" : "Uploading…"}
          </div>
        )}
      </div>

      {isReady && upload.state === "ready" ? (
        <div className="relative rounded-2xl overflow-hidden border border-green-500/30 bg-muted/30 group">
          {isVideo ? (
            <video
              src={upload.localUrl}
              controls
              className="w-full max-h-52 object-contain bg-black"
              data-testid={`preview-video-${testId}`}
            />
          ) : (
            <img
              src={upload.localUrl}
              alt="preview"
              className="w-full max-h-52 object-contain bg-muted/50"
              data-testid={`preview-image-${testId}`}
            />
          )}
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                data-testid={`button-clear-${testId}`}
                onClick={onClear}
                className="w-9 h-9 rounded-full bg-destructive/90 flex items-center justify-center hover:bg-destructive transition-colors shadow-lg"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          <div className={`px-3 py-2 flex items-center gap-2 border-t border-green-500/20 bg-background/60 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{upload.fileName}</span>
            <span className="text-xs text-muted-foreground ms-auto shrink-0">
              {(upload.fileSize / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      ) : (
        <div
          data-testid={`dropzone-${testId}`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
            ${disabled ? "opacity-50 cursor-not-allowed" : isUploading ? "cursor-wait" : "cursor-pointer"}
            ${dragging && !disabled
              ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
              : hasError
                ? "border-destructive/50 bg-destructive/5"
                : isUploading
                  ? "border-violet-500/40 bg-violet-500/5"
                  : "border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5 bg-muted/20"
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            className="hidden"
            disabled={disabled || isUploading}
            data-testid={`input-file-${testId}`}
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              isUploading ? "bg-violet-500/20" : dragging ? "bg-violet-500/20" : "bg-muted/60"
            }`}>
              {isUploading
                ? <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                : <Upload className={`w-5 h-5 transition-colors ${dragging ? "text-violet-400" : "text-muted-foreground"}`} />
              }
            </div>
            <div>
              {isUploading ? (
                <p className="text-sm font-medium text-violet-400">
                  {isRTL ? "جارٍ رفع الملف…" : "Uploading file…"}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {isRTL ? "اسحب وأفلت، أو انقر للتصفح" : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? `${accept} · الحد الأقصى ${maxSizeMB} ميغابايت` : `${accept} · max ${maxSizeMB} MB`}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {hasError && upload.state === "error" && (
        <div className={`flex items-center gap-2 text-destructive text-xs ${isRTL ? "flex-row-reverse" : ""}`} data-testid={`error-${testId}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{upload.message}</span>
        </div>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const cfg: Record<string, { icon: React.ElementType; color: string; labelEn: string; labelAr: string }> = {
    pending:    { icon: Clock,        color: "text-amber-400 bg-amber-400/10 border-amber-400/20",   labelEn: "Pending",    labelAr: "قيد الانتظار" },
    processing: { icon: Loader2,      color: "text-violet-400 bg-violet-400/10 border-violet-400/20", labelEn: "Processing", labelAr: "قيد المعالجة" },
    done:       { icon: CheckCircle2, color: "text-green-400 bg-green-400/10 border-green-400/20",   labelEn: "Done",       labelAr: "مكتمل" },
    failed:     { icon: AlertCircle,  color: "text-destructive bg-destructive/10 border-destructive/20", labelEn: "Failed", labelAr: "فشل" },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  const spin = status === "processing";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${c.color}`}>
      <Icon className={`w-3.5 h-3.5 ${spin ? "animate-spin" : ""}`} />
      {isRTL ? c.labelAr : c.labelEn}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AvatarStudio() {
  const { isRTL } = useLang();
  const { toast } = useToast();

  const [imageUpload, setImageUpload] = useState<FileUpload>({ state: "empty" });
  const [videoUpload, setVideoUpload] = useState<FileUpload>({ state: "empty" });
  const [jobState, setJobState] = useState<JobPhase>({ phase: "idle" });
  const [credits, setCredits] = useState<number | null>(null);

  const busy = jobState.phase === "creating" || jobState.phase === "polling";

  // ── fetch credits on mount ──
  useEffect(() => {
    fetch("/api/avatar/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCredits(d.balance); })
      .catch(() => {});
  }, []);

  // ── polling ──
  useEffect(() => {
    if (jobState.phase !== "polling") return;
    const id = jobState.jobId;
    const tick = setInterval(async () => {
      try {
        const res = await fetch(`/api/avatar/job/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(tick);
          setJobState({ phase: "done", jobId: id, outputVideoUrl: data.outputVideoUrl });
        } else if (data.status === "failed") {
          clearInterval(tick);
          setJobState({ phase: "failed", jobId: id, errorMessage: data.errorMessage || (isRTL ? "فشل التوليد" : "Generation failed") });
        } else {
          setJobState({ phase: "polling", jobId: id, status: data.status });
        }
      } catch {/* ignore */}
    }, 3000);
    return () => clearInterval(tick);
  }, [jobState.phase === "polling" ? jobState.jobId : null]);

  // ── file upload helper ──
  const uploadFile = async (
    file: File,
    type: "image" | "video",
    setter: React.Dispatch<React.SetStateAction<FileUpload>>,
  ) => {
    const localUrl = URL.createObjectURL(file);
    setter({ state: "uploading", localUrl, fileName: file.name });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res = await fetch("/api/avatar/upload-input", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        setter({ state: "error", message: err.message || "Upload failed" });
        return;
      }
      const { url } = await res.json();
      setter({ state: "ready", localUrl, serverUrl: url, fileName: file.name, fileSize: file.size });
    } catch {
      setter({ state: "error", message: isRTL ? "فشل رفع الملف" : "Upload failed" });
    }
  };

  const handleImageFile = (file: File) => {
    const ve = (file as any).__validationError;
    if (ve) { setImageUpload({ state: "error", message: ve }); return; }
    uploadFile(file, "image", setImageUpload);
  };

  const handleVideoFile = (file: File) => {
    const ve = (file as any).__validationError;
    if (ve) { setVideoUpload({ state: "error", message: ve }); return; }
    uploadFile(file, "video", setVideoUpload);
  };

  // -- script (replaces driving video) --
  const [script, setScript] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);

  const handleAiGenerateScript = () => {
    if (!productName.trim() || !productDescription.trim()) return;
    setGeneratingScript(true);
    const greeting = isRTL ? "مرحباً! أقدم لكم " : "Hi! Let me introduce ";
    setScript(greeting + productName + ". " + productDescription);
    setGeneratingScript(false);
  };

  const handleGenerate = async () => {
    if (imageUpload.state !== "ready") return;
    if (!script.trim() && (!productName.trim() || !productDescription.trim())) return;
    setJobState({ phase: "creating" });
    try {
      const res = await fetch(resolveUrl("/api/avatar/create-job-from-script"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          inputImageUrl: imageUpload.serverUrl,
          script: script.trim() || undefined,
          productName: productName.trim() || undefined,
          productDescription: productDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        toast({ title: isRTL ? "رصيد غير كافِ" : "Insufficient credits", description: data.message, variant: "destructive" });
        setJobState({ phase: "idle" });
        return;
      }
      if (!res.ok) throw new Error(data.message || "Failed");
      if (data.script) setScript(data.script);
      setCredits((c) => (c !== null ? c - 0 : null));
      setJobState({ phase: "polling", jobId: data.job_id, status: "pending" });
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
      setJobState({ phase: "idle" });
    }
  };

  const resetAll = () => {
    setImageUpload({ state: "empty" });
    setScript("");
    setProductName("");
    setProductDescription("");
    setJobState({ phase: "idle" });
  };

  const canGenerate =
    imageUpload.state === "ready" &&
    (script.trim().length > 0 || (productName.trim().length > 0 && productDescription.trim().length > 0)) &&
    !busy;
  const jobActive = jobState.phase !== "idle" && jobState.phase !== "creating";

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Page header */}
      <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(262,83%,60%), hsl(280,70%,52%))",
            boxShadow: "0 8px 24px hsl(262,83%,50%/0.3)",
          }}
        >
          <UserCircle2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {isRTL ? "استوديو الأفاتار" : "Avatar Studio"}
            </h1>
            {credits !== null && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold" data-testid="text-credits-balance">
                <Coins className="w-3 h-3" />
                <span>{credits} {isRTL ? "رصيد" : "credits"}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "ارفع صورة مرجعية وفيديو حركة لإنشاء أفاتار ناطق"
              : "Upload a reference image and write a script to create a talking avatar"}
          </p>
        </div>
      </div>

      {/* Upload cards — hidden once job is running or complete */}
      {!jobActive && (
        <div className="grid gap-5">
          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-card/60">
            <DropZone
              accept=".jpg,.png"
              maxSizeMB={10}
              label="Reference Image"
              labelAr="الصورة المرجعية"
              hint="The face to animate · JPG or PNG · max 10 MB"
              hintAr="الوجه المراد تحريكه · JPG أو PNG · الحد 10 ميغابايت"
              icon={UserCircle2}
              upload={imageUpload}
              onFile={handleImageFile}
              onClear={() => setImageUpload({ state: "empty" })}
              isRTL={isRTL}
              testId="reference-image"
              disabled={busy}
            />
          </div>

          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-card/60">
          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-card/60 space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                {isRTL ? "اسم المنتج" : "Product Name"}
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm"
                placeholder={isRTL ? "مثال: نيون" : "e.g. Neon"}
                data-testid="input-product-name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                {isRTL ? "وصف المنتج" : "Product Description"}
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                disabled={busy}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm resize-none"
                placeholder={isRTL ? "وصف قصير للمنتج" : "Short product description"}
                data-testid="input-product-description"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAiGenerateScript}
              disabled={busy || generatingScript || !productName.trim() || !productDescription.trim()}
              data-testid="button-ai-generate-script"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingScript
                ? (isRTL ? "جارٍ التوليد..." : "Generating...")
                : (isRTL ? "توليد نص بالذكاء الاصطقاعي" : "Generate Script with AI")}
            </Button>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                {isRTL ? "النص (يمكن تعديله)" : "Script (editable)"}
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                disabled={busy}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm resize-none"
                placeholder={isRTL ? "سيظهر النص هنا، أو اكتبه بنفسك" : "Script will appear here, or write your own"}
                data-testid="textarea-script"
              />
            </div>
          </div>
      )}

      {/* Job status card */}
      {jobActive && (
        <div className="glass-card rounded-2xl p-6 border border-border/60 bg-card/60 space-y-5" data-testid="card-job-status">
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <p className="text-sm font-semibold text-foreground">
              {isRTL ? "حالة المهمة" : "Job Status"}
            </p>
            {jobState.phase === "polling" && (
              <StatusBadge status={jobState.status} isRTL={isRTL} />
            )}
            {jobState.phase === "done" && <StatusBadge status="done" isRTL={isRTL} />}
            {jobState.phase === "failed" && <StatusBadge status="failed" isRTL={isRTL} />}
          </div>

          {/* Progress steps */}
          <div className="space-y-2">
            {[
              { key: "pending",    labelEn: "Job queued",     labelAr: "المهمة في قائمة الانتظار" },
              { key: "processing", labelEn: "AI processing",  labelAr: "معالجة الذكاء الاصطناعي" },
              { key: "done",       labelEn: "Video ready",    labelAr: "الفيديو جاهز" },
            ].map(({ key, labelEn, labelAr }) => {
              const currentStatus = jobState.phase === "polling" ? jobState.status
                : jobState.phase === "done" ? "done"
                : jobState.phase === "failed" ? "failed"
                : "pending";
              const order = ["pending", "processing", "done"];
              const stepIdx = order.indexOf(key);
              const curIdx = order.indexOf(currentStatus === "failed" ? "processing" : currentStatus);
              const isDone = stepIdx < curIdx || currentStatus === "done";
              const isActive = stepIdx === curIdx && currentStatus !== "done";
              const isFailed = currentStatus === "failed" && stepIdx === 1;

              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isRTL ? "flex-row-reverse" : ""} ${
                  isActive ? "bg-violet-500/10 border border-violet-500/20"
                  : isDone ? "bg-green-500/5"
                  : "opacity-40"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isFailed ? "bg-destructive/20"
                    : isDone ? "bg-green-500/20"
                    : isActive ? "bg-violet-500/20"
                    : "bg-muted/40"
                  }`}>
                    {isFailed ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                      : isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      : isActive ? <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    }
                  </div>
                  <span className={`text-sm ${isActive ? "text-foreground font-medium" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    {isRTL ? labelAr : labelEn}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error message */}
          {jobState.phase === "failed" && (
            <div className={`flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{jobState.errorMessage}</p>
            </div>
          )}

          {/* Output video */}
          {jobState.phase === "done" && jobState.outputVideoUrl && (
            <div className="space-y-3">
              <video
                src={jobState.outputVideoUrl}
                controls
                className="w-full rounded-xl bg-black max-h-64"
                data-testid="video-output"
              />
              <a
                href={jobState.outputVideoUrl}
                download="avatar-output.mp4"
                data-testid="button-download-output"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                {isRTL ? "تنزيل الفيديو" : "Download Video"}
              </a>
            </div>
          )}

          {/* Try again / new job */}
          {(jobState.phase === "done" || jobState.phase === "failed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              data-testid="button-new-job"
              className="w-full gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isRTL ? "مهمة جديدة" : "New Job"}
            </Button>
          )}
        </div>
      )}

      {/* Status hint */}
      {!jobActive && !canGenerate && (
        <p className={`text-xs text-muted-foreground text-center ${isRTL ? "text-right" : ""}`}>
          {isRTL ? "يرجى رفع كلا الملفين لتفعيل زر التوليد" : "Upload both files above to enable generation"}
        </p>
      )}

      {/* Generate button */}
      {!jobActive && (
        <Button
          data-testid="button-generate-avatar"
          onClick={handleGenerate}
          disabled={!canGenerate}
          size="lg"
          className={`w-full h-12 rounded-2xl font-bold text-sm gap-2 shadow-lg transition-all duration-200
            ${canGenerate
              ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.01] text-white"
              : "opacity-40 cursor-not-allowed"
            }
          `}
        >
          {jobState.phase === "creating"
            ? <><Loader2 className="w-4 h-4 animate-spin" />{isRTL ? "جارٍ الإنشاء…" : "Creating…"}</>
            : <><Sparkles className="w-4 h-4" />{isRTL ? "توليد الفيديو" : "Generate Avatar Video"}</>
          }
        </Button>
      )}
    </div>
  );
}
