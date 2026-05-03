import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, Unlink, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { SiFacebook, SiGoogle, SiTiktok, SiSnapchat, SiX } from "react-icons/si";

const PLATFORMS = [
  {
    key: "meta",
    name: "Meta Ads",
    nameAr: "Meta Ads",
    description: "Facebook & Instagram Ads",
    descriptionAr: "إعلانات فيسبوك وإنستغرام",
    icon: SiFacebook,
    color: "#1877F2",
    bg: "bg-blue-500/10 border-blue-500/30",
    iconColor: "text-blue-500",
  },
  {
    key: "google",
    name: "Google Ads",
    nameAr: "Google Ads",
    description: "Search, Display & YouTube",
    descriptionAr: "البحث، الإعلانات المصوّرة ويوتيوب",
    icon: SiGoogle,
    color: "#4285F4",
    bg: "bg-red-500/10 border-red-500/30",
    iconColor: "text-red-500",
  },
  {
    key: "tiktok",
    name: "TikTok Ads",
    nameAr: "TikTok Ads",
    description: "Short video advertising",
    descriptionAr: "إعلانات الفيديو القصير",
    icon: SiTiktok,
    color: "#010101",
    bg: "bg-pink-500/10 border-pink-500/30",
    iconColor: "text-pink-500",
  },
  {
    key: "snapchat",
    name: "Snapchat Ads",
    nameAr: "Snapchat Ads",
    description: "Stories & Snap ads",
    descriptionAr: "إعلانات القصص والسناب",
    icon: SiSnapchat,
    color: "#FFFC00",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    iconColor: "text-yellow-500",
  },
  {
    key: "twitter",
    name: "X (Twitter) Ads",
    nameAr: "X (Twitter) Ads",
    description: "Timeline & promoted tweets",
    descriptionAr: "التايم لاين والتغريدات الممولة",
    icon: SiX,
    color: "#000000",
    bg: "bg-foreground/10 border-foreground/20",
    iconColor: "text-foreground",
  },
];

interface AdAccount {
  id: number;
  platform: string;
  accountId: string;
  accountName: string;
  status: string;
  connectedAt: string;
}

export default function Connections() {
  const { t, isRTL, lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const ct = t.connections;

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data: accounts = [], isLoading } = useQuery<AdAccount[]>({
    queryKey: ["/api/ad-accounts"],
  });

  const connectMutation = useMutation({
    mutationFn: (data: { platform: string; accountId: string; accountName: string }) =>
      apiRequest("POST", "/api/ad-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
      setConnectingPlatform(null);
      setAccountId("");
      setAccountName("");
      toast({ title: ct.connected, description: ct.connectedDesc });
    },
    onError: () => {
      toast({ title: ct.failed, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ad-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
      toast({ title: ct.disconnected, description: ct.disconnectedDesc });
    },
  });

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));
  const userPlan = (user as any)?.plan ?? "free";
  const canConnect = userPlan !== "free";

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">{ct.title}</h1>
        <p className="text-muted-foreground mt-1">{ct.subtitle}</p>
      </div>

      {!canConnect && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-500">{ct.proRequired}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ct.proRequiredDesc}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const connected = connectedPlatforms.has(platform.key);
          const account = accounts.find((a) => a.platform === platform.key);
          const Icon = platform.icon;

          return (
            <Card
              key={platform.key}
              className={`border transition-all ${connected ? "border-primary/40 bg-primary/5" : "border-border/60"}`}
              data-testid={`card-platform-${platform.key}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${platform.bg}`}>
                    <Icon className={`w-5 h-5 ${platform.iconColor}`} />
                  </div>
                  {connected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {ct.connected}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {ct.notConnected}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">
                  {lang === "ar" ? platform.nameAr : platform.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {lang === "ar" ? platform.descriptionAr : platform.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {connected && account && (
                  <div className="mb-3 p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{ct.accountName}:</span>
                      <span className="font-medium">{account.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{ct.accountId}:</span>
                      <span className="font-mono">{account.accountId}</span>
                    </div>
                  </div>
                )}
                {connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => disconnectMutation.mutate(account!.id)}
                    disabled={disconnectMutation.isPending}
                    data-testid={`button-disconnect-${platform.key}`}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5" />
                    )}
                    {ct.disconnect}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      if (!canConnect) return;
                      setConnectingPlatform(platform.key);
                    }}
                    disabled={!canConnect}
                    data-testid={`button-connect-${platform.key}`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {ct.connect}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <Dialog open={!!connectingPlatform} onOpenChange={(o) => !o && setConnectingPlatform(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ct.connectAccount}</DialogTitle>
            <DialogDescription>
              {ct.connectAccountDesc} {PLATFORMS.find((p) => p.key === connectingPlatform)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">{ct.accountName}</Label>
              <Input
                id="account-name"
                placeholder={ct.accountNamePlaceholder}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                data-testid="input-account-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-id">{ct.accountId}</Label>
              <Input
                id="account-id"
                placeholder={ct.accountIdPlaceholder}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                data-testid="input-account-id"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectingPlatform(null)}>
              {t.brands.cancel}
            </Button>
            <Button
              onClick={() =>
                connectMutation.mutate({
                  platform: connectingPlatform!,
                  accountId,
                  accountName,
                })
              }
              disabled={!accountId || !accountName || connectMutation.isPending}
              data-testid="button-confirm-connect"
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {ct.connect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
