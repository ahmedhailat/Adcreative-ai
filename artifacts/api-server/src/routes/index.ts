import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

// Only health check is handled locally; all other /api/* requests
// are transparently proxied to the main server on port 5000.
router.use(healthRouter);

export default router;
