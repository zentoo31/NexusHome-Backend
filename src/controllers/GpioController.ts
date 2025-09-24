import { Request, Response } from 'express';
import { GpioService } from '../services/GpioService';
import { WebSocketService } from '../services/webSocket.service';

export class GpioController {
  private gpioService: GpioService;
  private webSocketService: WebSocketService;

  constructor(gpioService: GpioService, webSocketService: WebSocketService) {
    this.gpioService = gpioService;
    this.webSocketService = webSocketService;
  }

  getAllPins = (req: Request, res: Response): void => {
    try {
      const pins = this.gpioService.getAllPins();
      res.json(pins);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los pines' });
    }
  };

  getPin = (req: Request, res: Response): void => {
    try {
      const pinNumber = parseInt(req.params.pin);
      const pin = this.gpioService.getPin(pinNumber);
      
      if (!pin) {
        res.status(404).json({ error: 'Pin no encontrado' });
        return;
      }
      
      res.json(pin);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el pin' });
    }
  };

  setPinStatus = (req: Request, res: Response): void => {
    try {
      const pinNumber = parseInt(req.params.pin);
      const { status } = req.body;
      
      if (status !== 'on' && status !== 'off') {
        res.status(400).json({ error: 'Estado debe ser "on" u "off"' });
        return;
      }
      
      const pin = this.gpioService.setPinStatus(pinNumber, status);
      
      if (!pin) {
        res.status(404).json({ error: 'Pin no encontrado' });
        return;
      }
      
      // Enviar comando al ESP32 si está conectado
      this.webSocketService.sendToEsp32(`${pinNumber}:${status}`);
      
      res.json({ message: 'Estado actualizado', pin });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar el estado del pin' });
    }
  };

  setPinMode = (req: Request, res: Response): void => {
    try {
      const pinNumber = parseInt(req.params.pin);
      const { mode } = req.body;
      
      if (mode !== 'input' && mode !== 'output') {
        res.status(400).json({ error: 'Modo debe ser "input" u "output"' });
        return;
      }
      
      const pin = this.gpioService.setPinMode(pinNumber, mode);
      
      if (!pin) {
        res.status(404).json({ error: 'Pin no encontrado' });
        return;
      }
      
      res.json({ message: 'Modo actualizado', pin });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar el modo del pin' });
    }
  };

  updatePinName = (req: Request, res: Response): void => {
    try {
      const pinNumber = parseInt(req.params.pin);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Nombre es requerido' });
        return;
      }
      
      const pin = this.gpioService.updatePinName(pinNumber, name);
      
      if (!pin) {
        res.status(404).json({ error: 'Pin no encontrado' });
        return;
      }
      
      res.json({ message: 'Nombre actualizado', pin });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar el nombre del pin' });
    }
  };
}