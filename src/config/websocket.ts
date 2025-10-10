import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { registerSockets } from '../sockets';

export class WebSocketService {
  public wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    console.log('--> ✅ WebSocket server iniciado');
    registerSockets(this.wss);
  }
}
