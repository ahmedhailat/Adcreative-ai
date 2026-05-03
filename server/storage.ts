import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  brands, creatives, users,
  type Brand, type InsertBrand,
  type Creative, type InsertCreative,
  type User, type InsertUser,
  type DashboardStats,
} from "@shared/schema";

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  // Brands
  getBrands(): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<void>;
  // Creatives
  getCreatives(brandId?: number): Promise<Creative[]>;
  getCreative(id: number): Promise<Creative | undefined>;
  createCreative(creative: Omit<Creative, "id" | "createdAt">): Promise<Creative>;
  updateCreative(id: number, updates: Partial<Creative>): Promise<Creative | undefined>;
  deleteCreative(id: number): Promise<void>;
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

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
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

  async getCreatives(brandId?: number): Promise<Creative[]> {
    if (brandId) {
      return db.select().from(creatives).where(eq(creatives.brandId, brandId)).orderBy(creatives.createdAt);
    }
    return db.select().from(creatives).orderBy(creatives.createdAt);
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
}

export const storage = new DatabaseStorage();
