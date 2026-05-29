import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { Wand2, Sparkles, Zap, TrendingUp, Eye, EyeOff, Loader2, Languages, Check, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lang } from "@/contexts/LangContext";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const metrics = [
  { value: "4.2×", label: "Avg. ROAS Boost", color: "from-violet-500 to-purple-600" },
  { value: "2.8M+", label: "Ads Generated", color: "from-pink-500 to-rose-600" },
  { value: "98%", label: "Satisfaction Rate", color: "from-emerald-500 to-teal-600" },
];

export default function Login() {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest("POST", "/api/auth/login", data),
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    },
    onError: (err: any) => {
      toast({ title: t.login.loginFailed, description: err.message || t.login.invalidCredentials, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("POST", "/api/auth/register", data),
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    },
    onError: (err: any) => {
      toast({ title: t.login.registerFailed, description: err.message || t.login.couldNotCreate, variant: "destructive" });
    },
  });

  const features = [
    { icon: Sparkles, title: t.login.aiPowered, desc: t.login.aiPoweredDesc, color: "text-violet-400", bg: "bg-violet-500/15" },
    { icon: Zap, title: t.login.multiPlatform, desc: t.login.multiPlatformDesc, color: "text-amber-400", bg: "bg-amber-500/15" },
    { icon: TrendingUp, title: t.login.performance, desc: t.login.performanceDesc, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  ];

  const langOptions: { value: Lang; label: string }[] = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(262,83%,10%) 0%, hsl(258,75%,18%) 40%, hsl(280,70%,22%) 100%)" }}>

        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, hsl(262,83%,60%) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsl(280,70%,60%) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute top-[45%] left-[40%] w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(290,80%,70%) 0%, transparent 70%)", filter: "blur(60px)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, hsl(262,83%,65%), hsl(280,70%,55%))", boxShadow: "0 0 24px hsl(262,83%,50%/0.5)" }}>
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-extrabold text-lg tracking-tight">NeonAd AI</span>
              <span className="block text-white/40 text-[11px] font-medium tracking-widest uppercase">Pro Platform</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 border border-white/15 bg-white/5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/70 text-xs font-semibold tracking-wide">Powered by Gemini AI</span>
              </div>
              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
                {t.login.createsActuallyConvert}
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {t.login.thatConvert}
                </span>
              </h1>
              <p className="text-white/55 text-lg leading-relaxed max-w-md">
                {t.login.aiTrusted}
              </p>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-3">
              {metrics.map((m) => (
                <div key={m.value} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                  <p className={`text-2xl font-black bg-gradient-to-br ${m.color} bg-clip-text text-transparent`}>{m.value}</p>
                  <p className="text-white/50 text-xs font-medium mt-1 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center shrink-0 mt-0.5 border border-white/10`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {["#7C3AED","#EC4899","#F59E0B","#10B981","#3B82F6"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-[11px] font-bold text-white shadow-md"
                  style={{ background: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{t.login.joinMarketers}</p>
              <p className="text-white/45 text-xs mt-0.5">{t.login.generatingEveryday}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/30" />
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[420px] space-y-7">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow shadow-primary/40">
                <Wand2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">NeonAd AI</span>
            </div>
            <div className="hidden lg:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="button-lang-toggle-login"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-muted/50 hover:bg-accent text-sm font-semibold transition-colors"
                >
                  <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{lang === "ar" ? "ع" : "EN"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {langOptions.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setLang(opt.value)} className="flex items-center justify-between cursor-pointer">
                    <span>{opt.label}</span>
                    {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              {mode === "login" ? t.login.welcomeBack : t.login.getStarted}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {mode === "login" ? t.login.signInDesc : t.login.createAccountDesc}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted/60 rounded-2xl border border-border/50">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                data-testid={`tab-${m}`}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === m
                    ? "bg-background shadow-sm text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? t.login.signIn : t.login.createAccount}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-lg shadow-black/5 space-y-4">
            {mode === "login" ? (
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-sm font-semibold">{t.login.email}</Label>
                  <Input id="login-email" type="email" placeholder="you@example.com" data-testid="input-email" className="h-11 rounded-xl" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-sm font-semibold">{t.login.password}</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" data-testid="input-password" className="h-11 rounded-xl pe-10" {...loginForm.register("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 mt-2" style={{ background: "linear-gradient(135deg, hsl(262,83%,58%), hsl(280,70%,55%))" }} disabled={loginMutation.isPending} data-testid="button-login">
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {t.login.signInBtn}
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-sm font-semibold">{t.login.name}</Label>
                  <Input id="reg-name" placeholder={t.login.namePlaceholder} data-testid="input-name" className="h-11 rounded-xl" {...registerForm.register("name")} />
                  {registerForm.formState.errors.name && <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-sm font-semibold">{t.login.email}</Label>
                  <Input id="reg-email" type="email" placeholder="you@example.com" data-testid="input-register-email" className="h-11 rounded-xl" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-sm font-semibold">{t.login.password}</Label>
                  <div className="relative">
                    <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder={t.login.minPassword} data-testid="input-register-password" className="h-11 rounded-xl pe-10" {...registerForm.register("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm" className="text-sm font-semibold">{t.login.confirmPassword}</Label>
                  <div className="relative">
                    <Input id="reg-confirm" type={showConfirm ? "text" : "password"} placeholder={t.login.repeatPassword} data-testid="input-confirm-password" className="h-11 rounded-xl pe-10" {...registerForm.register("confirmPassword")} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 mt-2" style={{ background: "linear-gradient(135deg, hsl(262,83%,58%), hsl(280,70%,55%))" }} disabled={registerMutation.isPending} data-testid="button-register">
                  {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {t.login.createFreeAccount}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? t.login.noAccount : t.login.alreadyHave}{" "}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary font-semibold hover:underline">
              {mode === "login" ? t.login.createOne : t.login.signInLink}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground/50">
            By continuing you agree to our Terms of Service & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
