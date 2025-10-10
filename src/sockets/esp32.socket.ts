import WebSocket from 'ws';
import { GpioService } from '../services/gpio.service';

const gpioService = new GpioService();

export function Esp32Socket(ws: WebSocket, context: any) {
  ws.on('message', (data: Buffer) => {
    const message = data.toString();

    if (message === 'ESP32') {
      console.log('--> 🔗 ESP32 conectado');
      (context as any).esp32Client = ws;

      // Enviar todos los estados iniciales al ESP32 formato pin:status
      gpioService.getAllPins().forEach(pin => {
        ws.send(`${pin.pin}:${pin.status}`);
      });
    }
  });
}
