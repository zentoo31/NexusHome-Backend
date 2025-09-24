import WebSocket from 'ws';
import { GpioService } from './GpioService';
import { WebSocketMessage, isGpioMessage } from '../interfaces/GpioState';

export class WebSocketService {
  private wss: WebSocket.Server;
  private gpioService: GpioService;
  private esp32Client: WebSocket | null = null;

  constructor(wss: WebSocket.Server, gpioService: GpioService) {
    this.wss = wss;
    this.gpioService = gpioService;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      // Enviar estado actual de todos los pines al nuevo cliente
      this.sendAllPinsState(ws);

      // Manejar mensajes entrantes
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      // Manejar cierre de conexión
      ws.on('close', () => {
        console.log('Client disconnected');
        if (ws === this.esp32Client) {
          this.esp32Client = null;
          console.log('ESP32 disconnected');
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    const message = data.toString();
    console.log('Message received:', message);

    // Identificar al ESP32
    if (message === 'ESP32') {
      this.esp32Client = ws;
      console.log('ESP32 registered as client');
      // Enviar estado actual de todos los pines al ESP32
      this.sendAllPinsStateToESP32();
      return;
    }

    // Procesar mensajes JSON
    try {
      const parsedMsg: WebSocketMessage = JSON.parse(message);
      
      if (isGpioMessage(parsedMsg)) {
        this.handleGpioMessage(parsedMsg, ws);
      } else if (parsedMsg.type === 'get_all_pins') {
        this.sendAllPinsState(ws);
      } else if (parsedMsg.type === 'get_pin') {
        this.sendPinState(parsedMsg.pin, ws);
      } else {
        console.log('Unknown message type:', parsedMsg.type);
      }
    } catch (error) {
      console.error('Error parsing message as JSON:', error);
      this.sendError(ws, 'Invalid JSON format');
    }
  }

  private handleGpioMessage(message: WebSocketMessage, ws: WebSocket): void {
    if (typeof message.pin !== 'number') {
      this.sendError(ws, 'Pin number is required');
      return;
    }

    if (message.value && (message.value === 'on' || message.value === 'off')) {
      // Actualizar estado del pin
      const updatedPin = this.gpioService.setPinStatus(message.pin, message.value);
      
      if (!updatedPin) {
        this.sendError(ws, `Pin ${message.pin} not found`);
        return;
      }

      // Reenviar comando al ESP32 si está conectado
      if (this.esp32Client && this.esp32Client.readyState === WebSocket.OPEN) {
        const esp32Message = `${message.pin}:${message.value}`;
        this.esp32Client.send(esp32Message);
      }
      
      this.broadcastPinState(updatedPin, ws);
    }
  }

  private sendAllPinsState(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'all_pins', 
        pins: this.gpioService.getAllPins() 
      }));
    }
  }

  private sendPinState(pinNumber: number | undefined, ws: WebSocket): void {
    if (pinNumber === undefined || ws.readyState !== WebSocket.OPEN) return;
    
    const pin = this.gpioService.getPin(pinNumber);
    if (pin) {
      ws.send(JSON.stringify({ 
        type: 'pin_update', 
        pin 
      }));
    } else {
      this.sendError(ws, `Pin ${pinNumber} not found`);
    }
  }

  private sendAllPinsStateToESP32(): void {
    if (!this.esp32Client || this.esp32Client.readyState !== WebSocket.OPEN) return;
    
    const pins = this.gpioService.getAllPins();
    pins.forEach(pin => {
      const message = `${pin.pin}:${pin.status}`;
      this.esp32Client!.send(message);
    });
  }

  private broadcastPinState(pin: any, excludeClient: WebSocket): void {
    this.wss.clients.forEach((client) => {
      if (client !== excludeClient && 
          client !== this.esp32Client &&
          client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ 
          type: 'pin_update', 
          pin 
        }));
      }
    });
  }

  private sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message 
      }));
    }
  }

  public getEsp32Client(): WebSocket | null {
    return this.esp32Client;
  }

  public sendToEsp32(message: string): void {
    if (this.esp32Client && this.esp32Client.readyState === WebSocket.OPEN) {
      this.esp32Client.send(message);
    }
  }
}