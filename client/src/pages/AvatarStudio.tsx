import { useState, useRef, useCallback } from "react";
import { useLang } from "@/contexts/LangContext";
import { UserCircle2, Video, Upload, X, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  file: File;
  previewUrl: string;
}

function DropZone({
  accept,
  maxSizeMB,
  label,
  labelAr,
  hint,
  hintAr,
  icon: Icon,
  uploaded,
  onUpload,
  onClear,
  isRTL,
  testId,
}: {
  accept: string;
  maxSizeMB: number;
  label: string;
  labelAr: string;
  hint: string;
  hintAr: string;
  icon: React.ElementType;
  uploaded: UploadedFile | null;
  onUpload: (f: UploadedFile) => void;
  onClear: () => void;
  isRTL: boolean;
  testId: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    const acceptedTypes = accept.split(",").map((s) => s.trim());
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
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

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const err = validate(file);
      if (err) { setError(err); return; }
      const previewUrl = URL.createObjectURL(file);
      onUpload({ file, previewUrl });
    },
    [accept, maxSizeMB, isRTL, onUpload]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const isVideo = accept.includes(".mp4") || accept.includes(".mov");

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10`}>
          <Icon className="w-3.5 h-3.5 text-violet-400" />
        </span>
        <div className={isRTL ? "text-right" : "text-left"}>
          <p className="text-sm font-semibold text-foreground">{isRTL ? labelAr : label}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? hintAr : hint}</p>
        </div>
      </div>

      {uploaded ? (
        <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/30 group">
          {isVideo ? (
            <video
              src={uploaded.previewUrl}
              controls
              className="w-full max-h-52 object-contain bg-black"
              data-testid={`preview-video-${testId}`}
            />
          ) : (
            <img
              src={uploaded.previewUrl}
              alt="preview"
              className="w-full max-h-52 object-contain bg-muted/50"
              data-testid={`preview-image-${testId}`}
            />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              data-testid={`button-clear-${testId}`}
              onClick={onClear}
              className="w-9 h-9 rounded-full bg-destructive/90 flex items-center justify-center hover:bg-destructive transition-colors shadow-lg"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className={`px-3 py-2 flex items-center gap-2 border-t border-border/40 bg-background/60 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{uploaded.file.name}</span>
            <span className="text-xs text-muted-foreground ms-auto shrink-0">
              {(uploaded.file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      ) : (
        <div
          data-testid={`dropzone-${testId}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
            ${dragging
              ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
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
            data-testid={`input-file-${testId}`}
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-violet-500/20" : "bg-muted/60"}`}>
              <Upload className={`w-5 h-5 transition-colors ${dragging ? "text-violet-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isRTL ? "اسحب وأفلت، أو انقر للتصفح" : "Drag & drop or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? `${accept} · الحد الأقصى ${maxSizeMB} ميغابايت` : `${accept} · max ${maxSizeMB} MB`}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={`flex items-center gap-2 text-destructive text-xs ${isRTL ? "flex-row-reverse" : ""}`} data-testid={`error-${testId}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default function AvatarStudio() {
  const { t, isRTL } = useLang();

  const [refImage, setRefImage] = useState<UploadedFile | null>(null);
  const [drivingVideo, setDrivingVideo] = useState<UploadedFile | null>(null);

  const canGenerate = refImage !== null && drivingVideo !== null;

  const handleGenerate = () => {
    alert(isRTL ? "قريباً" : "Coming soon");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>

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
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {isRTL ? "استوديو الأفاتار" : "Avatar Studio"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "ارفع صورة مرجعية وفيديو حركة لإنشاء أفاتار ناطق بالذكاء الاصطناعي"
              : "Upload a reference image and a driving video to generate a talking AI avatar"}
          </p>
        </div>
      </div>

      {/* Upload cards */}
      <div className="grid gap-6">
        {/* Reference image */}
        <div className="glass-card rounded-2xl p-5 border border-border/60 bg-card/60 space-y-4">
          <DropZone
            accept=".jpg,.png"
            maxSizeMB={10}
            label="Reference Image"
            labelAr="الصورة المرجعية"
            hint="The face / person to animate · JPG or PNG · max 10 MB"
            hintAr="الوجه أو الشخص المراد تحريكه · JPG أو PNG · الحد 10 ميغابايت"
            icon={UserCircle2}
            uploaded={refImage}
            onUpload={setRefImage}
            onClear={() => setRefImage(null)}
            isRTL={isRTL}
            testId="reference-image"
          />
        </div>

        {/* Driving video */}
        <div className="glass-card rounded-2xl p-5 border border-border/60 bg-card/60 space-y-4">
          <DropZone
            accept=".mp4,.mov"
            maxSizeMB={50}
            label="Driving Video"
            labelAr="فيديو الحركة"
            hint="The motion source to transfer · MP4 or MOV · max 50 MB"
            hintAr="مصدر الحركة للنقل · MP4 أو MOV · الحد 50 ميغابايت"
            icon={Video}
            uploaded={drivingVideo}
            onUpload={setDrivingVideo}
            onClear={() => setDrivingVideo(null)}
            isRTL={isRTL}
            testId="driving-video"
          />
        </div>
      </div>

      {/* Status hint */}
      {!canGenerate && (
        <p className={`text-xs text-muted-foreground text-center ${isRTL ? "text-right" : ""}`}>
          {isRTL
            ? "يرجى رفع كلا الملفين لتفعيل زر التوليد"
            : "Upload both files above to enable generation"}
        </p>
      )}

      {/* Generate button */}
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
        <Sparkles className="w-4 h-4" />
        {isRTL ? "توليد الفيديو" : "Generate Avatar Video"}
      </Button>
    </div>
  );
}
