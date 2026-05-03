import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from "@workspace/db";
import { brands, creatives } from "../../../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

const generateSchema = z.object({
  brandId: z.number(),
  title: z.string().min(1),
  platform: z.string(),
  formatSize: z.string(),
  formatName: z.string(),
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  targetAudience: z.string().optional(),
  goal: z.string().default("awareness"),
});

async function generateAdCopy(params: any) {
  const prompt = `You are an expert advertising copywriter. Generate compelling ad copy for:
Brand: ${params.brandName} (${params.brandIndustry})
Product: ${params.productName} — ${params.productDescription}
Audience: ${params.targetAudience || "General audience"}
Goal: ${params.goal} | Platform: ${params.platform} - ${params.formatName}
Return ONLY valid JSON: {"headline":"max 10 words","description":"max 25 words","cta":"max 4 words"}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const match = (response.text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]) as { headline: string; description: string; cta: string };
}

async function generateAdImage(params: any): Promise<string> {
  const prompt = `Create a professional advertising banner for brand "${params.brandName}" in ${params.brandIndustry}.
Headline: "${params.headline}" | CTA: "${params.cta}" | Platform: ${params.platform}
Brand colors: ${params.primaryColor} and ${params.secondaryColor}. Font: ${params.fontFamily}.
Make it visually stunning with bold typography, the CTA button clearly visible, and the brand name displayed.`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });
  const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData?.data) throw new Error("No image generated");
  return `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
}

router.get("/creatives", async (req, res) => {
  try {
    const rows = await db
      .select({ creative: creatives, brand: brands })
      .from(creatives)
      .innerJoin(brands, eq(creatives.brandId, brands.id))
      .orderBy(creatives.createdAt);
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const filtered = brandId ? rows.filter(r => r.creative.brandId === brandId) : rows;
    return res.json(filtered.map(r => ({ ...r.creative, brand: r.brand })));
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch creatives" });
  }
});

router.get("/creatives/:id", async (req, res) => {
  try {
    const [creative] = await db.select().from(creatives).where(eq(creatives.id, Number(req.params.id)));
    if (!creative) return res.status(404).json({ message: "Creative not found" });
    return res.json(creative);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch creative" });
  }
});

router.post("/creatives/generate", async (req, res) => {
  try {
    const input = generateSchema.parse(req.body);
    const [brand] = await db.select().from(brands).where(eq(brands.id, input.brandId));
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const [creative] = await db.insert(creatives).values({
      brandId: input.brandId,
      title: input.title,
      platform: input.platform,
      formatSize: input.formatSize,
      formatName: input.formatName,
      productName: input.productName,
      productDescription: input.productDescription,
      targetAudience: input.targetAudience || null,
      goal: input.goal,
      adCopy: null,
      imageData: null,
      status: "generating",
      performanceScore: null,
      isFavorite: false,
    } as any).returning();

    res.status(201).json(creative);

    (async () => {
      try {
        const adCopy = await generateAdCopy({
          brandName: brand.name, brandIndustry: brand.industry,
          primaryColor: brand.primaryColor, productName: input.productName,
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          goal: input.goal, platform: input.platform, formatName: input.formatName,
        });
        const imageData = await generateAdImage({
          brandName: brand.name, brandIndustry: brand.industry,
          primaryColor: brand.primaryColor, secondaryColor: brand.secondaryColor,
          fontFamily: brand.fontFamily, productName: input.productName,
          productDescription: input.productDescription,
          headline: adCopy.headline, description: adCopy.description, cta: adCopy.cta,
          platform: input.platform, formatName: input.formatName, goal: input.goal,
        });
        let score = 60;
        if (adCopy.headline.length > 5 && adCopy.headline.length < 60) score += 10;
        if (adCopy.description.length > 10 && adCopy.description.length < 150) score += 10;
        if (adCopy.cta.length > 1 && adCopy.cta.length < 25) score += 10;
        if (["sales", "leads"].includes(input.goal)) score += 5;
        if (["facebook", "instagram", "google"].includes(input.platform)) score += 5;
        await db.update(creatives)
          .set({ adCopy: adCopy as any, imageData, status: "ready", performanceScore: Math.min(100, score) })
          .where(eq(creatives.id, creative.id));
      } catch (err) {
        console.error("Generation failed:", err);
        await db.update(creatives).set({ status: "failed" }).where(eq(creatives.id, creative.id));
      }
    })();
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    return res.status(500).json({ message: "Failed to generate creative" });
  }
});

router.patch("/creatives/:id/favorite", async (req, res) => {
  try {
    const [updated] = await db.update(creatives)
      .set({ isFavorite: req.body.isFavorite })
      .where(eq(creatives.id, Number(req.params.id))).returning();
    if (!updated) return res.status(404).json({ message: "Creative not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update" });
  }
});

router.delete("/creatives/:id", async (req, res) => {
  try {
    await db.delete(creatives).where(eq(creatives.id, Number(req.params.id)));
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete creative" });
  }
});

export default router;
