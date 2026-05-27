import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Zap, TrendingDown, TrendingUp, PauseCircle, DollarSign, Bell } from "lucide-react";

interface Rule {
  id: number;
  name: string;
  platform: string;
  condition: string;
  threshold: string;
  action: string;
  actionValue: string | null;
  isActive: boolean;
  triggeredCount: number;
  createdAt: string;
}

const CONDITIONS = [
  { value: "cpa_exceeds",   labelEn: "CPA exceeds",         labelAr: "تكلفة التحويل تتجاوز",   icon: TrendingUp },
  { value: "roas_below",    labelEn: "ROAS falls below",    labelAr: "عائد الإنفاق أقل من",      icon: TrendingDown },
  { value: "ctr_below",     labelEn: "CTR falls below",     labelAr: "نسبة النقر أقل من",        icon: TrendingDown },
  { value: "spend_exceeds", labelEn: "Daily spend exceeds", labelAr: "الإنفاق اليومي يتجاوز",   icon: DollarSign },
];

const ACTIONS = [
  { value: "pause_ad",     labelEn: "Pause Ad",          labelAr: "إيقاف الإعلان",            icon: PauseCircle },
  { value: "scale_budget", labelEn: "Scale Budget",      labelAr: "زيادة الميزانية",           icon: TrendingUp },
  { value: "send_alert",   labelEn: "Send Alert",        labelAr: "إرسال تنبيه",               icon: Bell },
];

const PLATFORMS = [
  { value: "all",      labelEn: "All Platforms", labelAr: "جميع المنصات" },
  { value: "meta",     labelEn: "Meta Ads",      labelAr: "Meta Ads" },
  { value: "google",   labelEn: "Google Ads",    labelAr: "Google Ads" },
  { value: "tiktok",   labelEn: "TikTok Ads",    labelAr: "TikTok Ads" },
  { value: "snapchat", labelEn: "Snapchat Ads",  labelAr: "Snapchat Ads" },
];

