import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust Replit's reverse proxy so secure cookies work over HTTPS
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const isHttps = !!process.env.REPL_ID || process.env.NODE_ENV === "production";

try {
  const PgSession = connectPgSimple(session);
  const store = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "session",
    createTableIfMissing: true,
  });
  store.on("error", (err: Error) => {
    logger.error({ err }, "Session store error (non-fatal)");
  });
  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET || "adcreative-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isHttps,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: isHttps ? "none" : "lax",
      },
    })
  );
} catch (err) {
  logger.error({ err }, "Failed to init session store, using memory store");
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "adcreative-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: isHttps, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7, sameSite: isHttps ? "none" : "lax" },
    })
  );
}

app.use("/api", router);

export default app;
