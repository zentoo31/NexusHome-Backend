import { WebSocketServer, WebSocket } from 'ws';
import { GpioSocket } from './gpio.socket';
import { Esp32Socket } from './esp32.socket';
import { TemperatureSocket } from './temperature.socket';
import { IaSocket } from './ia.socket';

export function registerSockets(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('--> ⚡ Nuevo cliente conectado');

    const context = { wss };

    GpioSocket(ws, context);
    Esp32Socket(ws, context);
    TemperatureSocket(ws, context);
    IaSocket(ws, context);

    ws.on('close', () => {
      console.log('--> ❌ Cliente desconectado');
    });
  });
}