export default function SmartRules() {
  const { lang, isRTL } = useLang();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName]         = useState("");
  const [platform, setPlatform] = useState("all");
  const [condition, setCondition] = useState("cpa_exceeds");
  const [threshold, setThreshold] = useState("");
  const [action, setAction]     = useState("pause_ad");
  const [actionValue, setActionValue] = useState("");

  const { data: rules = [], isLoading } = useQuery<Rule[]>({ queryKey: ["/api/automation-rules"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/automation-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      setShowCreate(false);
      resetForm();
      toast({ title: ar ? "تم إنشاء القاعدة" : "Rule created" });
    },
    onError: () => toast({ title: ar ? "فشل الإنشاء" : "Failed", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PUT", `/api/automation-rules/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/automation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: ar ? "تم حذف القاعدة" : "Rule deleted" });
    },
  });

  function resetForm() {
    setName(""); setPlatform("all"); setCondition("cpa_exceeds");
    setThreshold(""); setAction("pause_ad"); setActionValue("");
  }

  const condInfo = CONDITIONS.find(c => c.value === condition);
  const actInfo  = ACTIONS.find(a => a.value === action);

  return (
    <div className="max-w-5xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{ar ? "القواعد الذكية" : "Smart Rules"}</h1>
          <p className="text-muted-foreground mt-1">
            {ar ? "أتمتة إيقاف الإعلانات الضعيفة وتوسيع الناجحة تلقائياً" : "Auto-pause underperforming ads and scale winning ones"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2" data-testid="button-new-rule">
          <Plus className="w-4 h-4" />
          {ar ? "قاعدة جديدة" : "New Rule"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: ar ? "قواعد نشطة" : "Active Rules",    value: rules.filter(r => r.isActive).length, color: "text-emerald-400" },
          { label: ar ? "إجمالي القواعد" : "Total Rules", value: rules.length,                          color: "text-foreground" },
          { label: ar ? "مرات التفعيل" : "Times Triggered", value: rules.reduce((s, r) => s + r.triggeredCount, 0), color: "text-amber-400" },
        ].map((s, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{ar ? "لا توجد قواعد بعد" : "No rules yet"}</p>
              <p className="text-muted-foreground text-sm mt-1">{ar ? "أنشئ قاعدتك الأولى لأتمتة إدارة إعلاناتك" : "Create your first rule to automate ad management"}</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" />{ar ? "إنشاء قاعدة" : "Create Rule"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const cond = CONDITIONS.find(c => c.value === rule.condition);
            const act  = ACTIONS.find(a => a.value === rule.action);
            const plat = PLATFORMS.find(p => p.value === rule.platform);
            const CondIcon = cond?.icon ?? TrendingUp;
            const ActIcon  = act?.icon  ?? Zap;
            return (
              <Card key={rule.id} className={`border transition-all ${rule.isActive ? "border-primary/30 bg-primary/5" : "border-border/40 opacity-60"}`} data-testid={`card-rule-${rule.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">{ar ? plat?.labelAr : plat?.labelEn}</Badge>
                        {rule.triggeredCount > 0 && (
                          <Badge className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/30">
                            {ar ? `فُعِّل ${rule.triggeredCount} مرة` : `Triggered ${rule.triggeredCount}x`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <CondIcon className="w-3.5 h-3.5 text-amber-400" />
                          {ar ? cond?.labelAr : cond?.labelEn} <strong className="text-foreground">{rule.threshold}</strong>
                        </span>
                        <span className="text-muted-foreground/50">→</span>
                        <span className="flex items-center gap-1">
                          <ActIcon className="w-3.5 h-3.5 text-primary" />
                          {ar ? act?.labelAr : act?.labelEn}
                          {rule.actionValue && <strong className="text-foreground">{rule.actionValue}%</strong>}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(rule.id)} data-testid={`button-delete-rule-${rule.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{ar ? "إنشاء قاعدة ذكية" : "Create Smart Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{ar ? "اسم القاعدة" : "Rule Name"}</Label>
              <Input placeholder={ar ? "مثال: إيقاف إعلانات CPA عالي" : "e.g. Pause high CPA ads"} value={name} onChange={(e) => setName(e.target.value)} data-testid="input-rule-name" />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "المنصة" : "Platform"}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="select-rule-platform"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{ar ? p.labelAr : p.labelEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{ar ? "الشرط" : "Condition"}</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger data-testid="select-rule-condition"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{ar ? c.labelAr : c.labelEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{ar ? "القيمة" : "Threshold"}</Label>
                <Input placeholder={condition.includes("ctr") ? "2%" : condition.includes("roas") ? "2.5" : "$50"} value={threshold} onChange={(e) => setThreshold(e.target.value)} data-testid="input-rule-threshold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{ar ? "الإجراء" : "Action"}</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger data-testid="select-rule-action"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{ar ? a.labelAr : a.labelEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {action === "scale_budget" && (
                <div className="space-y-1.5">
                  <Label>{ar ? "نسبة الزيادة %" : "Scale by %"}</Label>
                  <Input placeholder="20" value={actionValue} onChange={(e) => setActionValue(e.target.value)} data-testid="input-rule-action-value" />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-sm">
              <p className="text-muted-foreground text-xs mb-1">{ar ? "معاينة القاعدة:" : "Rule preview:"}</p>
              <p>
                {ar
                  ? `إذا كان ${condInfo?.labelAr} ${threshold || "..."} على ${PLATFORMS.find(p=>p.value===platform)?.labelAr}، قم بـ ${actInfo?.labelAr}${action==="scale_budget" && actionValue ? ` بنسبة ${actionValue}%` : ""}`
                  : `If ${condInfo?.labelEn} ${threshold || "..."} on ${PLATFORMS.find(p=>p.value===platform)?.labelEn}, then ${actInfo?.labelEn}${action==="scale_budget" && actionValue ? ` by ${actionValue}%` : ""}`
                }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => createMutation.mutate({ name, platform, condition, threshold, action, actionValue: actionValue || null })} disabled={!name || !threshold || createMutation.isPending} className="gap-2" data-testid="button-create-rule">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {ar ? "إنشاء القاعدة" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
