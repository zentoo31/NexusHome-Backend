import http from 'http';
import { GpioService } from './services/gpio.service';
import { WebSocketService } from './config/websocket';
import connectDB from './config/database';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();
connectDB();

const gpioService = new GpioService([15, 2, 4, 16, 17, 5, 18]);
const server = http.createServer();
const PORT = process.env.PORT || 3000;

const webSocketService = new WebSocketService(server);

server.on('request', app);

server.listen(PORT, () => {
  console.log(`--> Servidor corriendo en puerto ${PORT}`);
  console.log('--> Pines GPIO configurados:', gpioService.getAllPins().map(p => p.pin));
});

export { server, webSocketService, gpioService };