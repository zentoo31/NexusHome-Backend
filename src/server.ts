import http from 'http';
import { LedService } from './services/led.service';
import { WebSocketService } from './config/websocket';
import connectDB from './config/database';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();
connectDB();

const ledService = new LedService();
const server = http.createServer();
const PORT = process.env.PORT || 3000;

const webSocketService = new WebSocketService(server);

server.on('request', app);

server.listen(PORT, () => {
  console.log(`--> Servidor corriendo en puerto ${PORT}`);
});

export { server, webSocketService, ledService };