import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Port of the main Express server that owns sessions + Vite
const MAIN_PORT = 5000;

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

// Local health check only — no session needed
app.use("/api", router);

// ── Transparent reverse proxy to main server ──────────────────────────────
// All unmatched requests (every real API call) are forwarded to port 5000.
// This ensures Set-Cookie and all other headers are forwarded intact,
// fixing the Express 5 / express-session cookie incompatibility.
app.use((req: any, res: any) => {
  const body =
    req.body && Object.keys(req.body).length > 0
      ? Buffer.from(JSON.stringify(req.body))
      : null;

  const outHeaders: http.OutgoingHttpHeaders = {
    ...(req.headers as http.OutgoingHttpHeaders),
    host: `localhost:${MAIN_PORT}`,
    "x-forwarded-proto": "https",
    "x-forwarded-for": req.ip || req.socket?.remoteAddress || "unknown",
  };

  if (body) {
    outHeaders["content-type"] = "application/json";
    outHeaders["content-length"] = body.length;
  } else {
    delete outHeaders["content-length"];
    delete outHeaders["transfer-encoding"];
  }

  const proxyReq = http.request(
    {
      hostname: "localhost",
      port: MAIN_PORT,
      path: req.url,
      method: req.method,
      headers: outHeaders,
    },
    (proxyRes) => {
      // Forward status + ALL response headers (including Set-Cookie!)
      res.status(proxyRes.statusCode ?? 200);
      for (const [key, val] of Object.entries(proxyRes.headers)) {
        if (val !== undefined) res.setHeader(key, val);
      }
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on("error", (err) => {
    logger.error({ err }, "Proxy to main server failed");
    if (!res.headersSent) {
      res.status(502).json({ message: "Service temporarily unavailable" });
    }
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
});

export default app;
