import WebSocket from "ws";
import { gpioService } from "../services/gpio.service";
import { TemperatureService } from "../services/temperature.service";

const OLLAMA_URL = 'http://localhost:11434/api/generate';

export function IaSocket(ws: WebSocket, context: any) {
    // Log cuando se conecta un cliente al socket IA
    console.log('[IA Socket] nuevo cliente conectado');

    // Estado simple para cliente IA: el cliente debe inicializarse con
    // un mensaje JSON { type: 'init_ia' } o puede enviar comandos puntuales con
    // { type: 'command_ia', text: '...' , oneShot: true }
    (ws as any).isIaClient = false;

    const temperatureService = new TemperatureService();

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
                    baño: [16],
                    lavanderia: [17],
                    garaje: [5],
                    todas: gpioService.getAllPins().map((p: any) => p.pin),
                };

                if (accion.accion === 'encender_luz' || accion.accion === 'apagar_luz') {
                    const value = accion.accion === 'encender_luz' ? 'on' : 'off';
                    const loc = accion.ubicacion || 'todas';
                    const pins = roomToPins[loc] || [];

                    // Si no hay pins para la ubicacion, no hacer nada
                    if (pins.length === 0) return;

                    // Construir mensaje con tono domótico
                    let formattedMensaje: string | null = null;
                    try {
                        const locText = loc === 'todas' ? (value === 'on' ? 'todas las luces' : 'todas las luces') : `la luz de ${loc}`;
                        const actionWord = value === 'on' ? 'Encendiendo' : 'Apagando';
                        // Preferir mensaje de la IA si existe, sino generar uno domótico
                        formattedMensaje = accion.mensaje && typeof accion.mensaje === 'string'
                            ? accion.mensaje
                            : `${actionWord} ${locText}.`;
                    } catch (err) {
                        formattedMensaje = accion.mensaje || null;
                    }

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
                                                mensaje: formattedMensaje || null,
                                            }),
                                        );
                                    }
                                });
                    });
                }

                // Consultar temperatura actual
                if (accion.accion === 'consultar_temperatura') {
                    try {
                        const currentTemp = await temperatureService.getCurrentTemperature();
                        // Formatear mensaje domótico con el valor de temperatura si es posible
                        const tempValue = (currentTemp as any)?.value ?? null;
                        const formattedMensaje = accion.mensaje && typeof accion.mensaje === 'string'
                            ? accion.mensaje
                            : `Claro, la temperatura actual es: ${tempValue !== null ? tempValue + '°C' : 'desconocida'}.`;

                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(
                                JSON.stringify({
                                    type: 'current_temperature',
                                    temperature: currentTemp,
                                    mensaje: formattedMensaje,
                                }),
                            );
                        }
                    } catch (err) {
                        console.error('[IA Socket] error consultando temperatura:', err);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'error', message: 'No se pudo obtener la temperatura actual' }));
                        }
                    }

                    return;
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
    Analiza este comando de voz y devuelve SOLO un objeto JSON válido sin explicaciones.

    IMPORTANTE: Incluye SIEMPRE una clave "mensaje" con una frase breve (en español) que describa lo que se hizo o se consultará. Ej: "He encendido la luz de la sala.".

    Comando: "${comando}"

    Posibles acciones:
    - encender_luz [sala, cocina, habitacion, baño, lavandería, garaje, todas]
    - apagar_luz [sala, cocina, habitacion, baño, lavandería, garaje, todas]
    - consultar_temperatura
    - consultar_humedad
    - estado_luces

    Ejemplos:
    "enciende la luz de la sala" → {"accion": "encender_luz", "ubicacion": "sala", "mensaje": "He encendido la luz de la sala."}
    "apaga las luces de la cocina" → {"accion": "apagar_luz", "ubicacion": "cocina", "mensaje": "He apagado las luces de la cocina."}
    "qué temperatura hace" → {"accion": "consultar_temperatura", "mensaje": "Consulto la temperatura actual."}
    "apaga todas las luces" → {"accion": "apagar_luz", "ubicacion": "todas", "mensaje": "He apagado todas las luces."}

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