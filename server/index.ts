import cors from "cors";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// ── Crash protection ───────────────────────────────────────────────────────
process.on("uncaughtException", (err: any) => {
  // Port conflict = fatal, must exit so the workflow can restart cleanly
  if (err.code === "EADDRINUSE") {
    console.error("[fatal] Port already in use — exiting for clean restart");
    process.exit(1);
  }
  console.error("[uncaughtException] Server kept alive:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Server kept alive:", reason);
});
// ──────────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({
  origin: [
    "https://neonadai.onrender.com",
    "https://adcreative-ai-api-server-nu.vercel.app",
    "https://neonadai.com",
    "https://www.neonadai.com"
  ],
  credentials: true,
}));
const httpServer = createServer(app);

// Trust Replit's reverse proxy so req.secure is correct and secure cookies are sent
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ── Session middleware with PG store + memory fallback ─────────────────────
function buildSessionMiddleware() {
  // Replit always serves via HTTPS (even in dev), so cookies must be secure + sameSite=none
  const isHttps = !!process.env.REPL_ID || process.env.NODE_ENV === "production";
  const baseOpts: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "adcreative-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isHttps,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: isHttps ? "none" : "lax",
    },
  };

  try {
    const PgSession = connectPgSimple(session);
    const store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    });
    store.on("error", (err: Error) => {
      console.error("[session-store] PG session store error (non-fatal):", err.message);
    });
    return session({ ...baseOpts, store });
  } catch (err) {
    console.error("[session-store] Failed to create PG store, falling back to memory store:", err);
    return session(baseOpts);
  }
}

app.use(buildSessionMiddleware());
// ──────────────────────────────────────────────────────────────────────────

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ── Request logger ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ── Health check (before routes) ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// ──────────────────────────────────────────────────────────────────────────

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[express-error]", err);
    if (res.headersSent) return next(err);
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => log(`serving on port ${port}`),
  );
})();
