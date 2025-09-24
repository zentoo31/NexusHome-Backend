import http from 'http';
import WebSocket from 'ws';
import { createApp } from './app';
import { GpioService } from './services/GpioService';
import { WebSocketService } from './services/webSocket.service';

const gpioService = new GpioService([15, 2, 4, 16, 17, 5, 18]);

const PORT = process.env.PORT || 3000;
const server = http.createServer();

const wss = new WebSocket.Server({ server });
const webSocketService = new WebSocketService(wss, gpioService);

const app = createApp(gpioService, webSocketService);

server.on('request', app);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('Pines GPIO configurados:', gpioService.getAllPins().map(p => p.pin));
});

process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
  });
});

export { server, webSocketService, gpioService };