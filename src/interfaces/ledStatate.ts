export interface LedState {
    status: "on" | "off";
}

export interface WebSocketMessage {
    type: string;
    value?: string;
}