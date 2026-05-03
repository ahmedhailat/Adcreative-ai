import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { brands, creatives } from "../../../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const brandSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().default("#6366f1"),
  secondaryColor: z.string().default("#8b5cf6"),
  fontFamily: z.string().default("Inter"),
  industry: z.string().default("Technology"),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

router.get("/brands", async (_req, res) => {
  try {
    const list = await db.select().from(brands).orderBy(brands.createdAt);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch brands" });
  }
});

router.get("/brands/:id", async (req, res) => {
  try {
    const [brand] = await db.select().from(brands).where(eq(brands.id, Number(req.params.id)));
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    return res.json(brand);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch brand" });
  }
});

router.post("/brands", async (req, res) => {
  try {
    const input = brandSchema.parse(req.body);
    const [brand] = await db.insert(brands).values(input as any).returning();
    return res.status(201).json(brand);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    return res.status(500).json({ message: "Failed to create brand" });
  }
});

router.put("/brands/:id", async (req, res) => {
  try {
    const [brand] = await db.update(brands).set(req.body).where(eq(brands.id, Number(req.params.id))).returning();
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    return res.json(brand);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update brand" });
  }
});

router.delete("/brands/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(creatives).where(eq(creatives.brandId, id));
    await db.delete(brands).where(eq(brands.id, id));
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete brand" });
  }
});

export default router;
