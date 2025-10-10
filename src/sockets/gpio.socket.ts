import WebSocket from 'ws';
import { GpioService } from '../services/gpio.service';
import { WebSocketMessage, isGpioMessage } from '../interfaces/gpio.state';

const gpioService = new GpioService();

export function GpioSocket(ws: WebSocket, context: any) {
    ws.on('message', (data: Buffer) => {
        try {
            // Ignorar mensajes específicos del ESP32
            if (data.toString() === 'ESP32') return;

            const parsed: WebSocketMessage = JSON.parse(data.toString());

            // Solicitud para obtener todos los pines
            if (parsed.type === 'get_all_pins') {
                sendAllPins(ws);
                return;
            }

            // Mensajes de control GPIO
            if (isGpioMessage(parsed)) {
                handleGpioMessage(parsed, ws, context);
            }
        } catch (error) {
            sendError(ws, 'Formato de JSON inválido');
        }
    });

}

function handleGpioMessage(message: WebSocketMessage, ws: WebSocket, context: any) {
    if (message.value === 'on' || message.value === 'off') {
        const updatedPin = gpioService.setPinStatus(message.pinNumber, message.value);
        if (!updatedPin) {
            sendError(ws, `Pin ${message.pin} no encontrado`);
            return;
        }

        // Notificar a todos los demás clientes conectados
        context.wss.clients.forEach((client: WebSocket) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'pin_update', pin: updatedPin }));
            }
        });
    }
}

function sendAllPins(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                type: 'all_pins',
                pins: gpioService.getAllPins(),
            }),
        );
    }
}

function sendError(ws: WebSocket, msg: string) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: msg }));
    }
}