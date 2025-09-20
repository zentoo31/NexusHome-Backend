import express from 'express';
import { createLedRoutes } from './routes/ledRoutes';
import { LedService } from './services/ledService';
import { WebSocketService } from './services/webSocket.service';

export const createApp = (ledService: LedService, webSocketService: WebSocketService) => {
  const app = express();
  app.use(express.json());

  app.use('/api/led', createLedRoutes(ledService, webSocketService));

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  return app;
};