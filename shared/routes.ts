import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { TWILIO_CONFIGURED, getTwilioClient, TWILIO_FROM_SMS, TWILIO_FROM_WA } from "./twilioClient";
import { replicate, LIVE_PORTRAIT_VERSION } from "./replicateClient";
import { DID_CONFIGURED, uploadImageToDID, uploadDriverToDID, createDIDClip, getDIDClip } from "./didClient";
import { stripe } from "./stripeClient";
import { handleStripeWebhook } from "./webhookHandlers";
import { api } from "@shared/routes";
import { AD_FORMATS } from "@shared/schema";
import { z } from "zod";
import { execFileSync } from "child_process";
import ffmpegStaticPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

// ── Resolve a working ffmpeg binary ─────────────────────────────────────────
// IMPORTANT: the npm "ffmpeg-static" package's bundled binary does NOT include
// the "drawtext" filter (used everywhere in this file for headline/CTA/brand
// text overlays), so it must only be used as a last resort. We prefer the
// system "ffmpeg" (from $PATH — e.g. Replit's Nix env, or apt-installed
// ffmpeg on Render via an Aptfile) because that build has full filter support.
function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH; // manual override

  // Try system ffmpeg on $PATH first — verify it actually runs.
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore", timeout: 5000 });
    return "ffmpeg";
  } catch {
    console.warn("[video] system \"ffmpeg\" not found on $PATH — falling back to ffmpeg-static (NOTE: lacks drawtext filter support)");
  }

  if (ffmpegStaticPath && fs.existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath as unknown as string;
  }

  console.error("[video] No working ffmpeg binary found (system PATH or ffmpeg-static). Video generation WILL fail.");
  return "ffmpeg"; // let it fail loudly with a clear ENOENT rather than silently
}

const FFMPEG_BIN = resolveFfmpeg();
console.log(`[video] Using ffmpeg binary: ${FFMPEG_BIN}`);

