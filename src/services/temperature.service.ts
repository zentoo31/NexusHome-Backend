import { Temperature } from "../models/temperature";

export class TemperatureService {
    
    async setCurrentTemperature(temp: number) {
        const newTemp = new Temperature({value:temp});
        await newTemp.save();
        return newTemp;
    }

    async getCurrentTemperature() {
        const temp = await Temperature.findOne().sort({createdAt: -1});
        return temp;
    }

    async getTemperatureHistory() {
        const temps = await Temperature.find().sort({createdAt: -1}).limit(10);
        return temps;
    }

}