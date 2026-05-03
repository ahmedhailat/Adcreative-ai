import { useState } from "react";
import { Link } from "wouter";
import { Check, Zap, Building2, Sparkles, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function PlanCard({
  name,
  description,
  price,
  priceYearly,
  features,
  isPopular,
  isCurrent,
  isYearly,
  ctaLabel,
  ctaVariant,
  icon: Icon,
  highlight,
  comingSoon,
}: {
  name: string;
  description: string;
  price: string;
  priceYearly?: string;
  features: readonly string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  isYearly: boolean;
  ctaLabel: string;
  ctaVariant: "outline" | "default" | "secondary";
  icon: React.ElementType;
  highlight?: boolean;
  comingSoon?: string;
}) {
  const { t, isRTL } = useLang();

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all duration-200",
        highlight
          ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-md",
      )}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-md">
            {t.pricing.mostPopular}
          </Badge>
        </div>
      )}

      <div className="mb-6">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
          highlight ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-muted text-muted-foreground",
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-foreground">
            {isYearly && priceYearly ? priceYearly : price}
          </span>
          <span className="text-muted-foreground text-sm mb-1.5">
            {isYearly ? t.pricing.perYear : t.pricing.perMonth}
          </span>
        </div>
        {isYearly && priceYearly && (
          <p className="text-xs text-muted-foreground mt-0.5">{t.pricing.billedYearly}</p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Check className={cn(
              "w-4 h-4 mt-0.5 shrink-0",
              highlight ? "text-primary" : "text-muted-foreground",
            )} />
            <span className="text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled data-testid={`btn-current-${name}`}>
            <Check className="w-4 h-4 me-2" />
            {t.pricing.currentPlan}
          </Button>
        ) : (
          <Button
            variant={ctaVariant}
            className={cn(
              "w-full",
              highlight && "shadow-md shadow-primary/20",
            )}
            data-testid={`btn-upgrade-${name}`}
            asChild
          >
            <Link href="/pricing">{ctaLabel}</Link>
          </Button>
        )}
        {comingSoon && (
          <p className="text-[11px] text-center text-muted-foreground">{comingSoon}</p>
        )}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-start gap-4"
        onClick={() => setOpen(!open)}
        data-testid="faq-toggle"
      >
        <span className="font-medium text-foreground text-sm">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const { t } = useLang();
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);

  const userPlan = (user as any)?.plan ?? "free";

  const plans = [
    {
      key: "free",
      name: t.pricing.free,
      description: t.pricing.freeDesc,
      price: t.pricing.freePrice,
      priceYearly: "$0",
      features: t.pricing.freePlanFeatures,
      isPopular: false,
      icon: Sparkles,
      ctaLabel: userPlan === "free" ? t.pricing.currentPlan : t.pricing.getStarted,
      ctaVariant: "outline" as const,
      highlight: false,
    },
    {
      key: "pro",
      name: t.pricing.pro,
      description: t.pricing.proDesc,
      price: t.pricing.proPrice,
      priceYearly: "$23",
      features: t.pricing.proPlanFeatures,
      isPopular: true,
      icon: Zap,
      ctaLabel: userPlan === "pro" ? t.pricing.currentPlan : t.pricing.upgradeBtn,
      ctaVariant: "default" as const,
      highlight: true,
      comingSoon: t.pricing.comingSoon,
    },
    {
      key: "business",
      name: t.pricing.business,
      description: t.pricing.businessDesc,
      price: t.pricing.businessPrice,
      priceYearly: "$63",
      features: t.pricing.businessPlanFeatures,
      isPopular: false,
      icon: Building2,
      ctaLabel: userPlan === "business" ? t.pricing.currentPlan : t.pricing.contactSales,
      ctaVariant: "secondary" as const,
      highlight: false,
      comingSoon: t.pricing.comingSoon,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 space-y-14">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-sm font-semibold">
          <Crown className="w-4 h-4" />
          {t.pricing.title}
        </div>
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
          {t.pricing.title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          {t.pricing.subtitle}
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={cn("text-sm font-medium", !isYearly ? "text-foreground" : "text-muted-foreground")}>
            {t.pricing.monthly}
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            data-testid="toggle-billing"
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              isYearly ? "bg-primary" : "bg-muted",
            )}
          >
            <span className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200",
              isYearly ? "start-7" : "start-1",
            )} />
          </button>
          <span className={cn("text-sm font-medium", isYearly ? "text-foreground" : "text-muted-foreground")}>
            {t.pricing.yearly}
          </span>
          {isYearly && (
            <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-600 border-green-500/30">
              {t.pricing.savePercent}
            </Badge>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            name={plan.name}
            description={plan.description}
            price={plan.price}
            priceYearly={plan.priceYearly}
            features={plan.features}
            isPopular={plan.isPopular}
            isCurrent={userPlan === plan.key}
            isYearly={isYearly}
            ctaLabel={plan.ctaLabel}
            ctaVariant={plan.ctaVariant}
            icon={plan.icon}
            highlight={plan.highlight}
            comingSoon={plan.comingSoon}
          />
        ))}
      </div>

      {/* Feature comparison note */}
      <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {t.pricing.comingSoon}
        </p>
        <p className="text-xs text-muted-foreground">
          All plans include SSL, 99.9% uptime, and world-class support.
        </p>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t.pricing.faq}</h2>
        <div className="rounded-2xl border border-border bg-card px-6 divide-y-0">
          {t.pricing.faqItems.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