const FONT_BOLD =
  process.env.FONT_BOLD_PATH ||
  (fs.existsSync("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    ? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    : "");
if (!FONT_BOLD) {
  console.warn("[video] DejaVuSans-Bold.ttf not found — drawtext will fail unless FONT_BOLD_PATH is set");
}

// Persistent video storage — served via /api/video/:filename
const VIDEO_DIR         = "/tmp/ad_videos";
const UPLOAD_DIR        = "/tmp/uploads";
const AVATAR_UPLOAD_DIR = "/tmp/avatar-inputs";
for (const d of [VIDEO_DIR, UPLOAD_DIR, AVATAR_UPLOAD_DIR]) {
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

// Multer for avatar inputs — accepts images + videos, saves to AVATAR_UPLOAD_DIR
const avatarUpload = multer({
  dest: AVATAR_UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "video/mp4", "video/quicktime", "video/mov"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, MP4, or MOV files are allowed"));
    }
  },
});

// ── Ad Copy: smart template engine (no external API needed) ──────────────────
function generateAdCopy(params: {
  brandName: string;
  brandIndustry: string;
  primaryColor: string;
  productName: string;
  productDescription: string;
  targetAudience: string;
  goal: string;
  platform: string;
  formatName: string;
}): { headline: string; description: string; cta: string } {
  const { productName, brandName, goal, productDescription, targetAudience, brandIndustry } = params;
  const audience = targetAudience || "everyone";
  const shortDesc = productDescription.length > 90
    ? productDescription.slice(0, 87) + "..."
    : productDescription;

  const hash = (productName + goal + brandName)
    .split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const goalMap: Record<string, { headlines: string[]; descriptions: string[]; ctas: string[] }> = {
    awareness: {
      headlines: [
        `Introducing ${productName} by ${brandName}`,
        `Meet ${productName} — Made for ${audience}`,
        `${brandName} Presents: ${productName}`,
        `The ${brandName} ${productName} Experience`,
        `Discover What Makes ${productName} Different`,
      ],
      descriptions: [
        shortDesc,
        `${shortDesc} Trusted by ${brandIndustry} professionals worldwide.`,
        `${shortDesc} See why thousands choose ${brandName}.`,
      ],
      ctas: ["Learn More", "Discover Now", "See How It Works", "Explore"],
    },
    sales: {
      headlines: [
        `${productName} — Shop Today`,
        `Get ${productName} at the Best Price`,
        `${brandName}'s ${productName}: Limited Offer`,
        `Best Deal on ${productName} — Today Only`,
        `${productName}: Premium Quality, Unbeatable Price`,
      ],
      descriptions: [
        `${shortDesc} Order now and get it delivered fast.`,
        `${shortDesc} Special offer for new customers.`,
        shortDesc,
      ],
      ctas: ["Shop Now", "Buy Today", "Get Yours", "Order Now", "Grab the Deal"],
    },
    leads: {
      headlines: [
        `Interested in ${productName}? Let's Talk`,
        `Get a Free ${productName} Consultation`,
        `${brandName}: ${productName} for ${brandIndustry}`,
        `Transform Your Results with ${productName}`,
        `Ready to Start with ${productName}?`,
      ],
      descriptions: [
        `${shortDesc} Get a free consultation today.`,
        `${shortDesc} Our team is ready to help you.`,
        shortDesc,
      ],
      ctas: ["Get a Quote", "Contact Us", "Book a Call", "Request Info", "Start Free"],
    },
    traffic: {
      headlines: [
        `Explore ${productName} on Our Website`,
        `${brandName}: Your Source for ${productName}`,
        `Visit Us & Discover ${productName}`,
        `See Everything ${brandName} Has to Offer`,
        `${productName}: Explore the Full Collection`,
      ],
      descriptions: [
        `${shortDesc} Browse our full selection online.`,
        shortDesc,
        `${shortDesc} Visit today and see for yourself.`,
      ],
      ctas: ["Visit Now", "Browse Today", "See More", "Explore", "Go to Site"],
    },
    engagement: {
      headlines: [
        `Share Your ${productName} Story`,
        `Join the ${brandName} Community`,
        `We Want to Hear From You — ${productName}`,
        `${productName}: What's Your Experience?`,
        `Connect with ${brandName} Today`,
      ],
      descriptions: [
        `${shortDesc} Join thousands of happy customers.`,
        shortDesc,
        `${shortDesc} Be part of our growing community.`,
      ],
      ctas: ["Join Now", "Share Today", "Like & Follow", "Get Involved", "Connect"],
    },
  };

  const data = goalMap[goal] || goalMap.awareness;
  const hi = hash % data.headlines.length;
  const di = (hash + 2) % data.descriptions.length;
  const ci = (hash + 1) % data.ctas.length;

  return {
    headline: data.headlines[hi],
    description: data.descriptions[di],
    cta: data.ctas[ci],
  };
}

// ── Image generation: Pollinations.ai (free, no API key needed, FLUX model) ──
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
  scene?: "hero" | "lifestyle" | "cta";
}): Promise<string> {
  const emotionByGoal: Record<string, string> = {
    awareness: "joy and discovery",
    sales: "desire and excitement",
    leads: "trust and confidence",
    traffic: "curiosity and invitation",
    engagement: "community and belonging",
  };
  const emotion = emotionByGoal[params.goal] ?? "professionalism";

  const scenePrompts: Record<string, string> = {
    hero: `Premium product advertisement photo for ${params.brandName} featuring ${params.productName}. ` +
      `Clean studio shot, isolated product on sleek gradient background using ${params.primaryColor} color palette. ` +
      `Dramatic professional lighting, high-end commercial photography like Apple product launch. ` +
      `Ultra-clean 1:1 composition, luxury brand aesthetic. ${params.productDescription}`,

    lifestyle: `Lifestyle advertising photograph for ${params.brandName} ${params.productName}. ` +
      `Real people in authentic setting experiencing ${emotion}. ` +
      `Warm golden hour lighting, candid yet polished. ${params.primaryColor} color grading. ` +
      `High-end magazine editorial style, Instagram-worthy. ${params.productDescription}`,

    cta: `Bold graphic advertising poster for ${params.brandName} ${params.productName}. ` +
      `Strong typography layout, ${params.primaryColor} dominant background. ` +
      `Professional advertising agency design, Spotify/Airbnb campaign style. ` +
      `"${params.headline}" headline, "${params.cta}" call to action text visible. ` +
      `${params.secondaryColor} accent color. Modern clean grid layout.`,
  };

  const sceneKey = params.scene ?? "hero";
  const prompt = scenePrompts[sceneKey];

  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=false&seed=${seed}`;

  console.log(`[image] Generating scene="${sceneKey}" via Pollinations.ai (FLUX)...`);

  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 429) {
        clearTimeout(timeout);
        if (attempt < MAX_ATTEMPTS) {
          const wait = attempt * 3000; // 3s, 6s, 9s
          console.log(`[image] 429 rate limit — retrying in ${wait / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error("Pollinations rate limit — please try again in a moment");
      }
      if (!response.ok) throw new Error(`Pollinations returned ${response.status}`);
      const buffer = await response.arrayBuffer();
      const b64 = Buffer.from(buffer).toString("base64");
      console.log(`[image] Scene "${sceneKey}" done — ${Math.round(b64.length / 1024)}KB`);
      return `data:image/jpeg;base64,${b64}`;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Image generation failed after all retries");
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
  images: string[];  // [heroImage, lifestyleImage, ctaImage] as base64 data URLs
  headline: string;
  cta: string;
  primaryColor: string;
  brandName: string;
}): Promise<string> {
  const id      = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outPath = path.join(VIDEO_DIR, `${id}.mp4`);

  console.log("[video] Generating 3-scene cinematic ad with distinct scenes:", params.headline);

  // Write all 3 scene images to disk
  const imgPaths = params.images.map((imgData, i) => {
    const p = path.join(os.tmpdir(), `ad_img_${id}_s${i+1}.png`);
    const raw = imgData.replace(/^data:image\/[\w+]+;base64,/, "");
    fs.writeFileSync(p, Buffer.from(raw, "base64"));
    return p;
  });
  const [img1Path, img2Path, img3Path] = imgPaths;
  console.log("[video] 3 distinct scene images written to disk");

  const hex   = params.primaryColor.replace("#", "").padEnd(6, "0").slice(0, 6);
  const brand = ffText(params.brandName);
  const hl    = ffText(params.headline);
  const cta   = ffText(params.cta);

  // ─────────────────────────────────────────────────────────────────────────
  // 3 SCENES · 15 seconds · 25 fps
  // Each scene uses a DIFFERENT AI-generated image for real visual variety:
  //
  //  Scene 1  0–5 s  : PRODUCT HERO   — studio shot, zoom IN, warm grade
  //  Scene 2  5–10 s : LIFESTYLE      — in-use shot, pan L→R, natural grade
  //  Scene 3  10–15 s: CTA FINALE     — graphic close, zoom OUT, brand colour
  // ─────────────────────────────────────────────────────────────────────────

  const s1Path   = path.join(os.tmpdir(), `s1_${id}.mp4`);
  const s2Path   = path.join(os.tmpdir(), `s2_${id}.mp4`);
  const s3Path   = path.join(os.tmpdir(), `s3_${id}.mp4`);
  const listPath = path.join(os.tmpdir(), `concat_${id}.txt`);

  const ENC = ["-r","25","-c:v","libx264","-pix_fmt","yuv420p","-preset","fast","-crf","26"];

  // ── SCENE 1: PRODUCT HERO — warm golden grade, zoom IN ────────────────
  const scene1vf = [
    `scale=540:540:force_original_aspect_ratio=increase,crop=540:540`,
    `zoompan=z='min(1+0.00055*on,1.18)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=540x540:fps=25`,
    `scale=1080:1080`,
    `eq=contrast=1.08:saturation=1.35:brightness=0.02:gamma=0.96`,
    `vignette=PI/4.5`,
    `drawbox=x=0:y=ih*0.72:w=iw:h=ih*0.28:color=black@0.72:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${brand}':x=(w-tw)/2:y=h*0.76:fontsize=72:fontcolor=white:shadowcolor=black@0.85:shadowx=4:shadowy=4:alpha='if(lt(t,0.6),t/0.6,1)'`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y=h*0.87:fontsize=30:fontcolor=white@0.90:shadowcolor=black@0.65:shadowx=2:shadowy=2:alpha='if(lt(t,1.2),0,if(lt(t,2.0),(t-1.2)/0.8,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  // ── SCENE 2: LIFESTYLE — natural grade, pan L→R ──────────────────────
  const scene2vf = [
    `scale=1440:1440:force_original_aspect_ratio=increase,crop=1440:1440`,
    `crop=w=1080:h=1080:x='180+120*n/124':y='180'`,
    `eq=contrast=1.18:saturation=1.10:brightness=0.01:gamma=0.95`,
    `vignette=PI/4.0`,
    `drawbox=x=0:y=ih*0.65:w=iw:h=ih*0.35:color=0x${hex}@0.85:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y='h*0.69+max(0,h*0.15)*(1-min(t/0.8,1))':fontsize=46:fontcolor=white:shadowcolor=black@0.90:shadowx=3:shadowy=3:alpha='if(lt(t,0.3),0,if(lt(t,1.1),(t-0.3)/0.8,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='  ${cta}  ':x=(w-tw)/2:y=h*0.84:fontsize=40:fontcolor=white:box=1:boxcolor=white@0.20:boxborderw=22:shadowcolor=black@0.55:shadowx=2:shadowy=2:alpha='if(lt(t,1.8),0,if(lt(t,2.8),(t-1.8)/1.0,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  // ── SCENE 3: CTA FINALE — brand colour dominant, zoom OUT ─────────────
  const scene3vf = [
    `scale=540:540:force_original_aspect_ratio=increase,crop=540:540`,
    `zoompan=z='max(1.18-0.00144*on,1.0)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=540x540:fps=25`,
    `scale=1080:1080`,
    `eq=contrast=1.12:saturation=1.28:brightness=-0.02:gamma=0.93`,
    `vignette=PI/4.5`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${hex}@0.55:t=fill`,
    `drawbox=x=iw*0.08:y=ih*0.20:w=iw*0.84:h=ih*0.60:color=black@0.65:t=fill`,
    `drawtext=fontfile=${FONT_BOLD}:text='${brand}':x=(w-tw)/2:y=h*0.26:fontsize=64:fontcolor=white:shadowcolor=black@0.85:shadowx=3:shadowy=3:alpha='if(lt(t,0.4),0,if(lt(t,1.1),(t-0.4)/0.7,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='${hl}':x=(w-tw)/2:y=h*0.42:fontsize=34:fontcolor=white@0.90:shadowcolor=black@0.70:shadowx=2:shadowy=2:alpha='if(lt(t,0.9),0,if(lt(t,1.6),(t-0.9)/0.7,1))'`,
    `drawtext=fontfile=${FONT_BOLD}:text='  ${cta}  ':x=(w-tw)/2:y=h*0.59:fontsize=52:fontcolor=white:box=1:boxcolor=0x${hex}@0.90:boxborderw=28:shadowcolor=black@0.5:shadowx=2:shadowy=2:alpha='if(lt(t,1.5),0,if(lt(t,2.3),(t-1.5)/0.8,1))'`,
    `fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5`,
  ].join(",");

  try {
    console.log("[video] Rendering 3 unique-image scenes in parallel...");

    // Each scene uses its OWN unique AI-generated image
    await Promise.all([
      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", img1Path,
        "-vf", scene1vf, ...ENC, s1Path,
      ], { timeout: 240_000, maxBuffer: 50 * 1024 * 1024 }),

      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", img2Path,
        "-vf", scene2vf, ...ENC, s2Path,
      ], { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 }),

      execFileAsync(FFMPEG_BIN, [
        "-y", "-loop", "1", "-t", "5", "-i", img3Path,
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
    for (const f of [...imgPaths, s1Path, s2Path, s3Path, listPath]) {
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

      // Seed 3 free credits for every new user
      await db.execute(sql`
        INSERT INTO user_credits (user_id, balance)
        VALUES (${user.id}, 3)
        ON CONFLICT (user_id) DO NOTHING
      `);

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
          const adCopy = generateAdCopy({
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
            // Step 1: Generate 3 DISTINCT AI images in parallel (hero / lifestyle / cta)
            const sceneParams = {
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
            };
            // Generate sequentially to avoid rate-limiting Pollinations.ai
            console.log("[video] Generating 3 scene images sequentially...");
            const heroImage = await generateAdImage({ ...sceneParams, scene: "hero" });
            await new Promise(r => setTimeout(r, 1500));
            const lifestyleImage = await generateAdImage({ ...sceneParams, scene: "lifestyle" });
            await new Promise(r => setTimeout(r, 1500));
            const ctaImage = await generateAdImage({ ...sceneParams, scene: "cta" });
            // Step 2: Stitch 3 unique images into a real 15-second MP4
            const videoUrl = await generateAdVideo({
              images: [heroImage, lifestyleImage, ctaImage],
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
              imageData: heroImage,
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

  // ===== SLIDESHOW GENERATOR =====
  async function generateSlideshowVideo(imagePaths: string[]): Promise<string> {
    const id      = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const outPath = path.join(VIDEO_DIR, `${id}.mp4`);
    const n       = imagePaths.length;

    const duration    = 3.0; // seconds each image is uniquely visible
    const fadeDur     = 0.5; // crossfade duration
    const inputDur    = duration + fadeDur; // each input slightly longer to allow overlap

    // Inputs: loop each image
    const inputArgs = imagePaths.flatMap(p => ["-loop", "1", "-t", String(inputDur), "-i", p]);

    // Scale each to 1080×1080
    const scaleFilters = imagePaths.map((_, i) =>
      `[${i}:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,setsar=1,fps=25[v${i}]`
    );

    // xfade chain (offset = i * (duration - fadeDur))
    let xfadeFilters: string[] = [];
    if (n > 1) {
      let lastLabel = "[v0]";
      for (let i = 1; i < n; i++) {
        const offset   = i * (duration - fadeDur);
        const outLabel = i === n - 1 ? "[out]" : `[xf${i}]`;
        xfadeFilters.push(`${lastLabel}[v${i}]xfade=transition=fade:duration=${fadeDur}:offset=${offset}${outLabel}`);
        lastLabel = `[xf${i}]`;
      }
    }

    const filterComplex = [...scaleFilters, ...xfadeFilters].join(";");
    const mapLabel      = n === 1 ? "[v0]" : "[out]";

    console.log(`[slideshow] Building ${n}-image slideshow → ${id}.mp4`);
    await execFileAsync(FFMPEG_BIN, [
      "-y",
      ...inputArgs,
      "-filter_complex", filterComplex,
      "-map", mapLabel,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "26",
      "-movflags", "+faststart",
      outPath,
    ], { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 });

    if (!fs.existsSync(outPath)) throw new Error("FFmpeg slideshow finished but output missing");
    const size = fs.statSync(outPath).size;
    console.log(`[slideshow] Done! ${id}.mp4 — ${(size / 1024).toFixed(0)} KB`);
    return `/api/video/${id}.mp4`;
  }

  // ===== IMAGE SLIDESHOW → VIDEO =====
  const imagesUpload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per image
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/creatives/upload-images-video", imagesUpload.array("images", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No image files uploaded" });
      }

      const {
        brandId, title, platform, formatSize, formatName,
        productName, productDescription, goal, targetAudience,
      } = req.body;

      if (!brandId || !platform || !formatSize || !productName || !productDescription || !goal) {
        files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
        return res.status(400).json({ message: "Missing required fields" });
      }

      const adTitle = title || `${productName} – ${formatName || formatSize}`;

      // Create a "generating" creative record immediately so the client can poll
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
        videoUrl: null,
        mediaType: "video",
        status: "generating",
        performanceScore: null,
        isFavorite: false,
      });

      // Generate slideshow in background
      (async () => {
        const imagePaths = files.map(f => f.path);
        try {
          const videoUrl = await generateSlideshowVideo(imagePaths);
          await storage.updateCreative(creative.id, { videoUrl, status: "ready" });
        } catch (err: any) {
          console.error("[slideshow] FFmpeg error:", err?.message);
          await storage.updateCreative(creative.id, { status: "failed" });
        } finally {
          imagePaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });
        }
      })();

      res.status(201).json(creative);
    } catch (err: any) {
      console.error("Image slideshow upload failed:", err);
      res.status(500).json({ message: err.message || "Slideshow generation failed" });
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
        images:       [imageData, imageData, imageData],
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

  // ===== DB MIGRATIONS =====
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT NOT NULL,
      message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'sms',
      status TEXT NOT NULL DEFAULT 'draft', scheduled_at TIMESTAMP,
      total_contacts INTEGER NOT NULL DEFAULT 0, sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0, media_url TEXT,
      created_at TIMESTAMP DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_contacts (
      id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL, phone TEXT NOT NULL,
      name TEXT, status TEXT NOT NULL DEFAULT 'pending', sent_at TIMESTAMP, error TEXT)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS automation_rules (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'all', condition TEXT NOT NULL, threshold TEXT NOT NULL,
      action TEXT NOT NULL, action_value TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
      triggered_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS user_credits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS avatar_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      input_image_url TEXT NOT NULL,
      input_video_url TEXT NOT NULL,
      output_video_url TEXT,
      error_message TEXT,
      credits_charged INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.execute(sql`
      ALTER TABLE avatar_jobs
      ADD COLUMN IF NOT EXISTS replicate_prediction_id TEXT
    `);
    await db.execute(sql`
      ALTER TABLE avatar_jobs
      ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'did'
    `);
    console.log("[migrations] New tables ready");
  } catch (e) {
    console.error("[migrations] Error:", e);
  }

  // ===== CAMPAIGNS =====
  app.get("/api/campaigns", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const list = await storage.getCampaigns(userId);
      res.json(list);
    } catch (e) { res.status(500).json({ message: "Failed to fetch campaigns" }); }
  });

  app.post("/api/campaigns", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const schema = z.object({
      name: z.string().min(1),
      message: z.string().min(1),
      type: z.enum(["sms", "whatsapp"]).default("whatsapp"),
      phones: z.array(z.string().min(5)).min(1),
      scheduledAt: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { phones, scheduledAt, ...rest } = parsed.data;
    const campaign = await storage.createCampaign({
      ...rest, userId,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      totalContacts: phones.length, sentCount: 0, failedCount: 0, mediaUrl: null,
    });
    await storage.addCampaignContacts(campaign.id, phones.map(p => ({ phone: p })));
    res.status(201).json(campaign);
  });

  app.post("/api/campaigns/:id/send", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const campaign = await storage.getCampaign(id, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (campaign.status === "sending" || campaign.status === "sent")
      return res.status(400).json({ message: "Campaign already sending or sent" });
    await storage.updateCampaign(id, { status: "sending" });
    res.json({ success: true });
    // Background sending
    (async () => {
      const contacts = await storage.getCampaignContacts(id);
      let sent = 0, failed = 0;
      if (TWILIO_CONFIGURED) {
        const client = getTwilioClient();
        for (const contact of contacts) {
          try {
            const isWA = campaign.type === "whatsapp";
            await client.messages.create({
              from: isWA ? TWILIO_FROM_WA : TWILIO_FROM_SMS,
              to: isWA ? `whatsapp:${contact.phone}` : contact.phone,
              body: campaign.message,
            });
            await storage.updateContactStatus(contact.id, "sent", new Date());
            sent++;
          } catch (err: any) {
            await storage.updateContactStatus(contact.id, "failed", undefined, err.message);
            failed++;
          }
        }
      } else {
        // Simulate when Twilio not configured
        for (const contact of contacts) {
          await new Promise(r => setTimeout(r, 80));
          await storage.updateContactStatus(contact.id, "sent", new Date());
          sent++;
        }
      }
      await storage.updateCampaign(id, { status: "sent", sentCount: sent, failedCount: failed });
    })().catch(console.error);
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteCampaign(id, userId);
    res.json({ success: true });
  });

  // ===== AI COPILOT =====
  app.post("/api/copilot", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { question } = z.object({ question: z.string().min(1) }).parse(req.body);
      const stats = await storage.getDashboardStats();
      const brands = await storage.getBrands();
      const prompt = `أنت مساعد ذكاء اصطناعي متخصص في التسويق الرقمي والإعلانات العربية. أجب دائماً باللغة العربية الفصحى.

بيانات حملات المستخدم:
- العلامات التجارية: ${brands.map(b => b.name).join("، ") || "لا توجد"}
- إجمالي الإعلانات: ${stats.totalCreatives}
- الإعلانات الجاهزة: ${stats.readyCreatives}
- المفضلة: ${stats.favoritedCreatives}

سؤال المستخدم: ${question}

قدم إجابة عملية وموجزة وقابلة للتطبيق فوراً. استخدم النقاط والأرقام حين تفيد.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من معالجة طلبك.";
      res.json({ answer });
    } catch (e) {
      console.error("Copilot error:", e);
      res.status(500).json({ answer: "عذراً، حدث خطأ مؤقت. يرجى المحاولة مجدداً." });
    }
  });

  // ===== UGC GENERATOR =====
  app.post("/api/ugc/analyze", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AdCreativeBot/1.0)" }, signal: controller.signal });
      clearTimeout(timeout);
      const html = await resp.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogTitle   = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
      const ogDesc    = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
      const metaDesc  = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      res.json({
        productName: (ogTitle?.[1] || titleMatch?.[1] || "").replace(/\s*[-|–|·].*/, "").trim().slice(0, 100),
        description: (ogDesc?.[1] || metaDesc?.[1] || "").trim().slice(0, 500),
        url,
      });
    } catch {
      res.status(422).json({ message: "Could not fetch URL — please enter product info manually" });
    }
  });

  app.post("/api/ugc/generate-script", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { productName, productDesc } = z.object({
        productName: z.string().min(1),
        productDesc: z.string().optional().default(""),
      }).parse(req.body);
      const prompt = `أنت خبير في إنشاء محتوى UGC للتسويق على منصات التواصل الاجتماعي.

أنشئ سكريبت فيديو UGC احترافي بالعربية للمنتج التالي:
المنتج: ${productName}
${productDesc ? `الوصف: ${productDesc}` : ""}

اكتب سكريبت مكوّن من 4 أجزاء بأسلوب طبيعي ومقنع:
1. الخطاف - جملة افتتاحية قوية تستوقف المتابع (15-20 كلمة)
2. عرض المنتج - وصف مزايا المنتج بأسلوب تلقائي (30-40 كلمة)
3. الإثبات الاجتماعي - تجربة شخصية أو نتيجة محددة (20-25 كلمة)
4. دعوة للعمل - دعوة واضحة ومباشرة (10-15 كلمة)

أضف 5 هاشتاقات عربية مناسبة.

أجب بـ JSON فقط:
{"hook":"...","demo":"...","socialProof":"...","cta":"...","productName":"${productName}","hashtags":["#...","#...","#...","#...","#..."]}`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]+\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const script = JSON.parse(jsonMatch[0]);
      res.json(script);
    } catch (e) {
      console.error("UGC script error:", e);
      res.status(500).json({ message: "Script generation failed" });
    }
  });

  // ===== AUTOMATION RULES =====
  app.get("/api/automation-rules", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const rules = await storage.getAutomationRules(userId);
    res.json(rules);
  });

  app.post("/api/automation-rules", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const schema = z.object({
      name: z.string().min(1),
      platform: z.string().default("all"),
      condition: z.string().min(1),
      threshold: z.string().min(1),
      action: z.string().min(1),
      actionValue: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const rule = await storage.createAutomationRule({
      ...parsed.data, userId, isActive: true, triggeredCount: 0,
      actionValue: parsed.data.actionValue ?? null,
    });
    res.status(201).json(rule);
  });

  app.put("/api/automation-rules/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const updated = await storage.updateAutomationRule(id, req.body);
    if (!updated) return res.status(404).json({ message: "Rule not found" });
    res.json(updated);
  });

  app.delete("/api/automation-rules/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteAutomationRule(id, userId);
    res.json({ success: true });
  });

  // ===== BULK CAMPAIGN LAUNCH =====
  app.post("/api/bulk-launch", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { creativeIds = [], platforms = [], budget, campaignName } = req.body;
    const results = [];
    for (const platform of platforms) {
      await new Promise(r => setTimeout(r, 200));
      results.push({
        platform,
        status: "success",
        campaignId: `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }
    res.json({ success: true, results, totalLaunched: creativeIds.length * platforms.length });
  });

  // ===== AVATAR STUDIO =====

  // Helper: convert /api/avatar/file/{userId}/{filename} → absolute fs path
  function avatarUrlToPath(url: string): string {
    const m = url.match(/\/api\/avatar\/file\/(\d+)\/(.+)/);
    if (!m) throw new Error(`Cannot resolve avatar file path from URL: ${url}`);
    return path.join(AVATAR_UPLOAD_DIR, m[1], m[2]);
  }

  // POST /api/avatar/upload-input — multer saves file, returns server-relative URL
  app.post("/api/avatar/upload-input", avatarUpload.single("file"), async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const type = (req.query.type as string) || (req.body?.type as string) || "file";
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(req.file.originalname).toLowerCase() || (type === "image" ? ".jpg" : ".mp4");
    const userDir = path.join(AVATAR_UPLOAD_DIR, String(userId));
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const filename = `${uuid}${ext}`;
    const dest = path.join(userDir, filename);
    fs.renameSync(req.file.path, dest);

    const url = `/api/avatar/file/${userId}/${filename}`;
    res.json({ url });
  });

  // GET /api/avatar/file/:userId/:filename — auth-protected file serving
  app.get("/api/avatar/file/:userId/:filename", (req, res) => {
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
    if (String(sessionUserId) !== req.params.userId) return res.status(403).json({ message: "Forbidden" });

    const filePath = path.join(AVATAR_UPLOAD_DIR, req.params.userId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
    res.sendFile(filePath);
  });

  // GET /api/avatar/credits — returns the authenticated user's credit balance
  app.get("/api/avatar/credits", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const rows = await db.execute(sql`
        SELECT balance FROM user_credits WHERE user_id = ${userId}
      `);
      const balance = (rows.rows[0] as any)?.balance ?? 0;
      res.json({ balance: Number(balance) });
    } catch {
      res.json({ balance: 0 });
    }
  });

  // POST /api/avatar/create-job — checks credits, inserts job, kicks off Replicate
  app.post("/api/avatar/create-job", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const schema = z.object({
      inputImageUrl: z.string().min(1),
      inputVideoUrl: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { inputImageUrl, inputVideoUrl } = parsed.data;

    try {
      // Ensure credit row exists for users created before this feature
      await db.execute(sql`
        INSERT INTO user_credits (user_id, balance)
        VALUES (${userId}, 3)
        ON CONFLICT (user_id) DO NOTHING
      `);

      const creditRows = await db.execute(sql`
        SELECT balance FROM user_credits WHERE user_id = ${userId}
      `);
      const balance = Number((creditRows.rows[0] as any)?.balance ?? 0);
      if (balance < 1) {
        return res.status(402).json({ message: "Insufficient credits" });
      }

      // Insert job as 'pending'
      const jobRows = await db.execute(sql`
        INSERT INTO avatar_jobs (user_id, status, input_image_url, input_video_url, credits_charged)
        VALUES (${userId}, 'pending', ${inputImageUrl}, ${inputVideoUrl}, 1)
        RETURNING id
      `);
      const jobId = Number((jobRows.rows[0] as any)?.id);

      // Respond immediately — AI call runs in background
      res.status(201).json({ job_id: jobId });

      // Background: start generation via D-ID (preferred) or Replicate (fallback)
      setImmediate(async () => {
        const provider = DID_CONFIGURED ? "did" : "replicate";
        try {
          const imagePath = avatarUrlToPath(inputImageUrl);
          const videoPath = avatarUrlToPath(inputVideoUrl);

          if (!fs.existsSync(imagePath) || !fs.existsSync(videoPath)) {
            throw new Error("Input files not found on server — they may have been deleted");
          }

          const imageBuffer = fs.readFileSync(imagePath);
          const videoBuffer = fs.readFileSync(videoPath);

          let predictionId: string;

          if (provider === "did") {
            // ── D-ID Clips ─────────────────────────────────────────────────
            console.log(`[avatar] Job ${jobId} → using D-ID Clips`);
            const imageExt  = path.extname(imagePath).toLowerCase() || ".jpg";
            const videoExt  = path.extname(videoPath).toLowerCase() || ".mp4";
            const imageMime = imageExt === ".png" ? "image/png" : "image/jpeg";
            const videoMime = videoExt === ".mov" ? "video/quicktime" : "video/mp4";

            const [didImageUrl, didDriverUrl] = await Promise.all([
              uploadImageToDID(imageBuffer, `face${imageExt}`, imageMime),
              uploadDriverToDID(videoBuffer, `driver${videoExt}`, videoMime),
            ]);

            predictionId = await createDIDClip(didImageUrl, didDriverUrl);
          } else {
            // ── Replicate LivePortrait ──────────────────────────────────────
            console.log(`[avatar] Job ${jobId} → using Replicate LivePortrait`);
            const imageBlob = new Blob([imageBuffer]);
            const videoBlob = new Blob([videoBuffer]);

            const prediction = await replicate.predictions.create({
              version: LIVE_PORTRAIT_VERSION,
              input: { face_image: imageBlob, driving_video: videoBlob },
            });
            predictionId = prediction.id;
          }

          await db.execute(sql`
            UPDATE avatar_jobs
            SET status = 'processing',
                replicate_prediction_id = ${predictionId},
                provider = ${provider},
                updated_at = NOW()
            WHERE id = ${jobId}
          `);
          console.log(`[avatar] Job ${jobId} → ${provider} prediction ${predictionId} started`);

        } catch (err: any) {
          const msg = `${provider === "did" ? "D-ID" : "Replicate"} error: ${err?.message ?? "Unknown error"}`;
          console.error(`[avatar] Failed to start ${provider} prediction for job ${jobId}:`, err?.message ?? err);
          await db.execute(sql`
            UPDATE avatar_jobs
            SET status = 'failed',
                error_message = ${msg},
                updated_at = NOW()
            WHERE id = ${jobId}
          `).catch(() => {});
        }
      });
    } catch (e) {
      console.error("[avatar] create-job error:", e);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // GET /api/avatar/job/:id — returns job, polls Replicate if status is 'processing'
  app.get("/api/avatar/job/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid job id" });

    try {
      const rows = await db.execute(sql`
        SELECT id, status, output_video_url, error_message,
               replicate_prediction_id, provider, created_at, updated_at
        FROM avatar_jobs
        WHERE id = ${id} AND user_id = ${userId}
      `);
      if (!rows.rows.length) return res.status(404).json({ message: "Job not found" });
      let job = rows.rows[0] as any;

      // Poll the AI provider when the job is in-flight
      if (job.status === "processing" && job.replicate_prediction_id) {
        const jobProvider: string = job.provider ?? "replicate";
        try {
          let finalStatus = "";
          let outputUrl: string | null = null;
          let errMsg: string | null = null;

          if (jobProvider === "did") {
            // ── D-ID polling ───────────────────────────────────────────────
            const clip = await getDIDClip(job.replicate_prediction_id);
            console.log(`[avatar] Job ${id} — D-ID status: ${clip.status}`);

            if (clip.status === "done") {
              finalStatus = "done";
              outputUrl   = clip.resultUrl;
            } else if (clip.status === "error") {
              finalStatus = "failed";
              errMsg      = clip.error ?? "D-ID generation failed";
            }
            // "created" | "started" → still processing, no update

          } else {
            // ── Replicate polling ──────────────────────────────────────────
            const prediction = await replicate.predictions.get(job.replicate_prediction_id);
            console.log(`[avatar] Job ${id} — Replicate status: ${prediction.status}`);

            if (prediction.status === "succeeded") {
              finalStatus = "done";
              outputUrl   = Array.isArray(prediction.output)
                ? (prediction.output[0] ?? null)
                : ((prediction.output as string | null) ?? null);
            } else if (prediction.status === "failed" || prediction.status === "canceled") {
              finalStatus = "failed";
              errMsg      = (prediction as any).error ?? "Replicate generation failed";
            }
            // "starting" | "processing" → still processing, no update
          }

          if (finalStatus === "done") {
            await db.execute(sql`
              UPDATE avatar_jobs
              SET status = 'done', output_video_url = ${outputUrl}, updated_at = NOW()
              WHERE id = ${id}
            `);
            await db.execute(sql`
              UPDATE user_credits SET balance = GREATEST(balance - 1, 0) WHERE user_id = ${userId}
            `);
            job = { ...job, status: "done", output_video_url: outputUrl };

          } else if (finalStatus === "failed") {
            await db.execute(sql`
              UPDATE avatar_jobs
              SET status = 'failed', error_message = ${errMsg}, updated_at = NOW()
              WHERE id = ${id}
            `);
            job = { ...job, status: "failed", error_message: errMsg };
          }

        } catch (pollErr: any) {
          console.error(`[avatar] ${jobProvider} poll error for job ${id}:`, pollErr?.message ?? pollErr);
          // Don't fail the HTTP response — return current DB state
        }
      }

      res.json({
        id:             job.id,
        status:         job.status,
        outputVideoUrl: job.output_video_url  ?? null,
        errorMessage:   job.error_message     ?? null,
        createdAt:      job.created_at,
        updatedAt:      job.updated_at,
      });
    } catch (e) {
      console.error("[avatar] get-job error:", e);
      res.status(500).json({ message: "Failed to fetch job" });
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