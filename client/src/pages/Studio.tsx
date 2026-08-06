import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { AD_FORMATS, type GenerateCreativeInput } from "@shared/schema";
import { useBrands } from "@/hooks/use-brands";
import { useGenerateCreative, useCreative, useUploadVideo, useUploadImagesVideo } from "@/hooks/use-creatives";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiFacebook, SiInstagram, SiGoogle, SiTiktok, SiX } from "react-icons/si";
import { Linkedin as SiLinkedin } from "lucide-react";
import {
  ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Wand2,
  Download, Sparkles, Library, Image as ImageIcon, Video, Upload,
  Crown, Zap, Film, Lock, Play, RefreshCw, Star, TrendingUp,
  Layers, Target, Eye, User2, FileText, Images, X as XIcon, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_ICONS: Record<string, any> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  google: SiGoogle,
  tiktok: SiTiktok,
  linkedin: SiLinkedin,
  twitter: SiX,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877f2",
  instagram: "#e1306c",
  google: "#4285f4",
  tiktok: "#ff0050",
  linkedin: "#0077b5",
  twitter: "#1da1f2",
};

type MediaMode = "image" | "video-upload" | "video-ai" | "video-images" | "video-avatar";

const VIDEO_STEPS = [
  { icon: Wand2,   label: "Writing ad copy", labelAr: "كتابة النص الإعلاني" },
  { icon: ImageIcon, label: "Generating image", labelAr: "توليد الصورة" },
  { icon: Film,    label: "Rendering video", labelAr: "تصيير الفيديو" },
  { icon: Sparkles, label: "Finalizing", labelAr: "الإنهاء" },
];
const IMAGE_STEPS = [
  { icon: Wand2,    label: "Writing ad copy", labelAr: "كتابة النص الإعلاني" },
  { icon: ImageIcon, label: "Generating image", labelAr: "توليد الصورة" },
  { icon: Star,     label: "Scoring performance", labelAr: "تقييم الأداء" },
  { icon: Sparkles, label: "Finalizing", labelAr: "الإنهاء" },
];

function ProBadge() {
  return (
    <span className="absolute top-2.5 end-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide shadow">
      PRO
    </span>
  );
}

