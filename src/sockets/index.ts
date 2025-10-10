import { WebSocketServer, WebSocket } from 'ws';
import { GpioSocket } from './gpio.socket';
import { Esp32Socket } from './esp32.socket';

export function registerSockets(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('--> ⚡ Nuevo cliente conectado');

    const context = { wss };

    GpioSocket(ws, context);
    Esp32Socket(ws, context);

    ws.on('close', () => {
      console.log('--> ❌ Cliente desconectado');
    });
  });
}
