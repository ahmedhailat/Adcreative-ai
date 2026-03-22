import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AD_FORMATS, type GenerateCreativeInput } from "@shared/schema";
import { useBrands } from "@/hooks/use-brands";
import { useGenerateCreative, useCreative } from "@/hooks/use-creatives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiFacebook, SiInstagram, SiGoogle, SiTiktok, SiLinkedin, SiX } from "react-icons/si";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Wand2, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORM_ICONS: Record<string, any> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  google: SiGoogle,
  tiktok: SiTiktok,
  linkedin: SiLinkedin,
  twitter: SiX,
};

export default function Studio() {
  const [, setLocation] = useLocation();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const generateCreative = useGenerateCreative();
  
  const [step, setStep] = useState(1);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  
  // The polling hook
  const { data: resultCreative } = useCreative(generatingId);

  const [formData, setFormData] = useState<Partial<GenerateCreativeInput>>({
    goal: "awareness"
  });

  const handleNext = () => {
    if (step === 1 && (!formData.brandId || !formData.formatSize)) return;
    if (step === 2 && (!formData.title || !formData.productName || !formData.productDescription)) return;
    
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
    } catch (e) {
      console.error(e);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold font-display text-gradient mb-3">Creative Studio</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Let AI craft the perfect ad creative for your brand in seconds.
        </p>
      </div>

      {/* Progress Wizard */}
      <div className="flex justify-center mb-12 relative max-w-3xl mx-auto">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-border/50 -translate-y-1/2 -z-10 rounded-full" />
        <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 -z-10 rounded-full transition-all duration-500" 
             style={{ width: `${((step - 1) / 2) * 100}%` }} />
             
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex justify-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all duration-300 ${
              step >= s ? "bg-primary border-background text-primary-foreground shadow-lg shadow-primary/30" 
                        : "bg-card border-background text-muted-foreground"
            }`}>
              {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="glass-card rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold font-display">1. Select Brand</h2>
              {brandsLoading ? (
                <div className="h-14 bg-muted animate-pulse rounded-xl" />
              ) : brands?.length === 0 ? (
                <div className="p-6 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5" />
                  <p>You need to create a brand first.</p>
                  <Button variant="outline" className="ms-auto border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setLocation('/brands')}>
                    Go to Brands
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {brands?.map((brand: any) => (
                    <div 
                      key={brand.id}
                      onClick={() => setFormData({...formData, brandId: brand.id})}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.brandId === brand.id 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border/50 hover:border-primary/50 hover:bg-card/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                             style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                          {brand.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{brand.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold font-display">2. Select Format</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {AD_FORMATS.map((format) => {
                  const Icon = PLATFORM_ICONS[format.platform] || SiFacebook;
                  return (
                    <div
                      key={format.id}
                      onClick={() => setFormData({
                        ...formData, 
                        platform: format.platform,
                        formatSize: format.size,
                        formatName: format.name
                      })}
                      className={`p-5 flex flex-col items-center justify-center text-center gap-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.formatSize === format.size && formData.platform === format.platform
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border/50 hover:border-primary/50 hover:bg-card/50'
                      }`}
                    >
                      <Icon className="w-8 h-8 opacity-80" />
                      <div>
                        <p className="font-semibold text-sm">{format.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format.size}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={handleNext} 
                disabled={!formData.brandId || !formData.formatSize}
                className="h-14 px-8 rounded-xl text-base shadow-lg"
              >
                Continue to Content <ArrowRight className="ms-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold font-display">Describe Your Product</h2>
            </div>
            
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="space-y-2">
                <Label className="text-base">Creative Title (Internal use)</Label>
                <Input 
                  placeholder="e.g. Summer Sale 2025 - IG Post" 
                  value={formData.title || ""}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="h-14 rounded-xl text-lg bg-background/50"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base">Product/Service Name</Label>
                  <Input 
                    placeholder="What are you selling?" 
                    value={formData.productName || ""}
                    onChange={e => setFormData({...formData, productName: e.target.value})}
                    className="h-14 rounded-xl bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Campaign Goal</Label>
                  <Select value={formData.goal} onValueChange={v => setFormData({...formData, goal: v})}>
                    <SelectTrigger className="h-14 rounded-xl bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Brand Awareness</SelectItem>
                      <SelectItem value="traffic">Drive Traffic</SelectItem>
                      <SelectItem value="leads">Generate Leads</SelectItem>
                      <SelectItem value="sales">Boost Sales</SelectItem>
                      <SelectItem value="engagement">Increase Engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Product Description & USP</Label>
                <Textarea 
                  placeholder="Describe the main benefits, features, and why people should buy this..." 
                  value={formData.productDescription || ""}
                  onChange={e => setFormData({...formData, productDescription: e.target.value})}
                  className="min-h-[120px] rounded-xl text-base bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Target Audience (Optional)</Label>
                <Input 
                  placeholder="e.g. Millennials interested in fitness" 
                  value={formData.targetAudience || ""}
                  onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                  className="h-14 rounded-xl bg-background/50"
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border/50">
                <Button 
                  size="lg" 
                  onClick={handleNext}
                  disabled={!formData.title || !formData.productName || !formData.productDescription || generateCreative.isPending}
                  className="h-14 px-10 rounded-xl text-base shadow-xl shadow-primary/25 bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90"
                >
                  {generateCreative.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin me-2" />
                  ) : (
                    <Sparkles className="w-5 h-5 me-2" />
                  )}
                  Generate Creative
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto"
          >
            {(!resultCreative || resultCreative.status === "generating") ? (
              <div className="glass-card rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display mb-2">AI is crafting your creative</h3>
                  <p className="text-muted-foreground text-lg">Analyzing brand guidelines, writing copy, and rendering design...</p>
                </div>
                
                <div className="w-full max-w-md mt-8 space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-[pulse_2s_ease-in-out_infinite] w-full" style={{ transformOrigin: 'left', animation: 'scaleX 2s infinite alternate' }} />
                  </div>
                </div>
              </div>
            ) : resultCreative.status === "failed" ? (
              <div className="glass-card rounded-3xl p-16 text-center space-y-4">
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold font-display">Generation Failed</h3>
                <p className="text-muted-foreground">Something went wrong while generating your creative. Please try again.</p>
                <Button onClick={() => setStep(2)} className="mt-4 rounded-xl">Try Again</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Result Image */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl overflow-hidden p-2 relative group">
                    <div className="bg-muted rounded-xl overflow-hidden aspect-square flex items-center justify-center relative">
                      {resultCreative.imageData ? (
                        <img src={resultCreative.imageData} alt="Generated Ad" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground">Image not available</span>
                      )}
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" className="rounded-full shadow-2xl" onClick={handleDownload}>
                          <Download className="w-4 h-4 me-2" /> Download
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button className="flex-1 rounded-xl h-12" onClick={handleDownload}>
                      <Download className="w-4 h-4 me-2" /> Download Image
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl h-12 bg-card" onClick={() => setLocation('/library')}>
                      <ImageLibrary className="w-4 h-4 me-2" /> View Library
                    </Button>
                  </div>
                </div>

                {/* Result Details */}
                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold font-display">{resultCreative.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="capitalize bg-secondary px-2 py-0.5 rounded-md">{resultCreative.platform}</span>
                          <span>{resultCreative.formatName} ({resultCreative.formatSize})</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="relative w-14 h-14 rounded-full border-4 border-green-500/20 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="28" cy="28" r="26" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-green-500" strokeDasharray="163" strokeDashoffset={163 - (163 * (resultCreative.performanceScore || 92)) / 100} />
                          </svg>
                          <span className="font-bold text-lg text-green-500">{resultCreative.performanceScore || 92}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Score</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-background rounded-xl p-4 border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Ad Headline</p>
                        <p className="font-bold text-lg">{resultCreative.adCopy?.headline}</p>
                      </div>
                      <div className="bg-background rounded-xl p-4 border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Ad Description / Body</p>
                        <p className="text-foreground leading-relaxed">{resultCreative.adCopy?.description}</p>
                      </div>
                      <div className="bg-background rounded-xl p-4 border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Call to Action</p>
                        <span className="inline-block px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg border border-primary/20">
                          {resultCreative.adCopy?.cta}
                        </span>
                      </div>
                    </div>
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
