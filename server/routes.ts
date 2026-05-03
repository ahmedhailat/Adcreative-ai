import type { Express } from "express";
import type { Server } from "http";
import { GoogleGenAI, Modality } from "@google/genai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";
import { stripe } from "./stripeClient";
import { handleStripeWebhook } from "./webhookHandlers";
import { api } from "@shared/routes";
import { AD_FORMATS } from "@shared/schema";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const FFMPEG_BIN  = "/nix/store/inqkj79vydizl6ja0d8af99qlxbmyr84-replit-runtime-path/bin/ffmpeg";
const FONT_BOLD   = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// Persistent video storage — served via /api/video/:filename
const VIDEO_DIR  = "/tmp/ad_videos";
const UPLOAD_DIR = "/tmp/uploads";
for (const d of [VIDEO_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Multer setup — store video uploads in /tmp/uploads
const uploadDir = UPLOAD_DIR;

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

// Build a safe FFmpeg drawtext value — no shell, uses execFile arg array
function ffText(text: string): string {
  // FFmpeg drawtext text= escaping (no shell quoting needed since we use execFile)
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g,  "\\:")
    .replace(/'/g,  "\u2019")   // replace smart quote to avoid filter parsing issues
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .slice(0, 55);
}

async function generateAdVideo(params: {
  imageData: string;
  headline: string;
  cta: string;
  primaryColor: string;
  brandName: string;
}): Promise<string> {
  const id      = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const imgPath = path.join(os.tmpdir(), `ad_img_${id}.png`);
  const outPath = path.join(VIDEO_DIR, `${id}.mp4`);

  console.log("[video] Generating 3-scene cinematic ad:", params.headline);

  const base64Raw = params.imageData.replace(/^data:image\/[\w+]+;base64,/, "");
  fs.writeFileSync(imgPath, Buffer.from(base64Raw, "base64"));
  console.log("[video] Image written:", fs.statSync(imgPath).size, "bytes");

  const hex   = params.primaryColor.replace("#", "").padEnd(6, "0").slice(0, 6);
  const brand = ffText(params.brandName);
  const hl    = ffText(params.headline);
  const cta   = ffText(params.cta);

  // ─────────────────────────────────────────────────────────────────────────
  // 3 SCENES · 15 seconds · 25 fps — 3 parallel FFmpeg processes, each gets
  // a different colour grade, zoom/pan direction, and text overlay.
  //
  //  Scene 1  0–5 s  : BRAND REVEAL   — warm golden grade, zoom IN  (540p zoompan→1080p)
  //  Scene 2  5–10 s : PRODUCT FOCUS  — near-B&W dramatic, pan L→R  (crop, fast)
  //  Scene 3  10–15 s: CTA FINALE     — brand colour dominant, zoom OUT (540p zoompan→1080p)
  //
  // Running 3 separate processes in parallel avoids filter_complex contention.
  // A final stream-copy concat joins them without re-encoding.
  // ─────────────────────────────────────────────────────────────────────────

  const s1Path   = path.join(os.tmpdir(), `s1_${id}.mp4`);
  const s2Path   = path.join(os.tmpdir(), `s2_${id}.mp4`);
  const s3Path   = path.join(os.tmpdir(), `s3_${id}.mp4`);
  const listPath = path.join(os.tmpdir(), `concat_${id}.txt`);

  const ENC = ["-r","25","-c:v","libx264","-pix_fmt","yuv420p","-preset","fast","-crf","26"];

  // ── SCENE 1: BRAND REVEAL — warm golden grade, zoom IN ────────────────
  // zoompan at 540p (4× faster than 1080p), scale back up after motion.
  // crop x/y animate WITHOUT eval=frame — they are per-frame by default.
  const scene1vf = [
    `scale=540:540:force_original_aspect_ratio=increase,crop=540:540`,
    `zoompan=z='min(1+0.00055*on,1.18)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=540x540:fps=25`,
    `scale=1080:1080`,
    `eq=contrast=1.08:saturation=1.35:brightness=0.02:gamma=0.96`,
    `vignette=PI/4.5`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0xFF8C00@0.08:t=fill`,
    `drawbox=x=0:y=ih*0.60:w=iw:h=ih*0.40:color=0x${hex}@0.78:t=fill`,
    `drawbox=x=0:y=0:w=iw:h=ih*0.07:color=black@0.55:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${brand}':x=(w-tw)/2:y=(h-th)/2-26:fontsize=84:fontcolor=white:shadowcolor=black@0.85:shadowx=4:shadowy=4:alpha='if(lt(t,0.7),t/0.7,1)'`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y=(h-th)/2+72:fontsize=33:fontcolor=white@0.90:shadowcolor=black@0.65:shadowx=2:shadowy=2:alpha='if(lt(t,1.3),0,if(lt(t,2.1),(t-1.3)/0.8,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  // ── SCENE 2: PRODUCT FOCUS — near-B&W dramatic grade, pan L→R ────────
  // crop x/y support the `n` variable (frame count) natively — no eval=frame needed.
  // Scale 1440→crop 1080 window pans from x=180 to x=300 over 124 frames.
  const scene2vf = [
    `scale=1440:1440:force_original_aspect_ratio=increase,crop=1440:1440`,
    `crop=w=1080:h=1080:x='180+120*n/124':y='180'`,
    `eq=contrast=1.38:saturation=0.16:brightness=-0.06:gamma=0.87`,
    `vignette=PI/3.2`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x000820@0.14:t=fill`,
    `drawbox=x=0:y=ih*0.60:w=iw:h=ih*0.40:color=0x${hex}@0.82:t=fill`,
    `drawbox=x=0:y=0:w=iw:h=ih*0.07:color=black@0.55:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y='h*0.67+max(0,h*0.33+100)*(1-min(t/0.8,1))':fontsize=52:fontcolor=white:shadowcolor=black@0.90:shadowx=3:shadowy=3:alpha='if(lt(t,0.3),0,if(lt(t,1.1),(t-0.3)/0.8,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='  ${cta}  ':x=(w-tw)/2:y=h*0.82:fontsize=46:fontcolor=white:box=1:boxcolor=white@0.20:boxborderw=26:shadowcolor=black@0.55:shadowx=2:shadowy=2:alpha='if(lt(t,2.0),0,if(lt(t,3.0),(t-2.0)/1.0,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  // ── SCENE 3: CTA FINALE — brand colour dominant, zoom OUT ─────────────
  // zoompan at 540p zooms out (z decreases), revealing more of the image.
  const scene3vf = [
    `scale=540:540:force_original_aspect_ratio=increase,crop=540:540`,
    `zoompan=z='max(1.18-0.00144*on,1.0)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=540x540:fps=25`,
    `scale=1080:1080`,
    `eq=contrast=1.10:saturation=1.22:brightness=-0.02:gamma=0.93`,
    `vignette=PI/4.5`,
    `drawbox=x=0:y=0:w=iw:h=ih*0.52:color=black@0.50:t=fill`,
    `drawbox=x=0:y=ih*0.48:w=iw:h=ih*0.52:color=0x${hex}@0.92:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${brand}':x=(w-tw)/2:y=h*0.12:fontsize=68:fontcolor=white:shadowcolor=black@0.85:shadowx=3:shadowy=3:alpha='if(lt(t,0.4),0,if(lt(t,1.1),(t-0.4)/0.7,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y=h*0.26:fontsize=36:fontcolor=white@0.88:shadowcolor=black@0.70:shadowx=2:shadowy=2:alpha='if(lt(t,1.0),0,if(lt(t,1.7),(t-1.0)/0.7,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='  ${cta}  ':x=(w-tw)/2:y=h*0.60:fontsize=56:fontcolor=white:box=1:boxcolor=white@0.22:boxborderw=32:shadowcolor=black@0.5:shadowx=2:shadowy=2:alpha='if(lt(t,1.6),0,if(lt(t,2.4),(t-1.6)/0.8,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  try {
    console.log("[video] Generating 3 scenes in parallel...");

    // Run all 3 scene renders simultaneously
    await Promise.all([
      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", imgPath,
        "-vf", scene1vf, ...ENC, s1Path,
      ], { timeout: 240_000, maxBuffer: 50 * 1024 * 1024 }),

      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", imgPath,
        "-vf", scene2vf, ...ENC, s2Path,
      ], { timeout: 60_000, maxBuffer: 50 * 1024 * 1024 }),

      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", imgPath,
        "-vf", scene3vf, ...ENC, s3Path,
      ], { timeout: 240_000, maxBuffer: 50 * 1024 * 1024 }),
    ]);

    // Stream-copy concat — no re-encoding, nearly instant
    fs.writeFileSync(listPath, `file '${s1Path}'\nfile '${s2Path}'\nfile '${s3Path}'\n`);
    await execFileAsync(FFMPEG_BIN, [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath,
      "-c", "copy", "-movflags", "+faststart", outPath,
    ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });

    if (!fs.existsSync(outPath)) throw new Error("FFmpeg concat finished but output missing");
    const size = fs.statSync(outPath).size;
    console.log(`[video] Done! ${id}.mp4 — ${(size / 1024).toFixed(0)} KB`);
    return `/api/video/${id}.mp4`;
  } catch (err: any) {
    console.error("[video] FFmpeg error:", err?.message?.slice?.(0, 400));
    console.error("[video] stderr:", err?.stderr?.slice?.(0, 1200) ?? "none");
    throw err;
  } finally {
    for (const f of [imgPath, s1Path, s2Path, s3Path, listPath]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
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

  // ===== VIDEO FILE STREAMING (with Range request support for scrubbing) =====
  app.get("/api/video/:filename", (req, res) => {
    const { filename } = req.params;
    // Sanitize — only allow safe filenames
    if (!/^[\w\-]+\.mp4$/.test(filename)) return res.status(400).end();
    const filePath = path.join(VIDEO_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Video not found or expired" });

    const total = fs.statSync(filePath).size;
    const range = req.headers.range;

    if (range) {
      const [s, e] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(s, 10);
      const end   = e ? parseInt(e, 10) : total - 1;
      res.writeHead(206, {
        "Content-Range":  `bytes ${start}-${end}/${total}`,
        "Accept-Ranges":  "bytes",
        "Content-Length": end - start + 1,
        "Content-Type":   "video/mp4",
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type":   "video/mp4",
        "Accept-Ranges":  "bytes",
        "Cache-Control":  "public, max-age=7200",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

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
            // Step 1: Generate AI ad image
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
            // Step 2: Encode the image into a real MP4 video with FFmpeg
            const videoUrl = await generateAdVideo({
              imageData,
              headline: adCopy.headline,
              cta: adCopy.cta,
              primaryColor: brand.primaryColor,
              brandName: brand.name,
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
              videoUrl,
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

  // ===== VIDEO TEST ENDPOINT (cinematic 3-scene pipeline) =====
  app.get("/api/test-video", async (_req, res) => {
    try {
      const id      = `${Date.now()}`;
      const imgPath = path.join(os.tmpdir(), `tv_in_${id}.png`);

      // Step 1 — generate a vivid test image with ffmpeg lavfi
      await execFileAsync(FFMPEG_BIN, [
        "-y", "-f", "lavfi",
        "-i", "color=c=0x6366f1:size=1080x1080:duration=1",
        "-vf", [
          "geq=r='80+60*sin(2*PI*X/540)':g='60+40*cos(2*PI*Y/540)':b='200+55*sin(2*PI*(X+Y)/1080)'",
          `drawtext=fontfile=${FONT_BOLD}:text='Sample Product':x=(w-tw)/2:y=(h-th)/2:fontsize=60:fontcolor=white:shadowcolor=black@0.7:shadowx=3:shadowy=3`,
        ].join(","),
        "-vframes", "1", imgPath,
      ], { timeout: 15000, maxBuffer: 10 * 1024 * 1024 });

      // Step 2 — run full cinematic pipeline (returns /api/video/:id.mp4)
      const imageData = `data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}`;
      const videoUrl  = await generateAdVideo({
        imageData,
        headline:     "Drive Your Dream",
        cta:          "Shop Now",
        primaryColor: "#6366f1",
        brandName:    "AdCreative AI",
      });
      try { fs.unlinkSync(imgPath); } catch {}

      // Stream the file directly from VIDEO_DIR
      const filename = path.basename(videoUrl); // "xxx.mp4"
      const filePath = path.join(VIDEO_DIR, filename);
      const total    = fs.statSync(filePath).size;
      res.writeHead(200, {
        "Content-Type":   "video/mp4",
        "Content-Length": total,
        "Accept-Ranges":  "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err: any) {
      console.error("[test-video] error:", err?.message);
      res.status(500).json({ error: err?.message, stderr: err?.stderr?.slice?.(0, 800) });
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
          ? (interval === "yearly" ? 5000 : 700)
          : (interval === "yearly" ? 10000 : 1400);
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

  // ── AD ACCOUNTS ──────────────────────────────────────────────────────
  app.get("/api/ad-accounts", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const accounts = await storage.getAdAccounts(userId);
    res.json(accounts);
  });

  app.post("/api/ad-accounts", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const schema = z.object({
      platform: z.enum(["meta", "google", "tiktok", "snapchat", "twitter"]),
      accountId: z.string().min(1),
      accountName: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
    const existing = await storage.getAdAccounts(userId);
    const alreadyConnected = existing.find((a) => a.platform === parsed.data.platform);
    if (alreadyConnected) return res.status(400).json({ message: "Platform already connected" });
    const account = await storage.createAdAccount({ ...parsed.data, userId, status: "connected" });
    res.status(201).json(account);
  });

  app.delete("/api/ad-accounts/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteAdAccount(id, userId);
    res.json({ success: true });
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
