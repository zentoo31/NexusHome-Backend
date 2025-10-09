import WebSocket, { WebSocketServer } from 'ws';
import { LedService } from '../services/led.service';
import { WebSocketMessage } from '../interfaces/led.state';
import { Server } from 'http';

export class WebSocketService {
  private wss: WebSocket.Server;
  private ledService: LedService;
  private esp32Client: WebSocket | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.ledService = new LedService();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      // Enviar estado actual del LED al nuevo cliente
      this.sendLedState(ws);

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

    // Identificar al ESP32 (mensaje de texto simple)
    if (message === 'ESP32') {
      this.esp32Client = ws;
      console.log('ESP32 registered as client');
      // Enviar estado actual al ESP32
      if (this.esp32Client.readyState === WebSocket.OPEN) {
        this.esp32Client.send(this.ledService.getLedState().status);
      }
      return;
    }

    // Procesar mensajes JSON
    try {
      const parsedMsg: WebSocketMessage = JSON.parse(message);
      
      if (parsedMsg.type === 'led' && parsedMsg.value) {
        this.handleLedMessage(parsedMsg.value, ws);
      }
    } catch (error) {
      console.error('Error parsing message as JSON:', error);
      // Opcional: enviar mensaje de error al cliente
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid JSON format' 
        }));
      }
    }
  }

  private handleLedMessage(value: string, ws: WebSocket): void {
    if (value === 'on' || value === 'off') {
      // Actualizar estado del LED
      this.ledService.setLedState(value);
      
      // Reenviar comando al ESP32 si está conectado
      if (this.esp32Client && this.esp32Client.readyState === WebSocket.OPEN) {
        this.esp32Client.send(value);
      }
      
      // Broadcast a todos los clientes web (excepto al remitente y ESP32)
      this.broadcastLedState(ws);
    }
  }

  private sendLedState(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'led', 
        value: this.ledService.getLedState().status 
      }));
    }
  }

  private broadcastLedState(excludeClient: WebSocket): void {
    const ledState = this.ledService.getLedState();
    
    this.wss.clients.forEach((client) => {
      if (client !== excludeClient && 
          client !== this.esp32Client &&
          client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ 
          type: 'led', 
          value: ledState.status 
        }));
      }
    });
  }

  public getEsp32Client(): WebSocket | null {
    return this.esp32Client;
  }


  // Método para broadcast a todos los clientes (incluyendo ESP32 si es necesario)
  public broadcastToAll(message: string): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}