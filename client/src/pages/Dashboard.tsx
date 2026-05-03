import { useDashboardStats } from "@/hooks/use-dashboard";
import { useCreatives } from "@/hooks/use-creatives";
import { useBrands } from "@/hooks/use-brands";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/contexts/LangContext";
import {
  Wand2, Palette, Images, Sparkles, TrendingUp,
  ArrowRight, Loader2, Heart, Star, Zap, Target,
  BarChart3, CheckCircle2, Clock, FileImage
} from "lucide-react";
import { SiFacebook, SiInstagram, SiGoogle, SiTiktok, SiX } from "react-icons/si";
import { Linkedin as SiLinkedin } from "lucide-react";
import { motion } from "framer-motion";

const PLATFORM_META: Record<string, { label: string; color: string; Icon: any }> = {
  facebook: { label: "Facebook", color: "#1877f2", Icon: SiFacebook },
  instagram: { label: "Instagram", color: "#e1306c", Icon: SiInstagram },
  google: { label: "Google", color: "#4285f4", Icon: SiGoogle },
  tiktok: { label: "TikTok", color: "#ff0050", Icon: SiTiktok },
  linkedin: { label: "LinkedIn", color: "#0077b5", Icon: SiLinkedin },
  twitter: { label: "Twitter/X", color: "#1da1f2", Icon: SiX },
};

