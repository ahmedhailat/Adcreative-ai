import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import path from "path";

const app = express();
app.set("trust proxy", 1);

declare module "express-session" {
  interface SessionData { userId: number; }
}

app.use(express.json({
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: false }));

// Session middleware
const PgSession = connectPgSimple(session);
const isHttps = process.env.NODE_ENV === "production";
app.use(session({
  secret: process.env.SESSION_SECRET || "adcreative-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "session",
    createTableIfMissing: true,
  }),
  cookie: {
    secure: isHttps,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: isHttps ? "none" : "lax",
  },
}));

// Lazy initialization — routes registered once on first request
let initPromise: Promise<void> | null = null;

function initialize() {
  if (!initPromise) {
    initPromise = (async () => {
      const { registerRoutes } = await import("../server/routes");
      const httpServer = createServer(app);
      await registerRoutes(httpServer, app);
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        if (res.headersSent) return next(err);
        res.status(status).json({ message: err.message || "Internal Server Error" });
      });
    })();
  }
  return initPromise;
}

export default async function handler(req: Request, res: Response) {
  await initialize();
  app(req, res);
}