function UpgradeBanner({ message, ctaLabel }: { message: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-yellow-500" /> Pro Feature
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
      <Button size="sm" className="shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 border-0" asChild>
        <Link href="/pricing">
          <Zap className="w-3 h-3 me-1" /> {ctaLabel}
        </Link>
      </Button>
    </div>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
      done   ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30"
             : active ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
             : "bg-card border-border text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

export default function Studio() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const generateCreative = useGenerateCreative();
  const uploadVideo = useUploadVideo();
  const uploadImagesVideo = useUploadImagesVideo();

  const [step, setStep] = useState(1);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const { data: resultCreative } = useCreative(generatingId);

  const [mediaMode, setMediaMode] = useState<MediaMode>("image");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Image-slideshow state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);
  const productDescRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<Partial<GenerateCreativeInput>>({ goal: "awareness" });

  const userPlan = (user as any)?.plan ?? "free";
  const isPro = userPlan === "pro" || userPlan === "business";

  const STEP_LABELS = [t.studio.step1, t.studio.step2, t.studio.step3];

  // Animate progress steps during generation
  useEffect(() => {
    if (step !== 3 || !generatingId) return;
    if (resultCreative?.status === "ready" || resultCreative?.status === "failed") return;

    const steps = mediaMode === "video-ai" ? VIDEO_STEPS.length : IMAGE_STEPS.length;
    const interval = mediaMode === "video-ai" ? 6000 : 3500;
    const timer = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, steps - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [step, generatingId, resultCreative?.status, mediaMode]);

  const handleImageFilesSelect = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!arr.length) {
      toast({ title: "Invalid files", description: "Please upload image files (JPG, PNG, WEBP).", variant: "destructive" });
      return;
    }
    const combined = [...imageFiles, ...arr].slice(0, 10);
    setImageFiles(combined);
    setImagePreviews(combined.map(f => URL.createObjectURL(f)));
  }, [imageFiles, toast]);

  const handleVideoFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please upload a video file (MP4, WebM, MOV).", variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 100MB.", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoFileSelect(file);
  }, [handleVideoFileSelect]);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.brandId) {
        toast({ title: t.studio.selectBrandFirst, description: t.studio.selectBrandFirstDesc, variant: "destructive" });
        return;
      }
      if (!formData.formatSize) {
        toast({ title: t.studio.selectAdFormat, description: t.studio.selectAdFormatDesc, variant: "destructive" });
        return;
      }
      // Avatar mode: go straight to Avatar Studio
      if (mediaMode === "video-avatar") {
        setLocation("/avatar-studio");
        return;
      }
    }
    if (step === 2) {
      if (!formData.productName) {
        toast({ title: t.studio.productNameRequired, description: t.studio.productNameRequiredDesc, variant: "destructive" });
        productNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => productNameRef.current?.focus(), 400);
        return;
      }
      if (!formData.productDescription) {
        toast({ title: t.studio.productDescRequired, description: t.studio.productDescRequiredDesc, variant: "destructive" });
        productDescRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => productDescRef.current?.focus(), 400);
        return;
      }
      if (mediaMode === "video-upload" && !videoFile) {
        toast({ title: "No video selected", description: "Please select a video file to upload.", variant: "destructive" });
        return;
      }
      if (mediaMode === "video-images" && imageFiles.length === 0) {
        toast({ title: "No images selected", description: "Please upload at least one image to create a slideshow video.", variant: "destructive" });
        return;
      }
      handleGenerate();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleGenerate = async () => {
    try {
      setProgressStep(0);
      const autoTitle = formData.title?.trim() || `${formData.productName ?? ""} – ${formData.formatName ?? ""}`;
      const base = {
        brandId: formData.brandId!,
        platform: formData.platform!,
        formatSize: formData.formatSize!,
        formatName: formData.formatName!,
        productName: formData.productName!,
        productDescription: formData.productDescription!,
        goal: formData.goal!,
        targetAudience: formData.targetAudience,
        title: autoTitle,
      };

      if (mediaMode === "video-upload" && videoFile) {
        const result = await uploadVideo.mutateAsync({ file: videoFile, ...base });
        setGeneratingId(result.id);
        setStep(3);
      } else if (mediaMode === "video-images" && imageFiles.length > 0) {
        const result = await uploadImagesVideo.mutateAsync({ files: imageFiles, ...base });
        setGeneratingId(result.id);
        setStep(3);
      } else if (mediaMode === "video-ai") {
        const created = await generateCreative.mutateAsync({ ...base, mediaType: "video" } as any);
        setGeneratingId(created.id);
        setStep(3);
      } else {
        const created = await generateCreative.mutateAsync(base);
        setGeneratingId(created.id);
        setStep(3);
      }
    } catch (e: any) {
      toast({ title: t.studio.generationFailed, description: e.message, variant: "destructive" });
    }
  };

  const handleDownload = async () => {
    if (!resultCreative) return;
    const isVideo = resultCreative.mediaType === "video";
    const src = isVideo ? resultCreative.videoUrl : resultCreative.imageData;
    if (!src) return;
    const filename = `${resultCreative.title.replace(/\s+/g, "-").toLowerCase()}.${isVideo ? "mp4" : "png"}`;
    // For video URLs (/api/video/xxx.mp4) fetch as blob so download works cross-origin
    if (isVideo && src.startsWith("/")) {
      const blob = await fetch(src).then(r => r.blob());
      const url  = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const a = document.createElement("a");
      a.href = src; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
    }
  };

  const handleCreateAnother = () => {
    setStep(1);
    setGeneratingId(null);
    setFormData({ goal: "awareness" });
    setMediaMode("image");
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setProgressStep(0);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
  };

  const isPending = generateCreative.isPending || uploadVideo.isPending || uploadImagesVideo.isPending;
  const resultIsVideo = resultCreative?.mediaType === "video";
  const progressSteps = (mediaMode === "video-ai" || mediaMode === "video-images") ? VIDEO_STEPS : IMAGE_STEPS;

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">

      {/* ── Header ── */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-1 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" /> AI Creative Studio
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t.studio.title}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">{t.studio.subtitle}</p>
      </div>

      {/* ── Step Indicator ── */}
      <div className="flex items-center justify-center gap-0 max-w-sm mx-auto">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <StepDot n={s} active={step === s} done={step > s} />
                <span className={`text-[11px] font-semibold whitespace-nowrap ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500 ${step > s ? "bg-emerald-500" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════ STEP 1 ════════════════ */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

            {/* Brand Selection */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">1</span>
                </div>
                <h2 className="font-bold text-lg">{t.studio.selectBrand}</h2>
                {formData.brandId
                  ? <CheckCircle2 className="ms-auto w-5 h-5 text-emerald-500" />
                  : <span className="ms-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{t.studio.pickOne}</span>
                }
              </div>

              {brandsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/60 animate-pulse rounded-xl" />)}
                </div>
              ) : !brands?.length ? (
                <div className="flex items-center gap-4 p-4 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{t.studio.noBrandsYet}</p>
                    <p className="text-xs opacity-80">{t.studio.noBrandsDesc}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setLocation("/brands")} className="border-amber-500/30 text-amber-500 shrink-0">
                    {t.studio.addBrand}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {brands.map((brand: any) => (
                    <button
                      key={brand.id}
                      data-testid={`brand-select-${brand.id}`}
                      onClick={() => setFormData({ ...formData, brandId: brand.id })}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        formData.brandId === brand.id
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/40 bg-background"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
                      >
                        {brand.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{brand.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{brand.industry}</p>
                      </div>
                      {formData.brandId === brand.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ad Format */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">2</span>
                </div>
                <h2 className="font-bold text-lg">{t.studio.selectFormat}</h2>
                {formData.formatSize
                  ? <CheckCircle2 className="ms-auto w-5 h-5 text-emerald-500" />
                  : <span className="ms-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{t.studio.pickOne}</span>
                }
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AD_FORMATS.map((format) => {
                  const Icon = PLATFORM_ICONS[format.platform] || SiFacebook;
                  const color = PLATFORM_COLORS[format.platform] || "#6366f1";
                  const isSelected = formData.formatSize === format.size && formData.platform === format.platform;
                  return (
                    <button
                      key={format.id}
                      data-testid={`format-select-${format.id}`}
                      onClick={() => setFormData({ ...formData, platform: format.platform, formatSize: format.size, formatName: format.name })}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border/50 hover:border-primary/40 hover:bg-muted/40 bg-background"
                      }`}
                    >
                      <Icon className="w-6 h-6" style={{ color }} />
                      <div className="text-center">
                        <p className="font-semibold text-xs leading-tight">{format.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{format.size}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media Type */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">3</span>
                </div>
                <h2 className="font-bold text-lg">{t.studio.mediaType}</h2>
              </div>

              {/* Image option */}
              <button
                onClick={() => setMediaMode("image")}
                data-testid="media-type-image"
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  mediaMode === "image" ? "border-primary bg-primary/5 shadow-md" : "border-border/50 hover:border-primary/40 bg-background"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${mediaMode === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm">{t.studio.image}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">صورة إعلانية بالذكاء الاصطناعي</p>
                </div>
                {mediaMode === "image" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>

              {/* Video section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> {t.studio.videoSectionLabel}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Video from images */}
                  <button
                    onClick={() => setMediaMode("video-images")}
                    data-testid="media-type-video-images"
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      mediaMode === "video-images"
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        : "border-border/50 hover:border-emerald-400/50 bg-background"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "video-images" ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                      <Images className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">{t.studio.videoFromImages}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.studio.videoFromImagesDesc}</p>
                    </div>
                    {mediaMode === "video-images" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>

                  {/* Avatar video */}
                  <button
                    onClick={() => setMediaMode("video-avatar")}
                    data-testid="media-type-video-avatar"
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      mediaMode === "video-avatar"
                        ? "border-pink-500 bg-pink-500/5 shadow-md shadow-pink-500/10"
                        : "border-border/50 hover:border-pink-400/50 bg-background"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "video-avatar" ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30" : "bg-muted text-muted-foreground"}`}>
                      <User2 className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">{t.studio.videoAvatar}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.studio.videoAvatarDesc}</p>
                    </div>
                    {mediaMode === "video-avatar" && <CheckCircle2 className="w-4 h-4 text-pink-500" />}
                  </button>

                  {/* Text to video */}
                  <button
                    onClick={() => setMediaMode("video-ai")}
                    data-testid="media-type-video-ai"
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      mediaMode === "video-ai"
                        ? "border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/10"
                        : "border-border/50 hover:border-indigo-400/50 bg-background"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "video-ai" ? "bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-muted text-muted-foreground"}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">{t.studio.videoFromText}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.studio.videoFromTextDesc}</p>
                    </div>
                    {mediaMode === "video-ai" && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                  </button>
                </div>

                {/* Mode-specific hints */}
                {mediaMode === "video-images" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Images className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-300">
                      ارفع حتى 10 صور ← سيتم تحويلها إلى فيديو سلايد شو احترافي بتأثيرات انتقال سلسة
                    </p>
                  </div>
                )}
                {mediaMode === "video-avatar" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                    <User2 className="w-4 h-4 text-pink-400 shrink-0" />
                    <p className="text-xs font-semibold text-pink-300">
                      فيديو مع أفاتار ناطق باستخدام D-ID — ارفع صورة وفيديو قيادي وسيتحدث الأفاتار
                    </p>
                  </div>
                )}
                {mediaMode === "video-ai" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Film className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-300 mb-0.5">3 unique AI-generated scenes → real 15-second MP4</p>
                      <p className="text-[11px] text-indigo-300/60">Scene 1: Product Hero · Scene 2: Lifestyle Shot · Scene 3: CTA Finale</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleNext}
                data-testid="button-next-step1"
                className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 gap-2"
              >
                {t.studio.continueBtn} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ════════════════ STEP 2 ════════════════ */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-1 border-b border-border/50">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-lg h-8 w-8 -ms-1">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-bold text-lg">{t.studio.describeProduct}</h2>
                <span className={`ms-auto text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  mediaMode === "image" ? "bg-blue-500/15 text-blue-400"
                  : mediaMode === "video-upload" ? "bg-purple-500/15 text-purple-400"
                  : mediaMode === "video-images" ? "bg-emerald-500/15 text-emerald-400"
                  : mediaMode === "video-avatar" ? "bg-pink-500/15 text-pink-400"
                  : "bg-indigo-500/15 text-indigo-400"
                }`}>
                  {mediaMode === "image" ? <><ImageIcon className="w-3 h-3" /> {t.studio.image}</>
                   : mediaMode === "video-upload" ? <><Upload className="w-3 h-3" /> Upload</>
                   : mediaMode === "video-images" ? <><Images className="w-3 h-3" /> {t.studio.videoFromImages}</>
                   : mediaMode === "video-avatar" ? <><User2 className="w-3 h-3" /> {t.studio.videoAvatar}</>
                   : <><FileText className="w-3 h-3" /> {t.studio.videoFromText}</>}
                </span>
              </div>

              <div className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    {t.studio.creativeTitle} <span className="text-muted-foreground font-normal">{t.studio.creativeTitleHint}</span>
                  </Label>
                  <Input
                    data-testid="input-creative-title"
                    placeholder={`e.g. ${formData.productName || "My Product"} – ${formData.formatName || "Instagram Post"}`}
                    value={formData.title || ""}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t.studio.productName} <span className="text-destructive">*</span></Label>
                    <Input
                      ref={productNameRef}
                      data-testid="input-product-name"
                      placeholder={t.studio.productNamePlaceholder}
                      value={formData.productName || ""}
                      onChange={e => setFormData({ ...formData, productName: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t.studio.campaignGoal}</Label>
                    <Select value={formData.goal} onValueChange={v => setFormData({ ...formData, goal: v })}>
                      <SelectTrigger className="h-11 rounded-xl" data-testid="select-campaign-goal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">{t.studio.goals.awareness}</SelectItem>
                        <SelectItem value="traffic">{t.studio.goals.traffic}</SelectItem>
                        <SelectItem value="leads">{t.studio.goals.leads}</SelectItem>
                        <SelectItem value="sales">{t.studio.goals.sales}</SelectItem>
                        <SelectItem value="engagement">{t.studio.goals.engagement}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t.studio.productDesc} <span className="text-destructive">*</span></Label>
                  <Textarea
                    ref={productDescRef}
                    data-testid="input-product-description"
                    placeholder={t.studio.productDescPlaceholder}
                    value={formData.productDescription || ""}
                    onChange={e => setFormData({ ...formData, productDescription: e.target.value })}
                    className="min-h-[110px] rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    {t.studio.targetAudience} <span className="text-muted-foreground font-normal">{t.studio.targetAudienceHint}</span>
                  </Label>
                  <Input
                    data-testid="input-target-audience"
                    placeholder={t.studio.targetAudiencePlaceholder}
                    value={formData.targetAudience || ""}
                    onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Video Upload Zone (legacy) */}
                {mediaMode === "video-upload" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t.studio.videoFile} <span className="text-destructive">*</span></Label>
                    {videoPreviewUrl ? (
                      <div className="rounded-xl border border-border overflow-hidden relative">
                        <video src={videoPreviewUrl} className="w-full max-h-56 object-cover" controls />
                        <Button
                          type="button" size="sm" variant="secondary"
                          className="absolute top-2 end-2"
                          onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                          isDragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/20"
                        }`}
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="video-drop-zone"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Video className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{t.studio.dragDropVideo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t.studio.videoFormats}</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoFileSelect(f); }}
                          data-testid="input-video-file"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Images Upload Zone — for slideshow video */}
                {mediaMode === "video-images" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Images className="w-4 h-4 text-emerald-500" />
                      {t.studio.uploadImages} <span className="text-destructive">*</span>
                      {imageFiles.length > 0 && (
                        <span className="ms-auto text-xs font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {t.studio.imagesSelected(imageFiles.length)}
                        </span>
                      )}
                    </Label>

                    {/* Image grid preview */}
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border/60">
                            <img src={src} alt={`img ${i+1}`} className="w-full h-full object-cover" />
                            <button
                              className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const next = imageFiles.filter((_, idx) => idx !== i);
                                URL.revokeObjectURL(imagePreviews[i]);
                                setImageFiles(next);
                                setImagePreviews(next.map(f => URL.createObjectURL(f)));
                              }}
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 start-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">{i+1}</span>
                          </div>
                        ))}
                        {imageFiles.length < 10 && (
                          <button
                            onClick={() => imagesInputRef.current?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-border/60 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-1 transition-colors"
                          >
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Add</span>
                          </button>
                        )}
                      </div>
                    )}

                    {imagePreviews.length === 0 && (
                      <div
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                          isImageDragOver ? "border-emerald-500 bg-emerald-500/5" : "border-border/60 hover:border-emerald-500/50 hover:bg-muted/20"
                        }`}
                        onDragOver={e => { e.preventDefault(); setIsImageDragOver(true); }}
                        onDragLeave={() => setIsImageDragOver(false)}
                        onDrop={e => { e.preventDefault(); setIsImageDragOver(false); if (e.dataTransfer.files.length) handleImageFilesSelect(e.dataTransfer.files); }}
                        onClick={() => imagesInputRef.current?.click()}
                        data-testid="images-drop-zone"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <Images className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{t.studio.dragDropImages}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t.studio.imagesFormats}</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={imagesInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => { if (e.target.files?.length) handleImageFilesSelect(e.target.files); }}
                      data-testid="input-images-files"
                    />
                  </div>
                )}

                {/* Avatar redirect panel */}
                {mediaMode === "video-avatar" && (
                  <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
                        <User2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base">{t.studio.avatarRedirectTitle}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t.studio.avatarRedirectDesc}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 border-0 shadow-lg shadow-pink-500/20 gap-2"
                      onClick={() => setLocation("/avatar-studio")}
                    >
                      <User2 className="w-4 h-4" />
                      {t.studio.goToAvatarStudio}
                      <ExternalLink className="w-3.5 h-3.5 ms-auto opacity-70" />
                    </Button>
                  </div>
                )}

                {/* AI Video info banner */}
                {mediaMode === "video-ai" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                    <Film className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-400">3 unique AI scenes → real 15-second MP4</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Gemini generates 3 distinct images (product hero, lifestyle, CTA), then FFmpeg stitches them into a polished MP4. Takes ~90–120 seconds.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl">
                    <ArrowLeft className="w-4 h-4 me-2" /> {t.studio.backBtn}
                  </Button>
                  {mediaMode !== "video-avatar" && (
                    <Button
                      size="lg"
                      onClick={handleNext}
                      disabled={isPending}
                      data-testid="button-generate"
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
                    >
                      {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin me-2" /> {t.studio.starting}</>
                      ) : mediaMode === "video-upload" ? (
                        <><Upload className="w-4 h-4 me-2" /> {t.studio.uploadVideoBtn}</>
                      ) : mediaMode === "video-images" ? (
                        <><Images className="w-4 h-4 me-2" /> {t.studio.generateSlideshowBtn}</>
                      ) : mediaMode === "video-ai" ? (
                        <><Film className="w-4 h-4 me-2" /> {t.studio.generateVideoBtn}</>
                      ) : (
                        <><Sparkles className="w-4 h-4 me-2" /> {t.studio.generateBtn}</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════ STEP 3 ════════════════ */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>

            {/* ── Generating ── */}
            {(!resultCreative || resultCreative.status === "generating") && (
              <div className="rounded-2xl border border-border/60 bg-card p-10 flex flex-col items-center justify-center text-center space-y-8 min-h-[480px]">
                {/* Pulsing orb */}
                <div className="relative">
                  <div className="absolute -inset-6 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-xl shadow-primary/30 relative">
                    {mediaMode === "video-ai" ? (
                      <Film className="w-9 h-9 text-white animate-pulse" />
                    ) : (
                      <Sparkles className="w-9 h-9 text-white animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold">
                    {mediaMode === "video-ai" ? t.studio.generatingVideoTitle : t.studio.generatingTitle}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {mediaMode === "video-ai"
                      ? "Generating image → rendering MP4 with FFmpeg. ~60–90 seconds."
                      : t.studio.generatingSubtitle}
                  </p>
                </div>

                {/* Steps progress */}
                <div className="w-full max-w-xs space-y-3">
                  {progressSteps.map((s, i) => {
                    const Icon = s.icon;
                    const isDone   = i < progressStep;
                    const isActive = i === progressStep;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                          isDone   ? "bg-emerald-500/10 border border-emerald-500/20"
                          : isActive ? "bg-primary/10 border border-primary/20"
                          : "opacity-30"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isDone ? "bg-emerald-500" : isActive ? "bg-primary" : "bg-muted"
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          isDone ? "text-emerald-500" : isActive ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {lang === "ar" ? s.labelAr : s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {mediaMode === "video-ai" && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    FFmpeg is rendering your MP4…
                  </p>
                )}
              </div>
            )}

            {/* ── Failed ── */}
            {resultCreative?.status === "failed" && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center space-y-5">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t.studio.failed}</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">{t.studio.failedDesc}</p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={() => { setStep(2); setGeneratingId(null); }} variant="outline" className="rounded-xl gap-2">
                    <RefreshCw className="w-4 h-4" /> {t.studio.tryAgain}
                  </Button>
                  <Button onClick={handleCreateAnother} className="rounded-xl gap-2">
                    <Sparkles className="w-4 h-4" /> {t.studio.newCreative}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Ready ── */}
            {resultCreative && resultCreative.status === "ready" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">

                {/* Media Preview */}
                <div className="space-y-4">
                  {/* Video player / image */}
                  <div className="rounded-2xl border border-border/60 overflow-hidden bg-black">
                    {resultIsVideo && resultCreative.videoUrl ? (
                      <div className="relative aspect-square bg-black">
                        <video
                          src={resultCreative.videoUrl}
                          className="w-full h-full object-contain"
                          controls
                          autoPlay
                          playsInline
                          loop
                        />
                        <div className="absolute top-2 start-2">
                          <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                            <Play className="w-2.5 h-2.5 fill-white" /> MP4 · 15s · 1080×1080
                          </span>
                        </div>
                      </div>
                    ) : resultCreative.imageData ? (
                      <div className="relative aspect-square group">
                        <img src={resultCreative.imageData} alt="Generated Ad" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" className="rounded-full shadow-2xl gap-2" onClick={handleDownload}>
                            <Download className="w-4 h-4" /> Download PNG
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                  </div>

                  {/* Download + Library buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="h-11 rounded-xl gap-2 shadow-md" onClick={handleDownload} data-testid="button-download">
                      <Download className="w-4 h-4" />
                      {resultIsVideo ? t.studio.downloadVideo : t.studio.downloadImage}
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setLocation("/library")}>
                      <Library className="w-4 h-4" /> {t.studio.viewLibrary}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full h-10 rounded-xl border border-dashed border-border gap-2"
                    onClick={handleCreateAnother}
                    data-testid="button-create-another"
                  >
                    <Sparkles className="w-4 h-4" /> {t.studio.createAnother}
                  </Button>
                </div>

                {/* Details Panel */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
                    {/* Title + badges + score */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold truncate">{resultCreative.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 text-xs font-bold bg-secondary rounded-lg capitalize">{resultCreative.platform}</span>
                          <span className="text-xs text-muted-foreground">{resultCreative.formatName}</span>
                          {resultIsVideo && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/15 text-purple-400 rounded-md border border-purple-500/30 flex items-center gap-1">
                              <Film className="w-3 h-3" /> MP4 Video
                            </span>
                          )}
                        </div>
                      </div>
                      {resultCreative.performanceScore && (
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative w-13 h-13">
                            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-emerald-500/20" />
                              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-emerald-500"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - resultCreative.performanceScore / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center font-bold text-emerald-500 text-sm">
                              {resultCreative.performanceScore}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Score</span>
                        </div>
                      )}
                    </div>

                    {/* Ad Copy */}
                    {resultCreative.adCopy && (
                      <div className="space-y-3">
                        {[
                          { key: "headline",    label: t.studio.headline,    icon: TrendingUp },
                          { key: "description", label: t.studio.bodyCopy,    icon: Layers },
                          { key: "cta",         label: t.studio.callToAction, icon: Target },
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key} className="bg-background/60 rounded-xl p-3.5 border border-border/50">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon className="w-3 h-3 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
                            </div>
                            {key === "cta" ? (
                              <span className="inline-block px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-sm">
                                {(resultCreative.adCopy as any)?.[key]}
                              </span>
                            ) : (
                              <p className={`font-semibold ${key === "headline" ? "text-base" : "text-sm text-muted-foreground"}`}>
                                {(resultCreative.adCopy as any)?.[key]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Performance breakdown */}
                  {!resultIsVideo && resultCreative.performanceScore && (
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t.studio.performanceBreakdown}</p>
                      </div>
                      {[
                        { label: t.studio.headlineImpact, val: 88 },
                        { label: t.studio.copyCl,         val: 92 },
                        { label: t.studio.ctaStrength,    val: 85 },
                      ].map(({ label, val }) => (
                        <div key={label} className="mb-3 last:mb-0">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-bold text-emerald-500">{val}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
