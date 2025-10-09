import { Router } from "express";
import { GpioController } from "../controllers/gpio.controller";
const gpioRouter = Router();
const gpioController = new GpioController();

gpioRouter.get('/', gpioController.getAllPins);
gpioRouter.get('/:pin', gpioController.getPin);
gpioRouter.post('/:pin/status', gpioController.setPinStatus);
gpioRouter.post('/:pin/mode', gpioController.setPinMode);
gpioRouter.post('/:pin/name', gpioController.updatePinName);

export default gpioRouter;
