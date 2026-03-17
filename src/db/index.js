import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
       const conncetionInstance = await mongoose.connect(`${process.env.
            MONGODB_URL}/${DB_NAME}`);
            console.log(`\n MongoDB Conncted !! DB HOST:
                ${conncetionInstance.connection.host}`);
            
    } catch (err) {
        console.log("MongoDB connection error",err);
        process.exit(1)
    }
}
export default connectDB