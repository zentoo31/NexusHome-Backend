import { Schema, model} from "mongoose";

const TemperatureSchema = new Schema ({
    value: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const Temperature = model("Temperature", TemperatureSchema);