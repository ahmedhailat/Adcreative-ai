import { useState } from "react";
import { useCreatives, useDeleteCreative, useToggleFavoriteCreative } from "@/hooks/use-creatives";
import { useBrands } from "@/hooks/use-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Heart, Download, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SiFacebook, SiInstagram, SiGoogle, SiTiktok, SiLinkedin, SiX } from "react-icons/si";

const PLATFORM_ICONS: Record<string, any> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  google: SiGoogle,
  tiktok: SiTiktok,
  linkedin: SiLinkedin,
  twitter: SiX,
};

export default function Library() {
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: brands } = useBrands();
  const { data: creatives, isLoading } = useCreatives(filterBrand !== "all" ? Number(filterBrand) : undefined);
  
  const toggleFavorite = useToggleFavoriteCreative();
  const deleteCreative = useDeleteCreative();

  const filteredCreatives = creatives?.filter((c: any) => {
    if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  const handleDownload = (creative: any) => {
    if (!creative.imageData) return;
    const a = document.createElement('a');
    a.href = creative.imageData;
    a.download = `${creative.title.replace(/\s+/g, '-').toLowerCase()}-ad.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display">Creative Library</h1>
        <p className="text-muted-foreground mt-1">Manage, download, and organize all your AI-generated assets.</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search creatives by title..." 
            className="ps-10 h-11 rounded-xl bg-background/50 border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-xl bg-background/50 border-border/50">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands?.map((b: any) => (
              <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-xl bg-background/50 border-border/50">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[4/5] bg-card animate-pulse rounded-3xl border border-border/50" />
          ))}
        </div>
      ) : filteredCreatives.length === 0 ? (
        <div className="text-center py-32 glass-card rounded-3xl border border-dashed border-border/50">
          <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold mb-2">No creatives found</h3>
          <p className="text-muted-foreground">Adjust your filters or generate a new creative in the studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredCreatives.map((creative: any, idx: number) => {
              const PlatformIcon = PLATFORM_ICONS[creative.platform] || SiFacebook;
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={creative.id}
                  className="group relative rounded-3xl overflow-hidden glass-card hover-lift flex flex-col h-full"
                >
                  <div className="aspect-[4/5] bg-muted relative overflow-hidden flex-shrink-0">
                    {creative.status === "generating" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-md">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                        <span className="text-sm font-medium animate-pulse text-muted-foreground">Generating...</span>
                      </div>
                    ) : creative.imageData ? (
                      <img src={creative.imageData} alt={creative.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-sm font-medium">
                        Failed
                      </div>
                    )}
                    
                    {/* Top Overlay */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-background/90 backdrop-blur-md text-foreground px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg">
                        <PlatformIcon className="w-3.5 h-3.5" />
                        {creative.formatSize}
                      </div>
                      <Button 
                        size="icon" 
                        variant="secondary"
                        className={`rounded-full shadow-lg ${creative.isFavorite ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite.mutate({ id: creative.id, isFavorite: !creative.isFavorite });
                        }}
                      >
                        <Heart className="w-4 h-4" fill={creative.isFavorite ? "currentColor" : "none"} />
                      </Button>
                    </div>

                    {/* Bottom Action Overlay */}
                    {creative.status === "ready" && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform bg-gradient-to-t from-black/80 to-transparent">
                        <Button className="flex-1 rounded-xl shadow-lg" onClick={() => handleDownload(creative)}>
                          <Download className="w-4 h-4 me-2" /> Download
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 border-t border-border/50 bg-card/90 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-foreground line-clamp-2 leading-tight">{creative.title}</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0 -me-2 -mt-1"
                        onClick={() => {
                          if (confirm('Delete this creative?')) deleteCreative.mutate(creative.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                        {creative.brand?.name?.charAt(0)}
                      </div>
                      <span className="truncate">{creative.brand?.name}</span>
                      <span className="ms-auto bg-green-500/10 text-green-600 px-2 py-1 rounded-md border border-green-500/20">
                        Score: {creative.performanceScore || '--'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
