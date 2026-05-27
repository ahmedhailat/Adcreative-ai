import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Rocket, CheckCircle2, Image, Play, DollarSign, Target, Calendar } from "lucide-react";
import { SiFacebook, SiSnapchat, SiTiktok, SiGoogle } from "react-icons/si";

interface Creative {
  id: number;
  title: string;
  platform: string;
  status: string;
  mediaType: string;
  imageData?: string;
  brand: { name: string; primaryColor: string };
}

const PLATFORM_OPTIONS = [
  { key: "meta",     label: "Meta Ads",     icon: SiFacebook,  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  { key: "snapchat", label: "Snapchat Ads", icon: SiSnapchat,  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "tiktok",   label: "TikTok Ads",   icon: SiTiktok,    color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/30" },
  { key: "google",   label: "Google Ads",   icon: SiGoogle,    color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
];

interface LaunchResult {
  platform: string;
  status: "success" | "failed";
  campaignId?: string;
  error?: string;
}

export default function BulkLaunch() {
  const { lang, isRTL } = useLang();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [selectedCreatives, setSelectedCreatives] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [budget, setBudget]   = useState("100");
  const [campaignName, setCampaignName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [results, setResults] = useState<LaunchResult[]>([]);
  const [launching, setLaunching] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: creatives = [], isLoading } = useQuery<Creative[]>({ queryKey: ["/api/creatives"] });
  const readyCreatives = creatives.filter(c => c.status === "ready");

  const launchMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/bulk-launch", data),
    onSuccess: (data: any) => {
      setResults(data.results || []);
      setLaunching(false);
      setProgress(100);
      toast({ title: ar ? `تم إطلاق الحملات بنجاح` : "Campaigns launched successfully" });
    },
    onError: () => {
      setLaunching(false);
      toast({ title: ar ? "فشل إطلاق بعض الحملات" : "Some campaigns failed to launch", variant: "destructive" });
    },
  });

  function toggleCreative(id: number) {
    setSelectedCreatives(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function togglePlatform(key: string) {
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleLaunch() {
    if (!selectedCreatives.length || !selectedPlatforms.length) {
      toast({ title: ar ? "اختر إعلاناً ومنصة على الأقل" : "Select at least one creative and platform", variant: "destructive" });
      return;
    }
    setLaunching(true);
    setProgress(0);
    setResults([]);
    // Animate progress
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 8, 90);
      setProgress(p);
      if (p >= 90) clearInterval(interval);
    }, 300);
    launchMutation.mutate({ creativeIds: selectedCreatives, platforms: selectedPlatforms, budget, campaignName, startDate });
  }

  const totalCampaigns = selectedCreatives.length * selectedPlatforms.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{ar ? "الإطلاق الجماعي" : "Bulk Campaign Launch"}</h1>
        </div>
        <p className="text-muted-foreground">{ar ? "أطلق 200+ إعلان عبر منصات متعددة بنقرة واحدة" : "Launch 200+ ads across multiple platforms in one click"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Select Creatives */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
                {ar ? `اختر الإعلانات (${selectedCreatives.length} محدد)` : `Select Creatives (${selectedCreatives.length} selected)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : readyCreatives.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{ar ? "لا توجد إعلانات جاهزة. أنشئ إعلانات أولاً في الاستوديو." : "No ready creatives. Create some in Studio first."}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {readyCreatives.map((c) => {
                    const selected = selectedCreatives.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCreative(c.id)}
                        className={`relative rounded-xl border overflow-hidden text-left transition-all ${selected ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40"}`}
                        data-testid={`button-creative-${c.id}`}
                      >
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          {c.imageData ? (
                            <img src={c.imageData} alt={c.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {c.mediaType === "video" ? <Play className="w-8 h-8 text-muted-foreground" /> : <Image className="w-8 h-8 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                        {selected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground">{c.brand.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
                {ar ? "اختر المنصات" : "Select Platforms"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLATFORM_OPTIONS.map((p) => {
                  const Icon = p.icon;
                  const selected = selectedPlatforms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePlatform(p.key)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selected ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"} ${p.bg}`}
                      data-testid={`button-platform-${p.key}`}
                    >
                      <Icon className={`w-6 h-6 ${p.color}`} />
                      <span className="text-xs font-medium">{p.label}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Settings & Launch */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
                {ar ? "إعدادات الحملة" : "Campaign Settings"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />{ar ? "اسم الحملة" : "Campaign Name"}</Label>
                <Input placeholder={ar ? "حملة رمضان 2025" : "Ramadan Campaign 2025"} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} data-testid="input-campaign-name-bulk" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{ar ? "الميزانية اليومية (USD)" : "Daily Budget (USD)"}</Label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="input-budget" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{ar ? "تاريخ البداية" : "Start Date"}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-start-date" />
              </div>

              {/* Summary */}
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الإعلانات" : "Creatives"}</span><span className="font-semibold">{selectedCreatives.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "المنصات" : "Platforms"}</span><span className="font-semibold">{selectedPlatforms.length}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-2"><span className="text-muted-foreground">{ar ? "إجمالي الحملات" : "Total Campaigns"}</span><span className="font-bold text-primary">{totalCampaigns}</span></div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleLaunch}
                disabled={launching || launchMutation.isPending || !selectedCreatives.length || !selectedPlatforms.length}
                data-testid="button-bulk-launch"
              >
                {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {ar ? `إطلاق ${totalCampaigns} حملة` : `Launch ${totalCampaigns} Campaigns`}
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          {(launching || results.length > 0) && (
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ar ? "تقدم الإطلاق" : "Launch Progress"}</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${r.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <span>{PLATFORM_OPTIONS.find(p => p.key === r.platform)?.label}</span>
                    <span className="flex items-center gap-1">
                      {r.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : "✗"}
                      {r.status === "success" ? (ar ? "ناجح" : "Success") : (ar ? "فشل" : "Failed")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
