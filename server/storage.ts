import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import {
  brands, creatives, users, adAccounts, campaigns, campaignContacts, automationRules,
  type Brand, type InsertBrand,
  type Creative, type InsertCreative,
  type User, type InsertUser,
  type AdAccount, type InsertAdAccount,
  type Campaign, type CampaignContact,
  type AutomationRule, type InsertAutomationRule,
  type DashboardStats, type CreativeWithBrand,
} from "@shared/schema";

export interface IStorage {
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getDashboardStats(): Promise<DashboardStats>;
  getBrands(): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<void>;
  getCreatives(brandId?: number): Promise<CreativeWithBrand[]>;
  getCreative(id: number): Promise<Creative | undefined>;
  createCreative(creative: Omit<Creative, "id" | "createdAt">): Promise<Creative>;
  updateCreative(id: number, updates: Partial<Creative>): Promise<Creative | undefined>;
  deleteCreative(id: number): Promise<void>;
  getProductsWithPrices(): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;
  getAdAccounts(userId: number): Promise<AdAccount[]>;
  createAdAccount(account: InsertAdAccount): Promise<AdAccount>;
  deleteAdAccount(id: number, userId: number): Promise<void>;
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number, userId: number): Promise<Campaign | undefined>;
  createCampaign(campaign: Omit<Campaign, "id" | "createdAt">): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number, userId: number): Promise<void>;
  getCampaignContacts(campaignId: number): Promise<CampaignContact[]>;
  addCampaignContacts(campaignId: number, contacts: { phone: string; name?: string }[]): Promise<void>;
  updateContactStatus(id: number, status: string, sentAt?: Date, error?: string): Promise<void>;
  getAutomationRules(userId: number): Promise<AutomationRule[]>;
  createAutomationRule(rule: Omit<AutomationRule, "id" | "createdAt">): Promise<AutomationRule>;
  updateAutomationRule(id: number, updates: Partial<AutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return updated;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allBrands = await db.select().from(brands);
    const allCreatives = await db.select().from(creatives);
    return {
      totalBrands: allBrands.length,
      totalCreatives: allCreatives.length,
      readyCreatives: allCreatives.filter(c => c.status === "ready").length,
      favoritedCreatives: allCreatives.filter(c => c.isFavorite).length,
    };
  }

  async getBrands(): Promise<Brand[]> {
    return db.select().from(brands).orderBy(brands.createdAt);
  }

  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [created] = await db.insert(brands).values(brand).returning();
    return created;
  }

  async updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [updated] = await db.update(brands).set(updates).where(eq(brands.id, id)).returning();
    return updated;
  }

  async deleteBrand(id: number): Promise<void> {
    await db.delete(creatives).where(eq(creatives.brandId, id));
    await db.delete(brands).where(eq(brands.id, id));
  }

  async getCreatives(brandId?: number): Promise<CreativeWithBrand[]> {
    const rows = await db
      .select({ creative: creatives, brand: brands })
      .from(creatives)
      .innerJoin(brands, eq(creatives.brandId, brands.id))
      .orderBy(creatives.createdAt);

    const filtered = brandId ? rows.filter(r => r.creative.brandId === brandId) : rows;
    return filtered.map(r => ({ ...r.creative, brand: r.brand }));
  }

  async getCreative(id: number): Promise<Creative | undefined> {
    const [creative] = await db.select().from(creatives).where(eq(creatives.id, id));
    return creative;
  }

  async createCreative(creative: Omit<Creative, "id" | "createdAt">): Promise<Creative> {
    const [created] = await db.insert(creatives).values(creative as any).returning();
    return created;
  }

  async updateCreative(id: number, updates: Partial<Creative>): Promise<Creative | undefined> {
    const [updated] = await db.update(creatives).set(updates as any).where(eq(creatives.id, id)).returning();
    return updated;
  }

  async deleteCreative(id: number): Promise<void> {
    await db.delete(creatives).where(eq(creatives.id, id));
  }

  async getAdAccounts(userId: number): Promise<AdAccount[]> {
    return db.select().from(adAccounts).where(eq(adAccounts.userId, userId));
  }

  async createAdAccount(account: InsertAdAccount): Promise<AdAccount> {
    const [created] = await db.insert(adAccounts).values(account).returning();
    return created;
  }

  async deleteAdAccount(id: number, userId: number): Promise<void> {
    await db.delete(adAccounts).where(eq(adAccounts.id, id));
  }

  async getCampaigns(userId: number): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(campaigns.createdAt);
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!c || c.userId !== userId) return undefined;
    return c;
  }

  async createCampaign(campaign: Omit<Campaign, "id" | "createdAt">): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign as any).returning();
    return created;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns).set(updates as any).where(eq(campaigns.id, id)).returning();
    return updated;
  }

  async deleteCampaign(id: number, userId: number): Promise<void> {
    await db.delete(campaignContacts).where(eq(campaignContacts.campaignId, id));
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async getCampaignContacts(campaignId: number): Promise<CampaignContact[]> {
    return db.select().from(campaignContacts).where(eq(campaignContacts.campaignId, campaignId));
  }

  async addCampaignContacts(campaignId: number, contacts: { phone: string; name?: string }[]): Promise<void> {
    if (contacts.length === 0) return;
    await db.insert(campaignContacts).values(contacts.map(c => ({ campaignId, phone: c.phone, name: c.name ?? null, status: "pending" })));
  }

  async updateContactStatus(id: number, status: string, sentAt?: Date, error?: string): Promise<void> {
    await db.update(campaignContacts).set({ status, sentAt: sentAt ?? null, error: error ?? null } as any).where(eq(campaignContacts.id, id));
  }

  async getAutomationRules(userId: number): Promise<AutomationRule[]> {
    return db.select().from(automationRules).where(eq(automationRules.userId, userId)).orderBy(automationRules.createdAt);
  }

  async createAutomationRule(rule: Omit<AutomationRule, "id" | "createdAt">): Promise<AutomationRule> {
    const [created] = await db.insert(automationRules).values(rule as any).returning();
    return created;
  }

  async updateAutomationRule(id: number, updates: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const [updated] = await db.update(automationRules).set(updates as any).where(eq(automationRules.id, id)).returning();
    return updated;
  }

  async deleteAutomationRule(id: number, userId: number): Promise<void> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
  }

  async getProductsWithPrices(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT
          p.id as product_id, p.name as product_name,
          p.description as product_description, p.metadata as product_metadata,
          pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring, pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);
      const map = new Map<string, any>();
      for (const row of result.rows as any[]) {
        if (!map.has(row.product_id)) {
          map.set(row.product_id, {
            id: row.product_id, name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata || {},
            prices: [],
          });
        }
        if (row.price_id) {
          map.get(row.product_id).prices.push({
            id: row.price_id, unit_amount: row.unit_amount,
            currency: row.currency, recurring: row.recurring,
          });
        }
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
      );
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }
}

export const storage = new DatabaseStorage();
