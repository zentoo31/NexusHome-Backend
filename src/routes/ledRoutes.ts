import { Router } from "express";
import { LedController } from "../controllers/ledController";
import { LedService } from "../services/ledService";
import { WebSocketService } from "../services/webSocket.service";

export const createLedRoutes = (ledService: LedService, webSocketService: WebSocketService): Router => {
  const ledRouter = Router();
  const ledController = new LedController(ledService, webSocketService);

  ledRouter.get('/', ledController.getLedState);
  ledRouter.post('/', ledController.setLedState);

  return ledRouter;
};