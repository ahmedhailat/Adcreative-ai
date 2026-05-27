import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link, Sparkles, Video, Mic, MessageSquare, Star, ShoppingCart, Play } from "lucide-react";

interface UGCScript {
  hook: string;
  demo: string;
  socialProof: string;
  cta: string;
  productName: string;
  hashtags: string[];
}

const SCENE_ICONS = [MessageSquare, Play, Star, ShoppingCart];
const SCENE_COLORS = ["text-violet-400", "text-blue-400", "text-amber-400", "text-emerald-400"];
const SCENE_BG = ["bg-violet-500/10 border-violet-500/30", "bg-blue-500/10 border-blue-500/30", "bg-amber-500/10 border-amber-500/30", "bg-emerald-500/10 border-emerald-500/30"];

export default function UGC() {
  const { lang, isRTL } = useLang();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [url, setUrl]             = useState("");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [script, setScript]       = useState<UGCScript | null>(null);
  const [generating, setGenerating] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: (data: { url: string }) => apiRequest("POST", "/api/ugc/analyze", data),
    onSuccess: (data: any) => {
      setProductName(data.productName || "");
      setProductDesc(data.description || "");
      toast({ title: ar ? "تم تحليل المنتج" : "Product analyzed" });
    },
    onError: () => {
      toast({ title: ar ? "تعذّر جلب بيانات الرابط" : "Could not fetch URL data", description: ar ? "أدخل بيانات المنتج يدوياً" : "Enter product details manually", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: { productName: string; productDesc: string; url?: string }) =>
      apiRequest("POST", "/api/ugc/generate-script", data),
    onSuccess: (data: any) => {
      setScript(data);
      setGenerating(false);
    },
    onError: () => {
      setGenerating(false);
      toast({ title: ar ? "فشل الإنشاء" : "Generation failed", variant: "destructive" });
    },
  });

  const scriptSections = script
    ? [
        { titleAr: "الخطاف (Hook)",        titleEn: "Hook",         content: script.hook },
        { titleAr: "عرض المنتج",            titleEn: "Product Demo", content: script.demo },
        { titleAr: "إثبات اجتماعي",        titleEn: "Social Proof", content: script.socialProof },
        { titleAr: "دعوة للعمل (CTA)",     titleEn: "Call to Action", content: script.cta },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{ar ? "مولّد فيديو UGC" : "UGC Video Generator"}</h1>
        </div>
        <p className="text-muted-foreground">
          {ar ? "الصق رابط أي منتج وسيولّد الذكاء الاصطناعي سكريبت فيديو UGC بالعربية مع خطاف وعرض المنتج والإثبات الاجتماعي ودعوة للعمل"
              : "Paste any product URL and AI generates an Arabic UGC video script with hook, product demo, social proof, and CTA"}
        </p>
      </div>

      {/* Step 1: URL Input */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
            {ar ? "أدخل رابط المنتج" : "Enter Product URL"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={ar ? "https://store.example.com/product..." : "https://store.example.com/product..."}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
              data-testid="input-ugc-url"
            />
            <Button
              variant="outline"
              onClick={() => analyzeMutation.mutate({ url })}
              disabled={!url || analyzeMutation.isPending}
              className="gap-2 shrink-0"
              data-testid="button-analyze-url"
            >
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              {ar ? "تحليل" : "Analyze"}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{ar ? "اسم المنتج" : "Product Name"}</Label>
              <Input
                dir="rtl"
                placeholder={ar ? "اسم المنتج بالعربية" : "Product name"}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                data-testid="input-ugc-product-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "وصف المنتج" : "Product Description"}</Label>
              <Textarea
                dir="rtl"
                placeholder={ar ? "صف مزايا المنتج بالعربية..." : "Describe product benefits..."}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                rows={2}
                data-testid="input-ugc-product-desc"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Generate Script */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2 px-8"
          onClick={() => {
            setGenerating(true);
            generateMutation.mutate({ productName, productDesc, url });
          }}
          disabled={!productName || generateMutation.isPending}
          data-testid="button-generate-ugc-script"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {ar ? "إنشاء سكريبت UGC بالعربية" : "Generate Arabic UGC Script"}
        </Button>
      </div>

      {/* Script Result */}
      {script && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              {ar ? "السكريبت المُنشأ" : "Generated Script"}
            </h2>
            <div className="flex gap-2">
              {script.hashtags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs text-primary border-primary/30">{tag}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scriptSections.map((section, i) => {
              const Icon = SCENE_ICONS[i];
              return (
                <Card key={i} className={`border ${SCENE_BG[i]}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${SCENE_BG[i]}`}>
                        <Icon className={`w-3.5 h-3.5 ${SCENE_COLORS[i]}`} />
                      </div>
                      <span className={`text-xs font-bold ${SCENE_COLORS[i]}`}>
                        {ar ? section.titleAr : section.titleEn}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" dir="rtl">{section.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Full Script */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{ar ? "السكريبت الكامل للتسجيل" : "Full Script for Recording"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/40 text-sm leading-loose" dir="rtl">
                <p className="font-semibold text-amber-400 mb-1">🎬 Hook:</p>
                <p className="mb-3">{script.hook}</p>
                <p className="font-semibold text-blue-400 mb-1">📱 Demo:</p>
                <p className="mb-3">{script.demo}</p>
                <p className="font-semibold text-violet-400 mb-1">⭐ Social Proof:</p>
                <p className="mb-3">{script.socialProof}</p>
                <p className="font-semibold text-emerald-400 mb-1">🛍️ CTA:</p>
                <p>{script.cta}</p>
              </div>
              <Button
                className="mt-3 gap-2 w-full"
                onClick={() => {
                  const text = [script.hook, script.demo, script.socialProof, script.cta].join("\n\n");
                  navigator.clipboard.writeText(text);
                  toast({ title: ar ? "تم النسخ" : "Copied to clipboard" });
                }}
                variant="outline"
                data-testid="button-copy-script"
              >
                {ar ? "نسخ السكريبت الكامل" : "Copy Full Script"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            {ar ? "💡 نصيحة: سجّل الفيديو بصوتك الطبيعي باللغة العربية لأفضل تفاعل" : "💡 Tip: Record the video in your natural Arabic voice for best engagement"}
          </p>
        </div>
      )}
    </div>
  );
}
