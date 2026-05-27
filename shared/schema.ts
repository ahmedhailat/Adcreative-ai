import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === USERS TABLE ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  platform: text("platform").notNull(),
  formatSize: text("format_size").notNull(),
  formatName: text("format_name").notNull(),
  productName: text("product_name").notNull(),
  productDescription: text("product_description").notNull(),
  targetAudience: text("target_audience"),
  goal: text("goal").notNull(),
  adCopy: jsonb("ad_copy"),
  imageData: text("image_data"),
  videoUrl: text("video_url"),
  mediaType: text("media_type").notNull().default("image"),
  status: text("status").notNull().default("generating"),
  performanceScore: integer("performance_score"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === AD ACCOUNTS TABLE ===
export const adAccounts = pgTable("ad_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(), // meta, google, tiktok, snapchat, twitter
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  status: text("status").notNull().default("connected"),
  connectedAt: timestamp("connected_at").defaultNow(),
});

// === CAMPAIGNS TABLE ===
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("sms"),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  totalContacts: integer("total_contacts").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === CAMPAIGN CONTACTS TABLE ===
export const campaignContacts = pgTable("campaign_contacts", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  phone: text("phone").notNull(),
  name: text("name"),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  error: text("error"),
});

// === AUTOMATION RULES TABLE ===
export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull().default("all"),
  condition: text("condition").notNull(),
  threshold: text("threshold").notNull(),
  action: text("action").notNull(),
  actionValue: text("action_value"),
  isActive: boolean("is_active").notNull().default(true),
  triggeredCount: integer("triggered_count").notNull().default(0),
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
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, avatarUrl: true, plan: true, stripeCustomerId: true, stripeSubscriptionId: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertCreativeSchema = createInsertSchema(creatives).omit({ id: true, createdAt: true, adCopy: true, imageData: true, videoUrl: true, status: true, performanceScore: true }).extend({
  brandId: z.coerce.number().int().positive(),
});

// === TYPES ===
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = Omit<Campaign, "id" | "createdAt">;
export type CampaignContact = typeof campaignContacts.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = Omit<AutomationRule, "id" | "createdAt">;

export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = Omit<AdAccount, "id" | "connectedAt">;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Creative = typeof creatives.$inferSelect;
export type InsertCreative = z.infer<typeof insertCreativeSchema>;

export type CreateBrandRequest = InsertBrand;
export type UpdateBrandRequest = Partial<InsertBrand>;

export interface GenerateCreativeInput {
  brandId: number;
  platform: string;
  formatSize: string;
  formatName: string;
  productName: string;
  productDescription: string;
  targetAudience?: string;
  goal: string;
  title?: string;
}

export interface GenerateCreativeRequest extends GenerateCreativeInput {
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

export const PLANS = {
  free: {
    name: "Free",
    nameAr: "مجاني",
    price: 0,
    creatives: 5,
    brands: 2,
    videoUpload: false,
    aiVideo: false,
  },
  pro: {
    name: "Pro",
    nameAr: "احترافي",
    price: 29,
    creatives: 100,
    brands: 20,
    videoUpload: true,
    aiVideo: true,
  },
  business: {
    name: "Business",
    nameAr: "أعمال",
    price: 79,
    creatives: -1,
    brands: -1,
    videoUpload: true,
    aiVideo: true,
  },
} as const;
