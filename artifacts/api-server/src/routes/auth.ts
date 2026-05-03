import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@workspace/db";
import { users } from "../../../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ name, email, password: hashedPassword }).returning();
    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );
    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  const { password: _, ...safeUser } = user;
  return res.json(safeUser);
});

export default router;
