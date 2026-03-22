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
import { Plus, Trash2, Globe, Building2, Type, PaintBucket, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Brands() {
  const { data: brands, isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: INDUSTRIES[0],
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    fontFamily: FONTS[0],
    website: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBrand.mutateAsync(formData);
    setOpen(false);
    setFormData({
      name: "",
      industry: INDUSTRIES[0],
      primaryColor: "#6366f1",
      secondaryColor: "#8b5cf6",
      fontFamily: FONTS[0],
      website: "",
      description: ""
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Brand Management</h1>
          <p className="text-muted-foreground mt-1">Set up your brands to ensure on-brand AI generation.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 me-2" /> Add New Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl glass-card rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Create Brand Kit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. Acme Corp" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-11 rounded-xl bg-background/50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v as any})}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Typography</Label>
                    <Select value={formData.fontFamily} onValueChange={(v) => setFormData({...formData, fontFamily: v as any})}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50">
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
                    <Label>Primary Color</Label>
                    <div className="flex gap-3 items-center">
                      <input 
                        type="color" 
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                        className="h-11 w-14 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <Input value={formData.primaryColor} readOnly className="h-11 rounded-xl bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-3 items-center">
                      <input 
                        type="color" 
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                        className="h-11 w-14 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <Input value={formData.secondaryColor} readOnly className="h-11 rounded-xl bg-background/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Website (Optional)</Label>
                  <Input 
                    type="url"
                    placeholder="https://" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="h-11 rounded-xl bg-background/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Brand Description</Label>
                  <Textarea 
                    placeholder="Describe what the brand does..." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="rounded-xl bg-background/50 min-h-[100px]"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={createBrand.isPending} className="w-full sm:w-auto h-11 px-8 rounded-xl">
                  {createBrand.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  Save Brand
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border/50" />
          ))}
        </div>
      ) : brands?.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl border border-dashed border-border/50">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No brands created yet</h3>
          <p className="text-muted-foreground">Add your first brand to start generating on-brand creatives.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands?.map((brand: any, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={brand.id}
            >
              <Card className="hover-lift glass-card overflow-hidden h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
                      >
                        {brand.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg font-display">{brand.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> {brand.industry}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this brand?')) {
                          deleteBrand.mutate(brand.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4 mt-auto">
                    <div className="flex items-center gap-2 text-sm">
                      <PaintBucket className="w-4 h-4 text-muted-foreground" />
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: brand.primaryColor }} title={brand.primaryColor} />
                        <div className="w-6 h-6 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: brand.secondaryColor }} title={brand.secondaryColor} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Type className="w-4 h-4" />
                      <span>{brand.fontFamily}</span>
                    </div>
                    {brand.website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <a href={brand.website} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline truncate">
                          {brand.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