function StatCard({ label, value, icon: Icon, color, bg, delay = 0, isLoading }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="glass-card rounded-2xl p-5 hover-lift flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {isLoading ? (
            <div className="h-9 w-14 bg-muted animate-pulse rounded-lg mt-1" />
          ) : (
            <p className="text-3xl font-extrabold mt-1 tabular-nums">{value}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: creatives, isLoading: creativesLoading } = useCreatives();
  const { data: brands } = useBrands();

  const recentCreatives = creatives?.slice(-6).reverse() || [];

  const platformCounts: Record<string, number> = {};
  creatives?.forEach((c: any) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });
  const topPlatforms = Object.entries(platformCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const firstName = user?.name?.split(" ")[0] || "there";

  const quickActions = [
    { href: "/studio", icon: Sparkles, label: t.dashboard.generateNew, desc: t.dashboard.generateNewDesc, color: "text-primary bg-primary/10" },
    { href: "/brands", icon: Palette, label: t.dashboard.addBrand, desc: t.dashboard.addBrandDesc, color: "text-blue-500 bg-blue-500/10" },
    { href: "/library", icon: Images, label: t.dashboard.browseLibrary, desc: t.dashboard.browseLibraryDesc, color: "text-purple-500 bg-purple-500/10" },
  ];

  const gettingStartedSteps = [
    { label: t.dashboard.createAccount, done: true, href: null },
    { label: t.dashboard.setupBrand, done: (brands?.length ?? 0) > 0, href: "/brands" },
    { label: t.dashboard.generateFirst, done: (stats?.totalCreatives ?? 0) > 0, href: "/studio" },
    { label: t.dashboard.downloadPublish, done: (stats?.readyCreatives ?? 0) > 0, href: "/library" },
  ];

  return (
    <div className="space-y-8 pb-12">

      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(262,83%,28%)] via-[hsl(262,80%,35%)] to-[hsl(280,75%,45%)] p-8 md:p-10 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />
        <div className="absolute top-6 right-8 hidden md:grid grid-cols-4 gap-2 opacity-20 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-white/30" style={{ opacity: 0.3 + (i % 3) * 0.2 }} />
          ))}
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs font-bold text-white/90 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {t.dashboard.poweredBy}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-2">
            {t.dashboard.welcomeBack.replace("{name}", firstName)}
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-6 leading-relaxed">
            {t.dashboard.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/studio">
              <Button size="lg" className="h-11 px-6 rounded-xl bg-white text-[hsl(262,83%,40%)] hover:bg-white/90 font-bold shadow-lg" data-testid="button-start-generating">
                <Sparkles className="w-4 h-4 me-2" /> {t.dashboard.generateCreative}
              </Button>
            </Link>
            <Link href="/brands">
              <Button size="lg" variant="outline" className="h-11 px-6 rounded-xl border-white/30 text-white hover:bg-white/10 font-semibold" data-testid="button-manage-brands">
                <Palette className="w-4 h-4 me-2" /> {t.dashboard.manageBrands}
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t.dashboard.totalBrands} value={stats?.totalBrands ?? 0} icon={Palette} color="text-blue-500" bg="bg-blue-500/10" delay={0} isLoading={statsLoading} />
        <StatCard label={t.dashboard.creativesMade} value={stats?.totalCreatives ?? 0} icon={Wand2} color="text-primary" bg="bg-primary/10" delay={0.05} isLoading={statsLoading} />
        <StatCard label={t.dashboard.readyToUse} value={stats?.readyCreatives ?? 0} icon={CheckCircle2} color="text-green-500" bg="bg-green-500/10" delay={0.1} isLoading={statsLoading} />
        <StatCard label={t.dashboard.favorites} value={stats?.favoritedCreatives ?? 0} icon={Heart} color="text-rose-500" bg="bg-rose-500/10" delay={0.15} isLoading={statsLoading} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> {t.dashboard.quickActions}
            </h2>
            <div className="space-y-2">
              {quickActions.map(({ href, icon: Icon, label, desc, color }) => (
                <Link href={href} key={href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group" data-testid={`quick-action-${href.replace('/', '')}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> {t.dashboard.platformUsage}
            </h2>
            {topPlatforms.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t.dashboard.noDataYet}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topPlatforms.map(([platform, count]) => {
                  const meta = PLATFORM_META[platform];
                  if (!meta) return null;
                  const pct = Math.round((count / (creatives?.length || 1)) * 100);
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <meta.Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span className="font-medium">{meta.label}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Brands Summary */}
          {brands && brands.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> {t.dashboard.yourBrands}
                </h2>
                <Link href="/brands">
                  <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2 rounded-lg">{t.dashboard.viewAll}</Button>
                </Link>
              </div>
              <div className="space-y-2">
                {brands.slice(0, 4).map((brand: any) => (
                  <div key={brand.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`brand-item-${brand.id}`}>
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                         style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                      {brand.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">{brand.industry}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Creatives */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> {t.dashboard.recentCreatives}
              </h2>
              <Link href="/library">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-3 rounded-lg" data-testid="button-view-library">
                  {t.dashboard.viewAll2} <ArrowRight className="w-3 h-3 ms-1" />
                </Button>
              </Link>
            </div>

            {creativesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recentCreatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileImage className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-2">{t.dashboard.noCreativesYet}</h3>
                <p className="text-muted-foreground text-sm mb-5 max-w-xs">
                  {t.dashboard.noCreativesDesc}
                </p>
                <Link href="/studio">
                  <Button className="rounded-xl shadow-md" data-testid="button-create-first">
                    <Sparkles className="w-4 h-4 me-2" /> {t.dashboard.createFirstAd}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recentCreatives.map((creative: any, idx: number) => {
                  const platform = PLATFORM_META[creative.platform];
                  return (
                    <motion.div
                      key={creative.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06 }}
                      className="group relative rounded-xl overflow-hidden bg-muted aspect-square cursor-pointer"
                      data-testid={`creative-card-${creative.id}`}
                    >
                      {creative.status === "generating" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                          <span className="text-xs font-medium text-muted-foreground">{t.dashboard.generating}</span>
                        </div>
                      ) : creative.imageData ? (
                        <img src={creative.imageData} alt={creative.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-xs font-medium">
                          {t.common.failed}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs font-semibold truncate">{creative.title}</p>
                          {platform && (
                            <div className="flex items-center gap-1 mt-1">
                              <platform.Icon className="w-3 h-3" style={{ color: platform.color }} />
                              <span className="text-white/70 text-[10px]">{platform.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 flex gap-1">
                        {creative.status === "ready" && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-md">READY</span>
                        )}
                        {creative.isFavorite && (
                          <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                            <Heart className="w-2.5 h-2.5 text-white" fill="white" />
                          </span>
                        )}
                      </div>
                      {creative.performanceScore && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur text-white text-[9px] font-bold rounded-md">
                          {creative.performanceScore}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> {t.dashboard.whatYouCanCreate}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Facebook Ads", sub: "Feed & Stories", color: "#1877f2" },
              { label: "Instagram Ads", sub: "Posts & Reels", color: "#e1306c" },
              { label: "Google Display", sub: "Banners & Tiles", color: "#4285f4" },
              { label: "TikTok Ads", sub: "Vertical Videos", color: "#ff0050" },
              { label: "LinkedIn Ads", sub: "Professional", color: "#0077b5" },
              { label: "Twitter/X Ads", sub: "Timeline Posts", color: "#1da1f2" },
            ].map(({ label, sub, color }) => (
              <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-sm font-semibold leading-none">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> {t.dashboard.gettingStarted}
          </h2>
          <div className="space-y-3">
            {gettingStartedSteps.map(({ label, done, href }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${done ? "bg-green-500/5" : "bg-muted/40 hover:bg-muted/60"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "border-2 border-border"}`}>
                  {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : "font-medium"}`}>{label}</span>
                {!done && href && (
                  <Link href={href}>
                    <Button variant="ghost" size="sm" className="h-7 px-3 text-xs rounded-lg text-primary">
                      {t.common.go} <ArrowRight className="w-3 h-3 ms-1" />
                    </Button>
                  </Link>
                )}
                {done && <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
