import type { Express } from "express";
import type { Server } from "http";
import { GoogleGenAI, Modality } from "@google/genai";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { AD_FORMATS } from "@shared/schema";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

async function generateAdCopy(params: {
  brandName: string;
  brandIndustry: string;
  primaryColor: string;
  productName: string;
  productDescription: string;
  targetAudience: string;
  goal: string;
  platform: string;
  formatName: string;
}): Promise<{ headline: string; description: string; cta: string }> {
  const prompt = `You are an expert advertising copywriter. Generate compelling ad copy for:

Brand: ${params.brandName} (${params.brandIndustry})
Product/Service: ${params.productName}
Description: ${params.productDescription}
Target Audience: ${params.targetAudience || "General audience"}
Campaign Goal: ${params.goal}
Platform: ${params.platform} - ${params.formatName}

Return ONLY valid JSON with exactly these fields:
{
  "headline": "Attention-grabbing headline (max 10 words)",
  "description": "Compelling description (max 25 words)",
  "cta": "Call to action button text (max 4 words)"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = response.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  return JSON.parse(jsonMatch[0]);
}

async function generateAdImage(params: {
  brandName: string;
  brandIndustry: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  productName: string;
  productDescription: string;
  headline: string;
  description: string;
  cta: string;
  platform: string;
  formatName: string;
  goal: string;
}): Promise<string> {
  const prompt = `Create a professional advertising creative/banner for:

Brand: "${params.brandName}" in ${params.brandIndustry} industry
Ad Headline: "${params.headline}"
Ad Description: "${params.description}"
Call to Action: "${params.cta}"
Platform: ${params.platform} - ${params.formatName}
Primary Color: ${params.primaryColor}, Secondary Color: ${params.secondaryColor}
Font Style: ${params.fontFamily}
Goal: ${params.goal}
Product: ${params.productName}

Create a visually stunning, professional advertisement image with:
- Bold, readable typography featuring the headline prominently
- A CTA button with the text "${params.cta}"
- Professional composition using ${params.primaryColor} and ${params.secondaryColor} as brand colors
- Modern design suitable for ${params.platform} advertising
- Clean, polished look that would appeal to the target audience
- The brand name "${params.brandName}" displayed
- High contrast text for readability
- Professional product/service imagery that matches the description`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image generated");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

function calculatePerformanceScore(params: {
  headline: string;
  description: string;
  cta: string;
  goal: string;
  platform: string;
}): number {
  let score = 60;
  if (params.headline.length > 5 && params.headline.length < 60) score += 10;
  if (params.description.length > 10 && params.description.length < 150) score += 10;
  if (params.cta.length > 1 && params.cta.length < 25) score += 10;
  if (["sales", "leads"].includes(params.goal)) score += 5;
  if (["facebook", "instagram", "google"].includes(params.platform)) score += 5;
  return Math.min(100, score);
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ===== AUTH ROUTES =====

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ name, email, password: hashedPassword });

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ===== DASHBOARD =====
  app.get(api.dashboard.stats.path, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Templates
  app.get(api.templates.list.path, (_req, res) => {
    res.json(AD_FORMATS);
  });

  // ===== BRANDS =====
  app.get(api.brands.list.path, async (_req, res) => {
    const brands = await storage.getBrands();
    res.json(brands);
  });

  app.get(api.brands.get.path, async (req, res) => {
    const brand = await storage.getBrand(Number(req.params.id));
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  });

  app.post(api.brands.create.path, async (req, res) => {
    try {
      const input = api.brands.create.input.parse(req.body);
      const brand = await storage.createBrand(input);
      res.status(201).json(brand);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.put(api.brands.update.path, async (req, res) => {
    const brand = await storage.updateBrand(Number(req.params.id), req.body);
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  });

  app.delete(api.brands.delete.path, async (req, res) => {
    await storage.deleteBrand(Number(req.params.id));
    res.status(204).send();
  });

  // ===== CREATIVES =====
  app.get(api.creatives.list.path, async (req, res) => {
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const list = await storage.getCreatives(brandId);
    res.json(list);
  });

  app.get(api.creatives.get.path, async (req, res) => {
    const creative = await storage.getCreative(Number(req.params.id));
    if (!creative) return res.status(404).json({ message: "Creative not found" });
    res.json(creative);
  });

  app.post(api.creatives.generate.path, async (req, res) => {
    try {
      const input = api.creatives.generate.input.parse(req.body);
      const brand = await storage.getBrand(input.brandId);
      if (!brand) return res.status(404).json({ message: "Brand not found" });

      const creative = await storage.createCreative({
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
      });

      res.status(201).json(creative);

      (async () => {
        try {
          const adCopy = await generateAdCopy({
            brandName: brand.name,
            brandIndustry: brand.industry,
            primaryColor: brand.primaryColor,
            productName: input.productName,
            productDescription: input.productDescription,
            targetAudience: input.targetAudience || "General audience",
            goal: input.goal,
            platform: input.platform,
            formatName: input.formatName,
          });

          const imageData = await generateAdImage({
            brandName: brand.name,
            brandIndustry: brand.industry,
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            fontFamily: brand.fontFamily,
            productName: input.productName,
            productDescription: input.productDescription,
            headline: adCopy.headline,
            description: adCopy.description,
            cta: adCopy.cta,
            platform: input.platform,
            formatName: input.formatName,
            goal: input.goal,
          });

          const score = calculatePerformanceScore({
            headline: adCopy.headline,
            description: adCopy.description,
            cta: adCopy.cta,
            goal: input.goal,
            platform: input.platform,
          });

          await storage.updateCreative(creative.id, {
            adCopy: adCopy as any,
            imageData,
            status: "ready",
            performanceScore: score,
          });
        } catch (err) {
          console.error("Creative generation failed:", err);
          await storage.updateCreative(creative.id, { status: "failed" });
        }
      })();

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.creatives.toggleFavorite.path, async (req, res) => {
    const updated = await storage.updateCreative(Number(req.params.id), { isFavorite: req.body.isFavorite });
    if (!updated) return res.status(404).json({ message: "Creative not found" });
    res.json(updated);
  });

  app.delete(api.creatives.delete.path, async (req, res) => {
    await storage.deleteCreative(Number(req.params.id));
    res.status(204).send();
  });

  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const existingBrands = await storage.getBrands();
    if (existingBrands.length === 0) {
      await storage.createBrand({
        name: "TechFlow",
        logoUrl: null,
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        fontFamily: "Inter",
        industry: "Technology",
        website: "https://techflow.io",
        description: "Leading SaaS platform for developers",
      });
      await storage.createBrand({
        name: "Bloom Beauty",
        logoUrl: null,
        primaryColor: "#ec4899",
        secondaryColor: "#f97316",
        fontFamily: "Montserrat",
        industry: "Beauty & Cosmetics",
        website: "https://bloombeauty.com",
        description: "Natural beauty products for everyone",
      });
      await storage.createBrand({
        name: "Urban Eats",
        logoUrl: null,
        primaryColor: "#f59e0b",
        secondaryColor: "#10b981",
        fontFamily: "Poppins",
        industry: "Food & Beverage",
        website: "https://urbaneats.co",
        description: "Fast food delivery service",
      });
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
}
