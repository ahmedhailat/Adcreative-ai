import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === BRANDS TABLE ===
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#6366f1"),
  secondaryColor: text("secondary_color").notNull().default("#8b5cf6"),
  fontFamily: text("font_family").notNull().default("Inter"),
  industry: text("industry").notNull(),
  website: text("website"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === CREATIVES TABLE ===
export const creatives = pgTable("creatives", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id).notNull(),
  title: text("title").notNull(),
  platform: text("platform").notNull(), // facebook, instagram, google, tiktok, twitter, linkedin
  formatSize: text("format_size").notNull(), // e.g. "1080x1080"
  formatName: text("format_name").notNull(), // e.g. "Instagram Post"
  productName: text("product_name").notNull(),
  productDescription: text("product_description").notNull(),
  targetAudience: text("target_audience"),
  goal: text("goal").notNull(), // awareness, traffic, leads, sales, engagement
  adCopy: jsonb("ad_copy"), // { headline, description, cta }
  imageData: text("image_data"), // base64 data URL or empty while generating
  status: text("status").notNull().default("generating"), // generating, ready, failed
  performanceScore: integer("performance_score"), // 0-100
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const brandsRelations = relations(brands, ({ many }) => ({
  creatives: many(creatives),
}));

export const creativesRelations = relations(creatives, ({ one }) => ({
  brand: one(brands, { fields: [creatives.brandId], references: [brands.id] }),
}));

// === SCHEMAS ===
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertCreativeSchema = createInsertSchema(creatives).omit({ id: true, createdAt: true, adCopy: true, imageData: true, status: true, performanceScore: true }).extend({
  brandId: z.coerce.number().int().positive(),
});

// === TYPES ===
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Creative = typeof creatives.$inferSelect;
export type InsertCreative = z.infer<typeof insertCreativeSchema>;

export type CreateBrandRequest = InsertBrand;
export type UpdateBrandRequest = Partial<InsertBrand>;

export interface GenerateCreativeRequest {
  brandId: number;
  platform: string;
  formatSize: string;
  formatName: string;
  productName: string;
  productDescription: string;
  targetAudience?: string;
  goal: string;
  title: string;
}

export interface AdCopy {
  headline: string;
  description: string;
  cta: string;
}

export interface CreativeWithBrand extends Creative {
  brand: Brand;
}

export interface DashboardStats {
  totalBrands: number;
  totalCreatives: number;
  readyCreatives: number;
  favoritedCreatives: number;
}

// Ad format templates
export const AD_FORMATS = [
  { id: "fb-feed", name: "Facebook Feed", platform: "facebook", size: "1200x630", width: 1200, height: 630 },
  { id: "ig-post", name: "Instagram Post", platform: "instagram", size: "1080x1080", width: 1080, height: 1080 },
  { id: "ig-story", name: "Instagram Story", platform: "instagram", size: "1080x1920", width: 1080, height: 1920 },
  { id: "google-banner", name: "Google Banner", platform: "google", size: "728x90", width: 728, height: 90 },
  { id: "google-medium", name: "Google Rectangle", platform: "google", size: "300x250", width: 300, height: 250 },
  { id: "twitter-post", name: "Twitter Post", platform: "twitter", size: "1600x900", width: 1600, height: 900 },
  { id: "linkedin-post", name: "LinkedIn Post", platform: "linkedin", size: "1200x627", width: 1200, height: 627 },
  { id: "tiktok-ad", name: "TikTok Ad", platform: "tiktok", size: "1080x1920", width: 1080, height: 1920 },
] as const;

export const INDUSTRIES = [
  "E-commerce", "Technology", "Healthcare", "Finance", "Education",
  "Real Estate", "Food & Beverage", "Fashion", "Travel", "Fitness",
  "Beauty & Cosmetics", "Automotive", "Entertainment", "Non-profit", "Other"
] as const;

export const FONTS = ["Inter", "Roboto", "Montserrat", "Poppins", "Playfair Display", "Raleway", "Lato"] as const;
