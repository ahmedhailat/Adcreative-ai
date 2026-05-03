import { Router } from "express";
import { db } from "@workspace/db";
import { brands, creatives } from "../../../../shared/schema";

const router = Router();

router.get("/dashboard/stats", async (_req, res) => {
  try {
    const allBrands = await db.select().from(brands);
    const allCreatives = await db.select().from(creatives);
    return res.json({
      totalBrands: allBrands.length,
      totalCreatives: allCreatives.length,
      readyCreatives: allCreatives.filter((c: any) => c.status === "ready").length,
      favoritedCreatives: allCreatives.filter((c: any) => c.isFavorite).length,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
