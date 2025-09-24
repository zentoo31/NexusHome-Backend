import express from 'express';
import { createGpioRoutes } from './routes/gpioRoutes';
import { WebSocketService } from './services/webSocket.service';
import { GpioService } from './services/GpioService';

export const createApp = (gpioService: GpioService, webSocketService: WebSocketService) => {
  const app = express();

  app.use(express.json());

  app.use('/api/gpio', createGpioRoutes(gpioService, webSocketService));

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return app;
};