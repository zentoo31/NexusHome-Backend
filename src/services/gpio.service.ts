import { GpioPin, GpioState } from "../interfaces/gpio.state";

export class GpioService {
  private gpioState: GpioState = { pins: [] };

  constructor(initialPins: number[] = [15, 2, 4, 16, 17, 5, 18]) {
    // Inicializar los pines con estado apagado
    this.gpioState.pins = initialPins.map(pin => ({
      pin,
      status: "off",
      mode: "output",
      name: `GPIO-${pin}`
    }));
  }

  getAllPins(): GpioPin[] {
    return this.gpioState.pins;
  }

  getPin(pinNumber: number): GpioPin | undefined {
    return this.gpioState.pins.find(pin => pin.pin === pinNumber);
  }

  setPinStatus(pinNumber: number, status: "on" | "off"): GpioPin | undefined {
    const pin = this.getPin(pinNumber);
    if (pin) {
      pin.status = status;
      return pin;
    }
    return undefined;
  }

  setPinMode(pinNumber: number, mode: "output" | "input"): GpioPin | undefined {
    const pin = this.getPin(pinNumber);
    if (pin) {
      pin.mode = mode;
      return pin;
    }
    return undefined;
  }

  updatePinName(pinNumber: number, name: string): GpioPin | undefined {
    const pin = this.getPin(pinNumber);
    if (pin) {
      pin.name = name;
      return pin;
    }
    return undefined;
  }

  addPin(pinNumber: number, mode: "output" | "input" = "output", name?: string): GpioPin {
    const existingPin = this.getPin(pinNumber);
    if (existingPin) {
      return existingPin;
    }

    const newPin: GpioPin = {
      pin: pinNumber,
      status: "off",
      mode,
      name: name || `GPIO-${pinNumber}`
    };

    this.gpioState.pins.push(newPin);
    return newPin;
  }

  removePin(pinNumber: number): boolean {
    const index = this.gpioState.pins.findIndex(pin => pin.pin === pinNumber);
    if (index === -1) return false;
    
    this.gpioState.pins.splice(index, 1);
    return true;
  }
}