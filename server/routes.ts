import type { Express } from "express";
import type { Server } from "http";
import { GoogleGenAI, Modality } from "@google/genai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { stripe } from "./stripeClient";
import { handleStripeWebhook } from "./webhookHandlers";
import { api } from "@shared/routes";
import { AD_FORMATS } from "@shared/schema";
import { z } from "zod";

// Multer setup — store video uploads in /tmp/uploads
const uploadDir = "/tmp/uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

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
      const isVideoAI = (req.body as any).mediaType === "video";
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
        videoUrl: null,
        mediaType: isVideoAI ? "video" : "image",
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

          if (isVideoAI) {
            // AI video: generate a thumbnail image and store it as imageData
            // (true video generation would require a dedicated video model)
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
          } else {
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
          }
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

  // ===== VIDEO UPLOAD =====
  app.post("/api/creatives/upload-video", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const {
        brandId, title, platform, formatSize, formatName,
        productName, productDescription, goal, targetAudience,
      } = req.body;

      if (!brandId || !platform || !formatSize || !productName || !productDescription || !goal) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Read the file and convert to base64 data URL for storage
      const fileBuffer = fs.readFileSync(req.file.path);
      const mimeType = req.file.mimetype || "video/mp4";
      const videoUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      const adTitle = title || `${productName} – ${formatName || formatSize}`;

      const creative = await storage.createCreative({
        brandId: Number(brandId),
        title: adTitle,
        platform,
        formatSize,
        formatName: formatName || formatSize,
        productName,
        productDescription,
        targetAudience: targetAudience || null,
        goal,
        adCopy: null,
        imageData: null,
        videoUrl,
        mediaType: "video",
        status: "ready",
        performanceScore: null,
        isFavorite: false,
      });

      res.status(201).json(creative);
    } catch (err: any) {
      console.error("Video upload failed:", err);
      res.status(500).json({ message: err.message || "Video upload failed" });
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

  // ===== STRIPE =====

  // Webhook — must come BEFORE express.json() parses body, rawBody captured in index.ts
  app.post("/api/stripe/webhook", handleStripeWebhook);

  // Create Checkout Session → returns { url }
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const { plan, interval } = req.body as { plan: "pro" | "business"; interval: "monthly" | "yearly" };
    if (!plan || !["pro", "business"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Price lookup keys follow the pattern: plan_interval (e.g. pro_monthly)
    const lookupKey = `${plan}_${interval ?? "monthly"}`;

    try {
      // Look up the price by lookup_key set in Stripe dashboard
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], expand: ["data.product"] });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Fallback: create price on-the-fly if lookup key not found
        const unitAmount = plan === "pro"
          ? (interval === "yearly" ? 27600 : 2900)
          : (interval === "yearly" ? 75600 : 7900);
        const productName = plan === "pro" ? "AdCreative Pro" : "AdCreative Business";

        const product = await stripe.products.create({ name: productName });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: "usd",
          recurring: { interval: interval === "yearly" ? "year" : "month" },
          lookup_key: lookupKey,
        });
        priceId = price.id;
      }

      const appUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : (process.env.APP_URL || "http://localhost:5000");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/pricing?success=true&plan=${plan}`,
        cancel_url: `${appUrl}/pricing?canceled=true`,
        customer_email: user.email,
        metadata: { userId: String(userId), plan },
        subscription_data: { metadata: { userId: String(userId), plan } },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[stripe] create-checkout-session error:", err.message);
      res.status(500).json({ message: err.message || "Failed to create checkout session" });
    }
  });

  // Create Customer Portal session → returns { url }
  app.post("/api/stripe/create-portal-session", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const customerId = (user as any).stripeCustomerId;
    if (!customerId) return res.status(400).json({ message: "No Stripe customer found. Please subscribe first." });

    try {
      const appUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : (process.env.APP_URL || "http://localhost:5000");

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/pricing`,
      });
      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("[stripe] create-portal-session error:", err.message);
      res.status(500).json({ message: err.message || "Failed to create portal session" });
    }
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
