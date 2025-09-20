import { LedState } from "../interfaces/ledStatate";

export class LedService {
    private ledState: LedState  = { status: "off" };

    getLedState(): LedState {
        return this.ledState;
    }

    setLedState(status: "on" | "off"): LedState {
        this.ledState.status = status;
        return this.ledState;
    }
}