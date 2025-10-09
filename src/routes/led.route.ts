import { Router } from "express";
import { LedController } from "../controllers/led.controller";

  const ledRouter = Router();
  const ledController = new LedController();

  ledRouter.get('/', ledController.getLedState);
  ledRouter.post('/', ledController.setLedState);

  export default ledRouter;
