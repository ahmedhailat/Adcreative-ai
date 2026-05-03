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
import { Wand2, Sparkles, Zap, TrendingUp, Eye, EyeOff, Loader2, Languages, Check } from "lucide-react";
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
    { icon: Sparkles, title: t.login.aiPowered, desc: t.login.aiPoweredDesc },
    { icon: Zap, title: t.login.multiPlatform, desc: t.login.multiPlatformDesc },
    { icon: TrendingUp, title: t.login.performance, desc: t.login.performanceDesc },
  ];

  const langOptions: { value: Lang; label: string }[] = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[hsl(262,83%,20%)] via-[hsl(262,83%,30%)] to-[hsl(280,80%,40%)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">AdCreative AI</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              {t.login.createsActuallyConvert}<br />
              <span className="text-white/70">{t.login.thatConvert}</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              {t.login.aiTrusted}
            </p>
          </div>

          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{f.title}</p>
                  <p className="text-white/55 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <div className="flex -space-x-2">
              {["#6366f1","#ec4899","#f59e0b","#10b981"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white" style={{ background: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{t.login.joinMarketers}</p>
              <p className="text-white/55 text-xs">{t.login.generatingEveryday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo + lang toggle row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">AdCreative AI</span>
            </div>
            {/* Language toggle visible on all screen sizes on login */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="button-lang-toggle-login"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/60 bg-background/50 hover:bg-accent text-sm font-semibold transition-colors"
                >
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  <span>{lang === "ar" ? "ع" : "EN"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {langOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setLang(opt.value)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-foreground">
              {mode === "login" ? t.login.welcomeBack : t.login.getStarted}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === "login" ? t.login.signInDesc : t.login.createAccountDesc}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setMode("login")}
              data-testid="tab-login"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.login.signIn}
            </button>
            <button
              onClick={() => setMode("register")}
              data-testid="tab-register"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "register" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.login.createAccount}
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t.login.email}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  data-testid="input-email"
                  className="h-11"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">{t.login.password}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    data-testid="input-password"
                    className="h-11 pe-10"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t.login.signInBtn}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t.login.noAccount}{" "}
                <button type="button" onClick={() => setMode("register")} className="text-primary font-semibold hover:underline">
                  {t.login.createOne}
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reg-name">{t.login.name}</Label>
                <Input
                  id="reg-name"
                  placeholder={t.login.namePlaceholder}
                  data-testid="input-name"
                  className="h-11"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">{t.login.email}</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  data-testid="input-register-email"
                  className="h-11"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">{t.login.password}</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.login.minPassword}
                    data-testid="input-register-password"
                    className="h-11 pe-10"
                    {...registerForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm">{t.login.confirmPassword}</Label>
                <div className="relative">
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder={t.login.repeatPassword}
                    data-testid="input-confirm-password"
                    className="h-11 pe-10"
                    {...registerForm.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t.login.createFreeAccount}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t.login.alreadyHave}{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                  {t.login.signInLink}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
