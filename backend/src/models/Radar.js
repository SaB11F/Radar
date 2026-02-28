import mongoose from "mongoose";

const radarSchema = new mongoose.Schema(
  {
    radarId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "My Radar",
    },
    ownerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceKeyHash: {
      type: String,
      required: true,
    },
    speedLimit:{
      type: Number,
      default: 50,
    },
  },
  { timestamps: true }
);

const Radar = mongoose.model("Radar", radarSchema);
export default Radar;