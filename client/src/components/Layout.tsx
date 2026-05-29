import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard, Palette, Wand2, Images, LogOut, ChevronDown, User,
  Languages, Check, Crown, Zap, Link2, BarChart3, MessageSquare, Bot,
  Video, Rocket, Settings2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLang, type Lang } from "@/contexts/LangContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

function LangToggle() {
  const { lang, setLang } = useLang();
  const options: { value: Lang; label: string; native: string }[] = [
    { value: "en", label: "English", native: "English" },
    { value: "ar", label: "Arabic", native: "العربية" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-lang-toggle"
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-accent text-sm font-semibold transition-colors"
          title="Switch language / تغيير اللغة"
        >
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground text-xs">{lang === "ar" ? "ع" : "EN"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => setLang(opt.value)} className="flex items-center justify-between cursor-pointer" data-testid={`lang-option-${opt.value}`}>
            <span>{opt.native}</span>
            {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") return (
    <Badge className="text-[10px] bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-2 py-0 h-4 shadow-sm">PRO</Badge>
  );
  if (plan === "business") return (
    <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-2 py-0 h-4 shadow-sm">BIZ</Badge>
  );
  return null;
}

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  const { t } = useLang();
  if (!user) return null;
  const userPlan = (user as any)?.plan ?? "free";
  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-user-menu"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors w-full group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow shadow-primary/30">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <PlanBadge plan={userPlan} />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <PlanBadge plan={userPlan} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer"><User className="w-4 h-4" />{t.layout.profile}</DropdownMenuItem>
        {userPlan === "free" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 cursor-pointer text-violet-500 focus:text-violet-500 focus:bg-violet-500/10">
              <Link href="/pricing"><Crown className="w-4 h-4" />{t.layout.upgradeToPro}</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} disabled={isLoggingOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive" data-testid="button-logout">
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? t.layout.signingOut : t.layout.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const navColors: Record<string, string> = {
  "/": "text-blue-500 bg-blue-500/10",
  "/brands": "text-pink-500 bg-pink-500/10",
  "/studio": "text-violet-500 bg-violet-500/10",
  "/library": "text-teal-500 bg-teal-500/10",
  "/connections": "text-orange-500 bg-orange-500/10",
  "/analytics": "text-cyan-500 bg-cyan-500/10",
  "/pricing": "text-amber-500 bg-amber-500/10",
  "/campaigns": "text-green-500 bg-green-500/10",
  "/copilot": "text-indigo-500 bg-indigo-500/10",
  "/smart-rules": "text-rose-500 bg-rose-500/10",
  "/ugc": "text-purple-500 bg-purple-500/10",
  "/bulk-launch": "text-sky-500 bg-sky-500/10",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useLang();
  const { user } = useAuth();
  const userPlan = (user as any)?.plan ?? "free";

  const navItems = [
    { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
    { title: t.nav.brands, url: "/brands", icon: Palette },
    { title: t.nav.studio, url: "/studio", icon: Wand2 },
    { title: t.nav.library, url: "/library", icon: Images },
    { title: t.nav.connections, url: "/connections", icon: Link2 },
    { title: t.nav.analytics, url: "/analytics", icon: BarChart3 },
    { title: t.nav.pricing, url: "/pricing", icon: Crown },
  ];

  const aiNavItems = [
    { title: t.nav.campaigns, url: "/campaigns", icon: MessageSquare },
    { title: t.nav.copilot, url: "/copilot", icon: Bot },
    { title: t.nav.smartRules, url: "/smart-rules", icon: Settings2 },
    { title: t.nav.ugc, url: "/ugc", icon: Video },
    { title: t.nav.bulkLaunch, url: "/bulk-launch", icon: Rocket },
  ];

  return (
    <SidebarProvider style={{ "--sidebar-width": "15.5rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="border-r border-sidebar-border">

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-[18px] border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(262,83%,60%), hsl(280,70%,52%))", boxShadow: "0 4px 12px hsl(262,83%,50%/0.35)" }}>
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[13px] text-sidebar-foreground leading-none tracking-tight">NeonAd AI</span>
              <span className="block text-[10px] text-primary font-semibold leading-none mt-1 tracking-widest uppercase opacity-80">{t.layout.aiPlatform}</span>
            </div>
          </div>

          <SidebarContent className="flex flex-col h-full">
            {/* Main nav */}
            <SidebarGroup className="pt-3">
              <SidebarGroupLabel className="text-[10px] tracking-widest uppercase font-bold px-3 mb-1 text-muted-foreground/60">{t.nav.navigation}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.url;
                    const colorClass = navColors[item.url] || "text-muted-foreground";
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                          <Link href={item.url} className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? colorClass : "text-muted-foreground bg-muted/40"} transition-colors`}>
                              <item.icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[13px] font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* AI Tools nav */}
            <SidebarGroup className="pt-2">
              <SidebarGroupLabel className="text-[10px] tracking-widest uppercase font-bold px-3 mb-1 text-muted-foreground/60">{t.nav.aiTools}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {aiNavItems.map((item) => {
                    const isActive = location === item.url;
                    const colorClass = navColors[item.url] || "text-muted-foreground";
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive} data-testid={`nav-${item.url.replace("/", "")}`}>
                          <Link href={item.url} className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? colorClass : "text-muted-foreground bg-muted/40"} transition-colors`}>
                              <item.icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[13px] font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto">
              {/* Upgrade banner */}
              {userPlan === "free" && (
                <div className="px-3 pb-3">
                  <Link href="/pricing">
                    <div className="relative rounded-2xl overflow-hidden cursor-pointer group"
                      style={{ background: "linear-gradient(135deg, hsl(262,83%,25%/0.8), hsl(280,70%,30%/0.8))", border: "1px solid hsl(262,83%,50%/0.25)" }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: "linear-gradient(135deg, hsl(262,83%,30%/0.5), hsl(280,70%,35%/0.5))" }} />
                      <div className="relative p-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-md bg-amber-400/20 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-amber-400" />
                          </div>
                          <span className="text-xs font-bold text-white/90">{t.layout.upgradeToPro}</span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed">Unlock video generation & advanced AI tools</p>
                        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-violet-300">
                          <span>View plans</span>
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* User section */}
              <div className="p-3 border-t border-sidebar-border">
                <UserMenu />
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="w-8 h-8 rounded-xl hover:bg-accent transition-colors"
            />
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
