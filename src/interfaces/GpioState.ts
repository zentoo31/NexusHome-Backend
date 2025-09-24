export interface GpioPin {
  pin: number;
  status: "on" | "off";
  mode: "output" | "input";
  name?: string;
}

export interface GpioState {
  pins: GpioPin[];
}

export interface WebSocketMessage {
  type: string;
  pin?: number;
  value?: string;
  mode?: "output" | "input";
  name?: string;
  [key: string]: any;
}

export interface GpioWebSocketMessage extends WebSocketMessage {
  type: 'gpio';
  pin: number;
  value: 'on' | 'off';
}

export interface ErrorWebSocketMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

// Función de tipo guard para verificar mensajes GPIO
export function isGpioMessage(message: WebSocketMessage): message is GpioWebSocketMessage {
  return message.type === 'gpio' && 
         typeof message.pin === 'number' && 
         (message.value === 'on' || message.value === 'off');
}