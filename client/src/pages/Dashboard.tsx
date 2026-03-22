import { useDashboardStats } from "@/hooks/use-dashboard";
import { useCreatives } from "@/hooks/use-creatives";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, LayoutDashboard, Palette, FileImage, Heart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: creatives, isLoading: creativesLoading } = useCreatives();

  const recentCreatives = creatives?.slice(0, 6) || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-xl p-8 md:p-12 glass-card"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold leading-tight">
            Generate Stunning <br/>
            <span className="text-gradient">Ad Creatives</span> with AI
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Create conversion-focused ad variations in seconds. Upload your brand assets, tell us your goal, and let AI do the heavy lifting.
          </p>
          <div className="flex gap-4 pt-2">
            <Link href="/studio">
              <Button size="lg" className="rounded-xl h-14 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all">
                <Wand2 className="w-5 h-5 me-2" /> Start Generating
              </Button>
            </Link>
            <Link href="/brands">
              <Button size="lg" variant="outline" className="rounded-xl h-14 px-8 text-base hover:-translate-y-1 transition-all bg-background/50 backdrop-blur-sm border-border/50">
                Setup Brand
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Brands", value: stats?.totalBrands || 0, icon: Palette, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Total Generated", value: stats?.totalCreatives || 0, icon: Wand2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ready to Use", value: stats?.readyCreatives || 0, icon: FileImage, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Favorites", value: stats?.favoritedCreatives || 0, icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
          >
            <Card className="hover-lift glass-card overflow-hidden relative">
              <CardContent className="p-6 flex items-center justify-between z-10 relative">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded-md mt-1" />
                  ) : (
                    <p className="text-3xl font-bold font-display">{stat.value}</p>
                  )}
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Creatives */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-display">Recent Creatives</h2>
          <Link href="/library">
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
              View Library →
            </Button>
          </Link>
        </div>

        {creativesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-card animate-pulse rounded-2xl border border-border/50" />
            ))}
          </div>
        ) : recentCreatives.length === 0 ? (
          <div className="text-center py-24 bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <FileImage className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No creatives yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Your generated ad creatives will appear here. Start by setting up a brand and generating your first design.</p>
            <Link href="/studio">
              <Button className="rounded-xl shadow-md">Create First Ad</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCreatives.map((creative: any, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={creative.id}
                className="group relative rounded-2xl overflow-hidden glass-card hover-lift cursor-pointer"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {creative.status === "generating" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-md">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <span className="text-sm font-medium animate-pulse text-muted-foreground">Generating...</span>
                    </div>
                  ) : creative.imageData ? (
                    <img src={creative.imageData} alt={creative.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-sm font-medium">
                      Failed
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 text-xs font-semibold bg-background/90 backdrop-blur-md rounded-md shadow-sm border border-border/50 capitalize">
                      {creative.platform}
                    </span>
                  </div>
                </div>
                <div className="p-5 border-t border-border/50 bg-card/90">
                  <h3 className="font-bold text-foreground truncate">{creative.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{creative.brand?.name} • {creative.formatName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
