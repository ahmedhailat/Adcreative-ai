import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Send, Trash2, Upload, Phone, MessageSquare, CheckCircle2, Clock, AlertCircle, Users } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface Campaign {
  id: number;
  name: string;
  message: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string; icon: any }> = {
  draft:     { label: "Draft",     labelAr: "مسودة",        color: "bg-muted text-muted-foreground",          icon: null },
  scheduled: { label: "Scheduled", labelAr: "مجدولة",       color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  sending:   { label: "Sending",   labelAr: "جارٍ الإرسال", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Loader2 },
  sent:      { label: "Sent",      labelAr: "مُرسلة",       color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  failed:    { label: "Failed",    labelAr: "فشلت",         color: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertCircle },
};

export default function Campaigns() {
  const { lang, isRTL } = useLang();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName]       = useState("");
  const [message, setMessage] = useState("");
  const [type, setType]       = useState("whatsapp");
  const [phones, setPhones]   = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowCreate(false);
      resetForm();
      toast({ title: ar ? "تم إنشاء الحملة" : "Campaign created" });
    },
    onError: () => toast({ title: ar ? "فشل الإنشاء" : "Failed", variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: ar ? "جارٍ إرسال الحملة" : "Campaign is sending" });
    },
    onError: (err: any) => toast({ title: err?.message || (ar ? "فشل الإرسال" : "Send failed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: ar ? "تم حذف الحملة" : "Campaign deleted" });
    },
  });

  function resetForm() {
    setName(""); setMessage(""); setType("whatsapp");
    setPhones([]); setPhoneInput(""); setScheduledAt("");
  }

  function addPhone() {
    const p = phoneInput.trim();
    if (p && !phones.includes(p)) {
      setPhones([...phones, p]);
      setPhoneInput("");
    }
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const extracted: string[] = [];
      lines.forEach(line => {
        const parts = line.split(",");
        parts.forEach(p => {
          const cleaned = p.replace(/[^\d+]/g, "");
          if (cleaned.length >= 9 && (cleaned.startsWith("+") || cleaned.startsWith("00"))) {
            extracted.push(cleaned);
          }
        });
      });
      const unique = Array.from(new Set([...phones, ...extracted]));
      setPhones(unique);
      toast({ title: ar ? `تم استيراد ${extracted.length} رقم` : `Imported ${extracted.length} numbers` });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleCreate() {
    if (!name || !message || phones.length === 0) {
      toast({ title: ar ? "يرجى ملء جميع الحقول وإضافة مستلم واحد على الأقل" : "Fill all fields and add at least one recipient", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name, message, type, phones, scheduledAt: scheduledAt || null });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{ar ? "الحملات" : "Campaigns"}</h1>
          <p className="text-muted-foreground mt-1">
            {ar ? "إرسال رسائل WhatsApp و SMS إلى جهات اتصالك في الدول العربية" : "Send WhatsApp & SMS to contacts in Arab countries"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2" data-testid="button-new-campaign">
          <Plus className="w-4 h-4" />
          {ar ? "حملة جديدة" : "New Campaign"}
        </Button>
      </div>

      {/* Supported Countries Banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400">
        <Phone className="w-4 h-4 shrink-0" />
        <span>{ar ? "الدول المدعومة: السعودية (+966) · الإمارات (+971) · مصر (+20) · الكويت (+965) · والمزيد" : "Supported: Saudi (+966) · UAE (+971) · Egypt (+20) · Kuwait (+965) · and more"}</span>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{ar ? "لا توجد حملات بعد" : "No campaigns yet"}</p>
              <p className="text-muted-foreground text-sm mt-1">{ar ? "أنشئ حملتك الأولى لإرسال رسائل WhatsApp و SMS" : "Create your first campaign to send WhatsApp & SMS"}</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {ar ? "إنشاء حملة" : "Create Campaign"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const s = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
            const SIcon = s.icon;
            return (
              <Card key={campaign.id} className="border-border/60 hover:border-primary/30 transition-all" data-testid={`card-campaign-${campaign.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${campaign.type === "whatsapp" ? "bg-emerald-500/15" : "bg-blue-500/15"}`}>
                        {campaign.type === "whatsapp" ? (
                          <SiWhatsapp className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{campaign.name}</span>
                          <Badge className={`text-xs gap-1 border ${s.color}`}>
                            {SIcon && <SIcon className={`w-3 h-3 ${campaign.status === "sending" ? "animate-spin" : ""}`} />}
                            {ar ? s.labelAr : s.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{campaign.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{campaign.totalContacts} {ar ? "مستلم" : "recipients"}</span>
                          {campaign.sentCount > 0 && <span className="text-emerald-400">✓ {campaign.sentCount}</span>}
                          {campaign.failedCount > 0 && <span className="text-red-400">✗ {campaign.failedCount}</span>}
                          {campaign.scheduledAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(campaign.scheduledAt).toLocaleString(ar ? "ar-SA" : "en-US")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(campaign.status === "draft" || campaign.status === "scheduled") && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          disabled={sendMutation.isPending}
                          data-testid={`button-send-${campaign.id}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {ar ? "إرسال" : "Send"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(campaign.id)}
                        data-testid={`button-delete-campaign-${campaign.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{ar ? "إنشاء حملة جديدة" : "Create New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Type */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, color: "text-emerald-400" },
                { value: "sms",     label: "SMS",       icon: MessageSquare, color: "text-blue-400" },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${type === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                    data-testid={`button-type-${opt.value}`}
                  >
                    <Icon className={`w-5 h-5 ${opt.color}`} />
                    <span className="font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>{ar ? "اسم الحملة" : "Campaign Name"}</Label>
              <Input
                placeholder={ar ? "مثال: عروض رمضان 2025" : "e.g. Ramadan Sale 2025"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-campaign-name"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label>{ar ? "نص الرسالة (بالعربية)" : "Message Text (Arabic)"}</Label>
              <Textarea
                dir="rtl"
                placeholder={ar ? "اكتب رسالتك هنا بالعربية..." : "Write your Arabic message here..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="font-arabic text-base"
                data-testid="input-campaign-message"
              />
              <p className="text-xs text-muted-foreground">{message.length} {ar ? "حرف" : "chars"}</p>
            </div>

            {/* Phone Numbers */}
            <div className="space-y-2">
              <Label>{ar ? "أرقام المستلمين" : "Recipient Numbers"}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="+966501234567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPhone()}
                  className="font-mono"
                  data-testid="input-phone-number"
                />
                <Button type="button" variant="outline" onClick={addPhone}>
                  {ar ? "إضافة" : "Add"}
                </Button>
              </div>
              {phones.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                  {phones.map((p, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs gap-1 pr-1">
                      {p}
                      <button onClick={() => setPhones(phones.filter((_, j) => j !== i))} className="hover:text-destructive ml-1">×</button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  {ar ? "رفع ملف CSV" : "Upload CSV"}
                </Button>
                <span className="text-xs text-muted-foreground">{ar ? "الملف يحتوي على عمود phone" : "CSV with phone column"}</span>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
              </div>
              <p className="text-xs text-muted-foreground">{phones.length} {ar ? "رقم مضاف" : "numbers added"}</p>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label>{ar ? "جدولة الإرسال (اختياري)" : "Schedule (optional)"}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                data-testid="input-schedule"
              />
              <p className="text-xs text-muted-foreground">{ar ? "اتركه فارغاً للإرسال الفوري عند الضغط على إرسال" : "Leave empty to send immediately when you click Send"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2" data-testid="button-create-campaign">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {ar ? "إنشاء الحملة" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
