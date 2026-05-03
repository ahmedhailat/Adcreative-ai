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
import { LayoutDashboard, Palette, Wand2, Images, LogOut, ChevronDown, User, Languages, Check, Crown, Zap, Link2, BarChart3 } from "lucide-react";
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
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/60 bg-background/50 hover:bg-accent text-sm font-semibold transition-colors"
          title="Switch language / تغيير اللغة"
        >
          <Languages className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{lang === "ar" ? "ع" : "EN"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLang(opt.value)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`lang-option-${opt.value}`}
          >
            <span>{opt.native}</span>
            {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") {
    return (
      <Badge className="text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 px-2 py-0 h-4">
        PRO
      </Badge>
    );
  }
  if (plan === "business") {
    return (
      <Badge className="text-[10px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-2 py-0 h-4">
        BIZ
      </Badge>
    );
  }
  return null;
}

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  const { t } = useLang();
  if (!user) return null;

  const userPlan = (user as any)?.plan ?? "free";

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-user-menu"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors w-full"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <PlanBadge plan={userPlan} />
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <PlanBadge plan={userPlan} />
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <User className="w-4 h-4" />
          {t.layout.profile}
        </DropdownMenuItem>
        {userPlan === "free" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 cursor-pointer text-purple-500 focus:text-purple-500 focus:bg-purple-500/10">
              <Link href="/pricing">
                <Crown className="w-4 h-4" />
                {t.layout.upgradeToPro}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          disabled={isLoggingOut}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? t.layout.signingOut : t.layout.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm text-sidebar-foreground leading-none">{t.layout.appName}</span>
              <span className="block text-[10px] text-primary font-semibold leading-none mt-0.5">{t.layout.aiPlatform}</span>
            </div>
          </div>

          <SidebarContent className="flex flex-col justify-between h-full">
            <SidebarGroup>
              <SidebarGroupLabel>{t.nav.navigation}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Upgrade banner for free users */}
            {userPlan === "free" && (
              <div className="px-3 pb-3">
                <Link href="/pricing">
                  <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 p-3.5 cursor-pointer hover:border-purple-500/50 transition-colors group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-purple-400">{t.layout.upgradeToPro}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Unlock video generation & more creatives
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {/* User section at bottom */}
            <div className="p-3 border-t border-sidebar-border mt-auto">
              <UserMenu />
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
