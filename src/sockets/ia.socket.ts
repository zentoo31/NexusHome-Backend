import WebSocket from "ws";
import { gpioService } from "../services/gpio.service";

const OLLAMA_URL = 'http://localhost:11434/api/generate';

export function IaSocket(ws: WebSocket, context: any) {
    // Log cuando se conecta un cliente al socket IA
    console.log('[IA Socket] nuevo cliente conectado');

    // Estado simple para cliente IA: el cliente debe inicializarse con
    // un mensaje JSON { type: 'init_ia' } o puede enviar comandos puntuales con
    // { type: 'command_ia', text: '...' , oneShot: true }
    (ws as any).isIaClient = false;

    ws.on('message', async (data: Buffer) => {
        try {
            const raw = data.toString();

            // Ignorar mensajes del ESP32 (sigue siendo texto plano)
            if (raw === 'ESP32') return;

            let parsed: any;
            try {
                parsed = JSON.parse(raw);
            } catch (err) {
                // Responder error cuando no sea JSON
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Se esperaba JSON con { type: "init_ia" | "command_ia" }' }));
                }
                return;
            }

            // Manejo de inicialización: { type: 'init_ia' }
            if (parsed.type === 'init_ia') {
                (ws as any).isIaClient = true;
                console.log('[IA Socket] cliente inicializado como agente IA');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ack', message: 'IA client initialized' }));
                }
                return;
            }

            // Manejo de comando: { type: 'command_ia', text: 'enciende la luz', oneShot?: true }
            if (parsed.type === 'command_ia') {
                const text: string = parsed.text || '';
                const oneShot: boolean = !!parsed.oneShot;

                if (!oneShot && !(ws as any).isIaClient) {
                    // Cliente no inicializado y no es oneShot -> ignorar
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Cliente no inicializado. Enviar { type: "init_ia" } o usar { oneShot: true }' }));
                    }
                    return;
                }

                const accion = await procesarConOllama(text);
                // Log de la respuesta de la IA para debugging
                console.log('[IA Socket] respuesta Ollama:', accion);
                if (!accion || !accion.accion) return;

                // Mapeo simple de ubicaciones a pines (ajustar según hardware)
                const roomToPins: Record<string, number[]> = {
                    sala: [15],
                    cocina: [2],
                    habitacion: [4],
                    bano: [16],
                    todas: gpioService.getAllPins().map((p: any) => p.pin),
                };

                if (accion.accion === 'encender_luz' || accion.accion === 'apagar_luz') {
                    const value = accion.accion === 'encender_luz' ? 'on' : 'off';
                    const loc = accion.ubicacion || 'todas';
                    const pins = roomToPins[loc] || [];

                    // Si no hay pins para la ubicacion, no hacer nada
                    if (pins.length === 0) return;

                    // Cambiar estado de cada pin y notificar a clientes como en gpio.socket
                    pins.forEach(pinNumber => {
                        const updatedPin = gpioService.setPinStatus(pinNumber, value as 'on' | 'off');

                        // Log del pin procesado y su nuevo estado
                        if (updatedPin) {
                            console.log(`[IA Socket] pin ${updatedPin.pin} actualizado a ${updatedPin.status}`);
                            if (updatedPin.status === 'off') {
                                console.log(`[IA Socket] la luz del pin ${updatedPin.pin} ha sido APAGADA`);
                            }
                        } else {
                            console.log(`[IA Socket] intento de actualizar pin ${pinNumber} falló (no encontrado)`);
                        }

                        // Notificar a todos los clientes conectados
                        context.wss.clients.forEach((client: WebSocket) => {
                            if (client.readyState !== WebSocket.OPEN) return;

                            if ((client as any).isEsp32) {
                                if (updatedPin) client.send(`${updatedPin.pin}:${updatedPin.status}`);
                            } else {
                                client.send(
                                    JSON.stringify({
                                        type: 'all_pins',
                                        pins: gpioService.getAllPins(),
                                    }),
                                );
                            }
                        });
                    });
                }

                return;
            }

            // Tipo desconocido
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'Tipo de mensaje desconocido' }));
            }
        } catch (e) {
            // En caso de error no bloquear el socket
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Error procesando comando de voz' }));
                }
            } catch (err) {
                // noop
            }
        }
    });
}

async function procesarConOllama(comando: String) {
    const prompt = `
    Analiza este comando de voz y devuelve SOLO un objeto JSON válido sin explicaciones:

    Comando: "${comando}"

    Posibles acciones:
    - encender_luz [sala, cocina, habitacion, bano, todas]
    - apagar_luz [sala, cocina, habitacion, bano, todas]
    - consultar_temperatura
    - consultar_humedad
    - estado_luces

    Ejemplos:
    "enciende la luz de la sala" → {"accion": "encender_luz", "ubicacion": "sala"}
    "apaga las luces de la cocina" → {"accion": "apagar_luz", "ubicacion": "cocina"}
    "qué temperatura hace" → {"accion": "consultar_temperatura"}
    "apaga todas las luces" → {"accion": "apagar_luz", "ubicacion": "todas"}

    Respuesta JSON:
    `;

    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gemma2:2b',
            prompt: prompt,
            stream: false
        })
    });

    const data = await response.json();
    
    try {
        const jsonString = data.response.match(/\{[\s\S]*\}/)[0];
        return JSON.parse(jsonString);
    } catch (e) {
        throw new Error(`No se pudo interpretar el comando: ${data.response}`);
    }
}