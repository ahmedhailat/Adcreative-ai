import { useState } from "react";
import { useLocation } from "wouter";
import { AD_FORMATS, type GenerateCreativeInput } from "@shared/schema";
import { useBrands } from "@/hooks/use-brands";
import { useGenerateCreative, useCreative } from "@/hooks/use-creatives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiFacebook, SiInstagram, SiGoogle, SiTiktok, SiX } from "react-icons/si";
import { Linkedin as SiLinkedin } from "lucide-react";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Wand2, Download, Sparkles, Library } from "lucide-react";
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

const STEP_LABELS = ["Brand & Format", "Product Details", "Result"];

export default function Studio() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const generateCreative = useGenerateCreative();

  const [step, setStep] = useState(1);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const { data: resultCreative } = useCreative(generatingId);

  const [formData, setFormData] = useState<Partial<GenerateCreativeInput>>({
    goal: "awareness"
  });

  const handleNext = () => {
    if (step === 1 && (!formData.brandId || !formData.formatSize)) {
      toast({ title: "Please select a brand and format", variant: "destructive" });
      return;
    }
    if (step === 2 && (!formData.title || !formData.productName || !formData.productDescription)) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (step === 2) {
      handleGenerate();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleGenerate = async () => {
    try {
      const data = formData as GenerateCreativeInput;
      const created = await generateCreative.mutateAsync(data);
      setGeneratingId(created.id);
      setStep(3);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!resultCreative?.imageData) return;
    const a = document.createElement('a');
    a.href = resultCreative.imageData;
    a.download = `${resultCreative.title.replace(/\s+/g, '-').toLowerCase()}-ad.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreateAnother = () => {
    setStep(1);
    setGeneratingId(null);
    setFormData({ goal: "awareness" });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-2">
          <Sparkles className="w-4 h-4" />
          AI Creative Studio
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Generate Your Ad Creative</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Three simple steps. Powered by Gemini AI.
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
                <h2 className="text-xl font-bold">Select Your Brand</h2>
              </div>

              {brandsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : !brands?.length ? (
                <div className="flex items-center gap-4 p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">No brands yet</p>
                    <p className="text-sm opacity-80">Create a brand first before generating creatives.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setLocation('/brands')} className="shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    Add Brand
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
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
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
                <h2 className="text-xl font-bold">Select Ad Format</h2>
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

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleNext}
                disabled={!formData.brandId || !formData.formatSize}
                data-testid="button-next-step1"
                className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
              >
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 - Product Details */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-lg h-8 w-8 -ml-1">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold">Describe Your Product</h2>
              </div>

              <div className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Creative Title <span className="text-muted-foreground font-normal">(internal name)</span></Label>
                  <Input
                    data-testid="input-creative-title"
                    placeholder="e.g. Summer Sale 2025 – Instagram Post"
                    value={formData.title || ""}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Product / Service Name <span className="text-destructive">*</span></Label>
                    <Input
                      data-testid="input-product-name"
                      placeholder="What are you advertising?"
                      value={formData.productName || ""}
                      onChange={e => setFormData({...formData, productName: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Campaign Goal</Label>
                    <Select value={formData.goal} onValueChange={v => setFormData({...formData, goal: v})}>
                      <SelectTrigger className="h-12 rounded-xl" data-testid="select-campaign-goal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">🎯 Brand Awareness</SelectItem>
                        <SelectItem value="traffic">🚀 Drive Traffic</SelectItem>
                        <SelectItem value="leads">📋 Generate Leads</SelectItem>
                        <SelectItem value="sales">💰 Boost Sales</SelectItem>
                        <SelectItem value="engagement">❤️ Increase Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Product Description & Key Benefits <span className="text-destructive">*</span></Label>
                  <Textarea
                    data-testid="input-product-description"
                    placeholder="Describe main benefits, unique selling points, and why customers should choose this product..."
                    value={formData.productDescription || ""}
                    onChange={e => setFormData({...formData, productDescription: e.target.value})}
                    className="min-h-[120px] rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Target Audience <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    data-testid="input-target-audience"
                    placeholder="e.g. Millennials aged 25–35 interested in fitness and wellness"
                    value={formData.targetAudience || ""}
                    onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="pt-2 border-t border-border/50 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6 rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={!formData.title || !formData.productName || !formData.productDescription || generateCreative.isPending}
                    data-testid="button-generate"
                    className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                  >
                    {generateCreative.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Starting…</>
                      : <><Sparkles className="w-4 h-4 mr-2" /> Generate Creative</>
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
                  <h3 className="text-2xl font-bold mb-2">Gemini AI is crafting your creative</h3>
                  <p className="text-muted-foreground">Analyzing brand, writing copy, generating image…</p>
                </div>
                <div className="w-full max-w-sm space-y-3">
                  {["Writing ad copy", "Generating image", "Finalizing creative"].map((label, i) => (
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
                <h3 className="text-2xl font-bold">Generation Failed</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Something went wrong during generation. This may be a temporary issue with the AI service.</p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={() => setStep(2)} variant="outline" className="rounded-xl">Try Again</Button>
                  <Button onClick={handleCreateAnother} className="rounded-xl">New Creative</Button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="bg-muted/50 aspect-square flex items-center justify-center relative group overflow-hidden">
                      {resultCreative.imageData ? (
                        <img src={resultCreative.imageData} alt="Generated Ad" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground">Preview unavailable</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" className="rounded-full shadow-2xl" onClick={handleDownload} data-testid="button-download-hover">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1 h-11 rounded-xl shadow-md" onClick={handleDownload} data-testid="button-download-image">
                      <Download className="w-4 h-4 mr-2" /> Download Image
                    </Button>
                    <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setLocation('/library')}>
                      <Library className="w-4 h-4 mr-2" /> View Library
                    </Button>
                  </div>

                  <Button variant="ghost" className="w-full h-11 rounded-xl border border-dashed border-border" onClick={handleCreateAnother} data-testid="button-create-another">
                    <Sparkles className="w-4 h-4 mr-2" /> Create Another
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
                        </div>
                      </div>
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
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Score</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">Headline</p>
                        <p className="font-bold text-base">{(resultCreative.adCopy as any)?.headline}</p>
                      </div>
                      <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">Body Copy</p>
                        <p className="text-sm leading-relaxed">{(resultCreative.adCopy as any)?.description}</p>
                      </div>
                      <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">Call to Action</p>
                        <span className="inline-block px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-sm">
                          {(resultCreative.adCopy as any)?.cta}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Performance Breakdown</p>
                    {[
                      { label: "Headline Impact", val: 88 },
                      { label: "Copy Clarity", val: 92 },
                      { label: "CTA Strength", val: 85 },
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
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
