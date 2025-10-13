import WebSocket from "ws";
import { TemperatureService } from "../services/temperature.service";
import { WebSocketMessage } from "../interfaces/gpio.state";

const temperatureService = new TemperatureService();

export function TemperatureSocket(ws: WebSocket, context: any) {
    ws.on('message', async (data: Buffer) => {
        try {
            if (data.toString() === 'ESP32') return;
            const parsed: WebSocketMessage = JSON.parse(data.toString());
            if (parsed.type === 'set_teperature') {
                const newTemp = await temperatureService.setCurrentTemperature(parseFloat(parsed.value as string));
                context.wss.clients.forEach((client: WebSocket) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'current_temperature', temperature: newTemp }));
                    }
                });
                console.log('--> 🌡️ Nueva temperatura registrada:', newTemp.value);
            }

            if (parsed.type === 'get_current_temperature') {
                await sendCurrentTemperature(ws);
                return;
            }


        } catch (error) {
            console.error('--> Error al procesar el mensaje de temperatura:', error);
        }
    });
}

async function sendCurrentTemperature(ws: WebSocket) {
    const currentTemp = await temperatureService.getCurrentTemperature();
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                type: 'current_temperature',
                temperature: currentTemp,
            }),
        );
    }
}