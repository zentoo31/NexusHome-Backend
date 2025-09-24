import { Router } from "express";
import { GpioController } from "../controllers/GpioController";
import { GpioService } from "../services/GpioService";
import { WebSocketService } from "../services/webSocket.service";

export const createGpioRoutes = (gpioService: GpioService, webSocketService: WebSocketService): Router => {
  const router = Router();
  const gpioController = new GpioController(gpioService, webSocketService);

  router.get('/', gpioController.getAllPins);
  router.get('/:pin', gpioController.getPin);
  router.post('/:pin/status', gpioController.setPinStatus);
  router.post('/:pin/mode', gpioController.setPinMode);
  router.post('/:pin/name', gpioController.updatePinName);

  return router;
};