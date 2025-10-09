import { Request, Response } from "express";
import { LedService } from "../services/led.service";

export class LedController {
    private ledService: LedService;

    constructor() {
        this.ledService = new LedService();
    }

    getLedState = (req: Request, res: Response): void => {
        try {
            const ledState = this.ledService.getLedState();
            res.json(ledState);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener el estado del LED' });
        }
    }

    setLedState = (req: Request, res: Response): void => {
        try {
            const { status } = req.body;

            if (status !== 'on' && status !== 'off') {
                res.status(400).json({ error: 'Estado debe ser "on" u "off"' });
                return;
            }

            const ledState = this.ledService.setLedState(status);
            res.json({ message: 'Estado actualizado', ledState });

        } catch (error) {
            res.status(500).json({ error: 'Error al actualizar el estado del LED' });
        }
    };
}