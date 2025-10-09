import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try{
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log(`--> Base de datos mongoDB conectada`);
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
}

export default connectDB;