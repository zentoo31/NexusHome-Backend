import http from 'http';
import WebSocket from 'ws';
import { createApp } from './app';
import { LedService } from './services/ledService';
import { WebSocketService } from './services/webSocket.service';

const ledService = new LedService();
const server = http.createServer();
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ server });
const webSocketService = new WebSocketService(wss, ledService);

const app = createApp(ledService, webSocketService);

server.on('request', app);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
  });
});

export { server, webSocketService, ledService };