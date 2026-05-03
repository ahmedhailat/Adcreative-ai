import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import brandsRouter from "./brands";
import creativesRouter from "./creatives";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(brandsRouter);
router.use(creativesRouter);
router.use(dashboardRouter);

export default router;
