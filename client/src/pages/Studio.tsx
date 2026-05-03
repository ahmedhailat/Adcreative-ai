import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { AD_FORMATS, type GenerateCreativeInput } from "@shared/schema";
import { useBrands } from "@/hooks/use-brands";
import { useGenerateCreative, useCreative, useUploadVideo } from "@/hooks/use-creatives";
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
  Crown, Zap, Film, Lock,
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
  tiktok: "#010101",
  linkedin: "#0077b5",
  twitter: "#1da1f2",
};

type MediaMode = "image" | "video-upload" | "video-ai";

function UpgradeProBanner({ message, ctaLabel }: { message: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
        <Lock className="w-5 h-5 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" /> Pro Feature
        </p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" className="shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 text-white" asChild>
        <Link href="/pricing">
          <Zap className="w-3.5 h-3.5 me-1.5" />
          {ctaLabel}
        </Link>
      </Button>
    </div>
  );
}

export default function Studio() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLang();
  const { user } = useAuth();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const generateCreative = useGenerateCreative();
  const uploadVideo = useUploadVideo();

  const [step, setStep] = useState(1);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const { data: resultCreative } = useCreative(generatingId);

  const [mediaMode, setMediaMode] = useState<MediaMode>("image");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<GenerateCreativeInput>>({
    goal: "awareness"
  });

  const userPlan = (user as any)?.plan ?? "free";
  const isPro = userPlan === "pro" || userPlan === "business";

  const STEP_LABELS = [t.studio.step1, t.studio.step2, t.studio.step3];

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
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoFileSelect(file);
  }, [handleVideoFileSelect]);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.brandId && !formData.formatSize) {
        toast({ title: t.studio.selectBrandAndFormat, description: t.studio.selectBrandAndFormatDesc, variant: "destructive" });
        return;
      }
      if (!formData.brandId) {
        toast({ title: t.studio.selectBrandFirst, description: t.studio.selectBrandFirstDesc, variant: "destructive" });
        return;
      }
      if (!formData.formatSize) {
        toast({ title: t.studio.selectAdFormat, description: t.studio.selectAdFormatDesc, variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (!formData.productName || !formData.productDescription) {
        if (!formData.productName) {
          toast({ title: t.studio.productNameRequired, description: t.studio.productNameRequiredDesc, variant: "destructive" });
        } else {
          toast({ title: t.studio.productDescRequired, description: t.studio.productDescRequiredDesc, variant: "destructive" });
        }
        return;
      }
      if (mediaMode === "video-upload" && !videoFile) {
        toast({ title: "No video selected", description: "Please select a video file to upload.", variant: "destructive" });
        return;
      }
      handleGenerate();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleGenerate = async () => {
    try {
      const autoTitle = formData.title?.trim()
        || `${formData.productName ?? ""} – ${formData.formatName ?? ""}`;

      const brandId = formData.brandId!;
      const platform = formData.platform!;
      const formatSize = formData.formatSize!;
      const formatName = formData.formatName!;
      const productName = formData.productName!;
      const productDescription = formData.productDescription!;
      const goal = formData.goal!;
      const targetAudience = formData.targetAudience;

      if (mediaMode === "video-upload" && videoFile) {
        const result = await uploadVideo.mutateAsync({
          file: videoFile,
          brandId,
          title: autoTitle,
          platform,
          formatSize,
          formatName,
          productName,
          productDescription,
          goal,
          targetAudience,
        });
        setGeneratingId(result.id);
        setStep(3);
      } else if (mediaMode === "video-ai") {
        const created = await generateCreative.mutateAsync({
          brandId, platform, formatSize, formatName, productName,
          productDescription, goal, targetAudience, title: autoTitle,
          mediaType: "video",
        } as any);
        setGeneratingId(created.id);
        setStep(3);
      } else {
        const created = await generateCreative.mutateAsync({
          brandId, platform, formatSize, formatName, productName,
          productDescription, goal, targetAudience, title: autoTitle,
        });
        setGeneratingId(created.id);
        setStep(3);
      }
    } catch (e: any) {
      toast({ title: t.studio.generationFailed, description: e.message, variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!resultCreative) return;
    const isVideo = resultCreative.mediaType === "video";
    const src = isVideo ? resultCreative.videoUrl : resultCreative.imageData;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `${resultCreative.title.replace(/\s+/g, '-').toLowerCase()}-ad.${isVideo ? "mp4" : "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreateAnother = () => {
    setStep(1);
    setGeneratingId(null);
    setFormData({ goal: "awareness" });
    setMediaMode("image");
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
  };

  const isPending = generateCreative.isPending || uploadVideo.isPending;
  const resultIsVideo = resultCreative?.mediaType === "video";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-2">
          <Sparkles className="w-4 h-4" />
          AI Creative Studio
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">{t.studio.title}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t.studio.subtitle}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-0 max-w-lg mx-auto">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  isDone ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30"
                    : isActive ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-card border-border text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-500 ${step > s ? "bg-green-500" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1 - Brand & Format */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-bold">{t.studio.selectBrand}</h2>
                {!formData.brandId ? (
                  <span className="ms-auto text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{t.studio.pickOne}</span>
                ) : (
                  <CheckCircle2 className="ms-auto w-5 h-5 text-green-500" />
                )}
              </div>

              {brandsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : !brands?.length ? (
                <div className="flex items-center gap-4 p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{t.studio.noBrandsYet}</p>
                    <p className="text-sm opacity-80">{t.studio.noBrandsDesc}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setLocation('/brands')} className="shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    {t.studio.addBrand}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {brands.map((brand: any) => (
                    <button
                      key={brand.id}
                      data-testid={`brand-select-${brand.id}`}
                      onClick={() => setFormData({...formData, brandId: brand.id})}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${
                        formData.brandId === brand.id
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border/50 hover:border-primary/40 hover:bg-muted/50 bg-card'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                           style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                        {brand.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{brand.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{brand.industry}</p>
                      </div>
                      {formData.brandId === brand.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary ms-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <h2 className="text-xl font-bold">{t.studio.selectFormat}</h2>
                {!formData.formatSize ? (
                  <span className="ms-auto text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{t.studio.pickOne}</span>
                ) : (
                  <CheckCircle2 className="ms-auto w-5 h-5 text-green-500" />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {AD_FORMATS.map((format) => {
                  const Icon = PLATFORM_ICONS[format.platform] || SiFacebook;
                  const color = PLATFORM_COLORS[format.platform] || "#6366f1";
                  const isSelected = formData.formatSize === format.size && formData.platform === format.platform;
                  return (
                    <button
                      key={format.id}
                      data-testid={`format-select-${format.id}`}
                      onClick={() => setFormData({
                        ...formData,
                        platform: format.platform,
                        formatSize: format.size,
                        formatName: format.name
                      })}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border/50 hover:border-primary/40 hover:bg-muted/50 bg-card'
                      }`}
                    >
                      <Icon className="w-7 h-7" style={{ color }} />
                      <div className="text-center">
                        <p className="font-semibold text-xs leading-tight">{format.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{format.size}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media Type Selection */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <h2 className="text-xl font-bold">{t.studio.mediaType}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Image */}
                <button
                  onClick={() => setMediaMode("image")}
                  data-testid="media-type-image"
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    mediaMode === "image"
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/50 hover:border-primary/40 hover:bg-muted/50 bg-card'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{t.studio.image}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.studio.generateAiVideoDesc.replace("video", "image")}</p>
                  </div>
                  {mediaMode === "image" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </button>

                {/* Upload Video */}
                <button
                  onClick={() => isPro ? setMediaMode("video-upload") : null}
                  data-testid="media-type-video-upload"
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    mediaMode === "video-upload"
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : isPro
                        ? 'border-border/50 hover:border-primary/40 hover:bg-muted/50 bg-card'
                        : 'border-border/40 bg-card/50 cursor-not-allowed opacity-70'
                  }`}
                >
                  {!isPro && (
                    <div className="absolute top-2 end-2">
                      <span className="bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pro</span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "video-upload" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{t.studio.uploadVideo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.studio.uploadVideoDesc}</p>
                  </div>
                  {mediaMode === "video-upload" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </button>

                {/* AI Video */}
                <button
                  onClick={() => isPro ? setMediaMode("video-ai") : null}
                  data-testid="media-type-video-ai"
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    mediaMode === "video-ai"
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : isPro
                        ? 'border-border/50 hover:border-primary/40 hover:bg-muted/50 bg-card'
                        : 'border-border/40 bg-card/50 cursor-not-allowed opacity-70'
                  }`}
                >
                  {!isPro && (
                    <div className="absolute top-2 end-2">
                      <span className="bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pro</span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mediaMode === "video-ai" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Film className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{t.studio.generateAiVideo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.studio.generateAiVideoDesc}</p>
                  </div>
                  {mediaMode === "video-ai" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </button>
              </div>

              {!isPro && (mediaMode === "image") && (
                <UpgradeProBanner message={t.studio.proFeatureDesc} ctaLabel={t.studio.upgradeToPro} />
              )}
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleNext}
                data-testid="button-next-step1"
                className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
              >
                {t.studio.continueBtn} <ArrowRight className="ms-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 - Product Details */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-lg h-8 w-8 -ms-1">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold">{t.studio.describeProduct}</h2>
                {/* Badge for media type */}
                <span className={`ms-auto text-xs font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                  mediaMode === "image" ? "bg-blue-500/15 text-blue-500" :
                  mediaMode === "video-upload" ? "bg-purple-500/15 text-purple-500" :
                  "bg-indigo-500/15 text-indigo-500"
                }`}>
                  {mediaMode === "image" ? <><ImageIcon className="w-3 h-3" /> {t.studio.image}</> :
                   mediaMode === "video-upload" ? <><Upload className="w-3 h-3" /> {t.studio.uploadVideo}</> :
                   <><Film className="w-3 h-3" /> {t.studio.generateAiVideo}</>}
                </span>
              </div>

              <div className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t.studio.creativeTitle} <span className="text-muted-foreground font-normal">{t.studio.creativeTitleHint}</span></Label>
                  <Input
                    data-testid="input-creative-title"
                    placeholder={`e.g. ${formData.productName || "My Product"} – ${formData.formatName || "Instagram Post"}`}
                    value={formData.title || ""}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t.studio.productName} <span className="text-destructive">*</span></Label>
                    <Input
                      data-testid="input-product-name"
                      placeholder={t.studio.productNamePlaceholder}
                      value={formData.productName || ""}
                      onChange={e => setFormData({...formData, productName: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t.studio.campaignGoal}</Label>
                    <Select value={formData.goal} onValueChange={v => setFormData({...formData, goal: v})}>
                      <SelectTrigger className="h-12 rounded-xl" data-testid="select-campaign-goal">
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
                    data-testid="input-product-description"
                    placeholder={t.studio.productDescPlaceholder}
                    value={formData.productDescription || ""}
                    onChange={e => setFormData({...formData, productDescription: e.target.value})}
                    className="min-h-[120px] rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t.studio.targetAudience} <span className="text-muted-foreground font-normal">{t.studio.targetAudienceHint}</span></Label>
                  <Input
                    data-testid="input-target-audience"
                    placeholder={t.studio.targetAudiencePlaceholder}
                    value={formData.targetAudience || ""}
                    onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* Video Upload Zone */}
                {mediaMode === "video-upload" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t.studio.videoFile} <span className="text-destructive">*</span></Label>
                    {videoPreviewUrl ? (
                      <div className="rounded-xl border border-border overflow-hidden relative">
                        <video src={videoPreviewUrl} className="w-full max-h-64 object-cover" controls />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 end-2"
                          onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                          isDragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="video-drop-zone"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Video className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm text-foreground">{t.studio.dragDropVideo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t.studio.videoFormats}</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoFileSelect(file);
                          }}
                          data-testid="input-video-file"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6 rounded-xl">
                    <ArrowLeft className="w-4 h-4 me-2" /> {t.studio.backBtn}
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={isPending}
                    data-testid="button-generate"
                    className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                  >
                    {isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin me-2" /> {t.studio.starting}</>
                      : mediaMode === "video-upload"
                        ? <><Upload className="w-4 h-4 me-2" /> {t.studio.uploadVideoBtn}</>
                        : mediaMode === "video-ai"
                          ? <><Film className="w-4 h-4 me-2" /> {t.studio.generateVideoBtn}</>
                          : <><Sparkles className="w-4 h-4 me-2" /> {t.studio.generateBtn}</>
                    }
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3 - Result */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            {(!resultCreative || resultCreative.status === "generating") ? (
              <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[440px]">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <div className="absolute -inset-3 bg-primary/5 rounded-full blur-xl animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {mediaMode === "video-ai" ? t.studio.generatingVideoTitle : t.studio.generatingTitle}
                  </h3>
                  <p className="text-muted-foreground">
                    {mediaMode === "video-ai" ? t.studio.generatingVideoSubtitle : t.studio.generatingSubtitle}
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-3">
                  {(mediaMode === "video-ai"
                    ? [t.studio.writingCopy, t.studio.generatingVideo, t.studio.finalizing]
                    : [t.studio.writingCopy, t.studio.generatingImage, t.studio.finalizing]
                  ).map((label, i) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" style={{ animationDelay: `${i * 0.3}s` }} />
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            ) : resultCreative.status === "failed" ? (
              <div className="glass-card rounded-2xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-2xl font-bold">{t.studio.failed}</h3>
                <p className="text-muted-foreground max-w-md mx-auto">{t.studio.failedDesc}</p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={() => setStep(2)} variant="outline" className="rounded-xl">{t.studio.tryAgain}</Button>
                  <Button onClick={handleCreateAnother} className="rounded-xl">{t.studio.newCreative}</Button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Media Preview */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="bg-muted/50 aspect-square flex items-center justify-center relative group overflow-hidden">
                      {resultIsVideo && resultCreative.videoUrl ? (
                        <video
                          src={resultCreative.videoUrl}
                          className="w-full h-full object-cover"
                          controls
                          playsInline
                        />
                      ) : resultCreative.imageData ? (
                        <>
                          <img src={resultCreative.imageData} alt="Generated Ad" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" className="rounded-full shadow-2xl" onClick={handleDownload} data-testid="button-download-hover">
                              <Download className="w-4 h-4 me-2" /> {t.studio.downloadImage}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Preview unavailable</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1 h-11 rounded-xl shadow-md" onClick={handleDownload} data-testid="button-download-image">
                      <Download className="w-4 h-4 me-2" />
                      {resultIsVideo ? t.studio.downloadVideo : t.studio.downloadImage}
                    </Button>
                    <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setLocation('/library')}>
                      <Library className="w-4 h-4 me-2" /> {t.studio.viewLibrary}
                    </Button>
                  </div>

                  <Button variant="ghost" className="w-full h-11 rounded-xl border border-dashed border-border" onClick={handleCreateAnother} data-testid="button-create-another">
                    <Sparkles className="w-4 h-4 me-2" /> {t.studio.createAnother}
                  </Button>
                </div>

                {/* Details Panel */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-5 space-y-5">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{resultCreative.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-2.5 py-1 text-xs font-bold bg-secondary rounded-lg capitalize">{resultCreative.platform}</span>
                          <span className="text-xs text-muted-foreground">{resultCreative.formatName} · {resultCreative.formatSize}</span>
                          {resultIsVideo && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/15 text-purple-500 rounded-md border border-purple-500/30 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          )}
                        </div>
                      </div>
                      {!resultIsVideo && (
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative w-14 h-14">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-green-500/20" />
                              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-green-500"
                                strokeDasharray={`${2 * Math.PI * 24}`}
                                strokeDashoffset={`${2 * Math.PI * 24 * (1 - (resultCreative.performanceScore || 80) / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center font-bold text-green-500 text-base">
                              {resultCreative.performanceScore || 80}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{t.studio.score}</span>
                        </div>
                      )}
                    </div>

                    {resultCreative.adCopy && (
                      <div className="space-y-3">
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">{t.studio.headline}</p>
                          <p className="font-bold text-base">{(resultCreative.adCopy as any)?.headline}</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">{t.studio.bodyCopy}</p>
                          <p className="text-sm leading-relaxed">{(resultCreative.adCopy as any)?.description}</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">{t.studio.callToAction}</p>
                          <span className="inline-block px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-sm">
                            {(resultCreative.adCopy as any)?.cta}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!resultIsVideo && (
                    <div className="glass-card rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">{t.studio.performanceBreakdown}</p>
                      {[
                        { label: t.studio.headlineImpact, val: 88 },
                        { label: t.studio.copyCl, val: 92 },
                        { label: t.studio.ctaStrength, val: 85 },
                      ].map(({ label, val }) => (
                        <div key={label} className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-bold text-green-500">{val}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
