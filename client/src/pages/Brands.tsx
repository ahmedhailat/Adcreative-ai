import { useState } from "react";
import { useBrands, useCreateBrand, useDeleteBrand } from "@/hooks/use-brands";
import { INDUSTRIES, FONTS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/contexts/LangContext";
import { Plus, Trash2, Globe, Building2, Type, PaintBucket, Loader2, Palette, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Brands() {
  const { t } = useLang();
  const { data: brands, isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: INDUSTRIES[0] as string,
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    fontFamily: FONTS[0] as string,
    website: "",
    description: "",
    logoUrl: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: t.brands.brandNameRequired, variant: "destructive" });
      return;
    }
    try {
      await createBrand.mutateAsync(formData);
      toast({
        title: t.brands.brandCreated,
        description: t.brands.brandCreatedDesc.replace("{name}", formData.name),
      });
      setOpen(false);
      setFormData({
        name: "",
        industry: INDUSTRIES[0],
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        fontFamily: FONTS[0],
        website: "",
        description: "",
        logoUrl: null,
      });
    } catch (err: any) {
      toast({ title: t.brands.failedCreate, description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (brand: any) => {
    if (!confirm(t.brands.deleteConfirm.replace('"{name}"', `"${brand.name}"`))) return;
    try {
      await deleteBrand.mutateAsync(brand.id);
      toast({ title: t.brands.brandDeleted });
    } catch (err: any) {
      toast({ title: t.brands.failedDelete, description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">{t.brands.title}</h1>
          <p className="text-muted-foreground mt-1">{t.brands.subtitle}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20" data-testid="button-add-brand">
              <Plus className="w-4 h-4 me-2" /> {t.brands.addBrand}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                {t.brands.createBrandKit}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label className="font-semibold">{t.brands.brandName} <span className="text-destructive">*</span></Label>
                <Input
                  required
                  placeholder="e.g. Acme Corp"
                  data-testid="input-brand-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">{t.brands.industry}</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
                    <SelectTrigger className="h-11 rounded-xl" data-testid="select-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">{t.brands.typography}</Label>
                  <Select value={formData.fontFamily} onValueChange={(v) => setFormData({...formData, fontFamily: v})}>
                    <SelectTrigger className="h-11 rounded-xl" data-testid="select-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">{t.brands.primaryColor}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                      className="h-11 w-12 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                    />
                    <Input value={formData.primaryColor} readOnly className="h-11 rounded-xl font-mono text-sm flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">{t.brands.secondaryColor}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                      className="h-11 w-12 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                    />
                    <Input value={formData.secondaryColor} readOnly className="h-11 rounded-xl font-mono text-sm flex-1" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">{t.brands.website} <span className="text-muted-foreground font-normal">{t.brands.optional}</span></Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">{t.brands.brandDescription} <span className="text-muted-foreground font-normal">{t.brands.optional}</span></Label>
                <Textarea
                  placeholder="What does this brand do? Who are the customers?"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="rounded-xl min-h-[80px] resize-none"
                />
              </div>

              {/* Preview */}
              {formData.name && (
                <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3">{t.brands.preview}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md"
                         style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}>
                      {formData.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold">{formData.name}</p>
                      <p className="text-sm text-muted-foreground">{formData.industry} · {formData.fontFamily}</p>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t.brands.cancel}</Button>
                <Button type="submit" disabled={createBrand.isPending} className="px-8 rounded-xl" data-testid="button-save-brand">
                  {createBrand.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Palette className="w-4 h-4 me-2" />}
                  {t.brands.saveBrand}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 bg-card animate-pulse rounded-2xl border border-border/50" />
          ))}
        </div>
      ) : !brands?.length ? (
        <div className="text-center py-24 glass-card rounded-2xl border border-dashed border-border/50 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t.brands.noBrandsYet}</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">{t.brands.noBrandsDesc}</p>
          <Button onClick={() => setOpen(true)} className="rounded-xl shadow-md">
            <Plus className="w-4 h-4 me-2" /> {t.brands.createFirstBrand}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand: any, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              key={brand.id}
              data-testid={`card-brand-${brand.id}`}
            >
              <Card className="hover-lift glass-card overflow-hidden h-full flex flex-col group">
                <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }} />

                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
                      >
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-base">{brand.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {brand.industry}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg transition-all"
                      onClick={() => handleDelete(brand)}
                      data-testid={`button-delete-brand-${brand.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {brand.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{brand.description}</p>
                  )}

                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-2 text-sm">
                      <PaintBucket className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="flex gap-2 items-center">
                        <div className="w-5 h-5 rounded-full border-2 border-background shadow" style={{ backgroundColor: brand.primaryColor }} />
                        <div className="w-5 h-5 rounded-full border-2 border-background shadow" style={{ backgroundColor: brand.secondaryColor }} />
                        <span className="text-xs text-muted-foreground">{brand.primaryColor} · {brand.secondaryColor}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Type className="w-3.5 h-3.5" />
                      <span>{brand.fontFamily}</span>
                    </div>
                    {brand.website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        <a href={brand.website} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline truncate max-w-[180px]">
                          {brand.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  <Link href={`/studio?brandId=${brand.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-4 rounded-lg border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
                      <Wand2 className="w-3.5 h-3.5 me-2" /> {t.brands.generateCreative}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Add Brand Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: brands.length * 0.08 }}
          >
            <button
              onClick={() => setOpen(true)}
              data-testid="button-add-brand-card"
              className="w-full h-full min-h-[200px] rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/3 transition-all flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground hover:text-primary group"
            >
              <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold">{t.brands.addNewBrand}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.brands.addNewBrandDesc}</p>
              </div>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
