import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import driversRouter from "./drivers";
import trucksRouter from "./trucks";
import shipmentsRouter from "./shipments";
import dispatchesRouter from "./dispatches";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/drivers", driversRouter);
router.use("/trucks", trucksRouter);
router.use("/shipments", shipmentsRouter);
router.use("/dispatches", dispatchesRouter);
router.use("/users", usersRouter);

export default router;
