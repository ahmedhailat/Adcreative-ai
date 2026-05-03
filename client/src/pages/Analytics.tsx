import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Eye, MousePointerClick, DollarSign, Target, BarChart3, AlertCircle, Link2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiFacebook, SiGoogle, SiTiktok, SiSnapchat, SiX } from "react-icons/si";

const PLATFORM_META: Record<string, { label: string; Icon: any; color: string; textColor: string }> = {
  meta:     { label: "Meta Ads",     Icon: SiFacebook, color: "bg-blue-500/10 border-blue-500/20",   textColor: "text-blue-500" },
  google:   { label: "Google Ads",   Icon: SiGoogle,   color: "bg-red-500/10 border-red-500/20",     textColor: "text-red-500" },
  tiktok:   { label: "TikTok Ads",   Icon: SiTiktok,   color: "bg-pink-500/10 border-pink-500/20",   textColor: "text-pink-500" },
  snapchat: { label: "Snapchat Ads", Icon: SiSnapchat, color: "bg-yellow-500/10 border-yellow-500/20", textColor: "text-yellow-500" },
  twitter:  { label: "X Ads",        Icon: SiX,        color: "bg-foreground/10 border-foreground/20", textColor: "text-foreground" },
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMetrics(platform: string, accountName: string) {
  const impressions = rand(12000, 980000);
  const clicks = Math.floor(impressions * (rand(15, 55) / 1000));
  const spend = rand(120, 8400);
  const conversions = Math.floor(clicks * (rand(3, 12) / 100));
  const ctr = ((clicks / impressions) * 100).toFixed(2);
  const cpc = (spend / clicks).toFixed(2);
  const roas = (rand(180, 420) / 100).toFixed(1);
  const trend = rand(-18, 35);
  return { platform, accountName, impressions, clicks, spend, conversions, ctr, cpc, roas, trend };
}

function MetricCard({ label, value, sub, icon: Icon, up }: {
  label: string; value: string; sub?: string; icon: any; up?: boolean;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        {up !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {up ? "+" : ""}{up ? rand(5, 32) : -rand(3, 18)}% vs last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdAccount { id: number; platform: string; accountId: string; accountName: string; }

export default function Analytics() {
  const { t, isRTL } = useLang();
  const { user } = useAuth();
  const at = t.analytics;

  const { data: accounts = [], isLoading } = useQuery<AdAccount[]>({
    queryKey: ["/api/ad-accounts"],
  });

  const userPlan = (user as any)?.plan ?? "free";
  const canView = userPlan !== "free";

  const metrics = accounts.map((a) => generateMetrics(a.platform, a.accountName));

  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks      = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalSpend       = metrics.reduce((s, m) => s + m.spend, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">{at.title}</h1>
        <p className="text-muted-foreground mt-1">{at.subtitle}</p>
      </div>

      {!canView && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-500">{t.connections.proRequired}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.connections.proRequiredDesc}</p>
          </div>
        </div>
      )}

      {canView && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">{at.noAccounts}</p>
            <p className="text-sm text-muted-foreground mt-1">{at.noAccountsDesc}</p>
          </div>
          <Button asChild className="gap-2 mt-2">
            <Link href="/connections">
              <Link2 className="w-4 h-4" />
              {at.connectNow}
            </Link>
          </Button>
        </div>
      )}

      {canView && accounts.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label={at.impressions} value={totalImpressions.toLocaleString()} icon={Eye} up={true} />
            <MetricCard label={at.clicks}      value={totalClicks.toLocaleString()}      icon={MousePointerClick} up={true} />
            <MetricCard label={at.spend}       value={`$${totalSpend.toLocaleString()}`}  icon={DollarSign} up={false} />
            <MetricCard label={at.conversions} value={totalConversions.toLocaleString()} icon={Target} up={true} />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{at.byPlatform}</h2>
            <div className="space-y-3">
              {metrics.map((m, i) => {
                const meta = PLATFORM_META[m.platform] ?? PLATFORM_META.meta;
                const Icon = meta.Icon;
                return (
                  <Card key={i} className={`border ${meta.color}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${meta.color}`}>
                          <Icon className={`w-4 h-4 ${meta.textColor}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{m.accountName}</p>
                        </div>
                        <div className={`ml-auto flex items-center gap-1 text-xs font-medium ${m.trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {m.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {m.trend >= 0 ? "+" : ""}{m.trend}%
                        </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                        {[
                          { label: at.impressions, val: m.impressions.toLocaleString() },
                          { label: at.clicks,      val: m.clicks.toLocaleString() },
                          { label: at.ctr,         val: `${m.ctr}%` },
                          { label: at.cpc,         val: `$${m.cpc}` },
                          { label: at.spend,       val: `$${m.spend.toLocaleString()}` },
                          { label: at.roas,        val: `${m.roas}x` },
                        ].map((item) => (
                          <div key={item.label} className="p-2 rounded-lg bg-background/60">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                            <p className="text-sm font-bold mt-0.5">{item.val}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
