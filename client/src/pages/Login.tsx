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
import { Wand2, Sparkles, Zap, TrendingUp, Eye, EyeOff, Loader2 } from "lucide-react";

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

const features = [
  { icon: Sparkles, title: "AI-Powered Creatives", desc: "Generate stunning ads in seconds with Gemini AI" },
  { icon: Zap, title: "Multi-Platform Ready", desc: "Facebook, Instagram, Google, TikTok & more" },
  { icon: TrendingUp, title: "Performance Scores", desc: "Know which creatives will convert before you launch" },
];

export default function Login() {
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
      toast({ title: "Login failed", description: err.message || "Invalid email or password", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("POST", "/api/auth/register", data),
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message || "Could not create account", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[hsl(262,83%,20%)] via-[hsl(262,83%,30%)] to-[hsl(280,80%,40%)] relative overflow-hidden">
        {/* Decorative blobs */}
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
              Create Ad Creatives<br />
              <span className="text-white/70">That Actually Convert</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              AI-powered advertising platform trusted by thousands of marketers worldwide.
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
              <p className="text-white text-sm font-semibold">Join 10,000+ marketers</p>
              <p className="text-white/55 text-xs">generating ads every day</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AdCreative AI</span>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-foreground">
              {mode === "login" ? "Welcome back" : "Get started free"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === "login"
                ? "Sign in to your account to continue."
                : "Create your account and start generating ads."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setMode("login")}
              data-testid="tab-login"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              data-testid="tab-register"
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "register" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Create Account
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
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
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    data-testid="input-password"
                    className="h-11 pr-10"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button type="button" onClick={() => setMode("register")} className="text-primary font-semibold hover:underline">
                  Create one free
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input
                  id="reg-name"
                  placeholder="John Smith"
                  data-testid="input-name"
                  className="h-11"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
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
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    data-testid="input-register-password"
                    className="h-11 pr-10"
                    {...registerForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat password"
                    data-testid="input-confirm-password"
                    className="h-11 pr-10"
                    {...registerForm.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Free Account
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
