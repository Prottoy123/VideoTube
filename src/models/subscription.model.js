import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //one who is subscribing
      ref: "User",
    },

    channel: {
      type: Schema.Types.ObjectId, //one to whom is subscriber is subscribing
      ref: "User",
    },
  },
  { timeStamps: true }
);


export const Subsrciption = mongoose.model("Subscription",subscriptionSchema)