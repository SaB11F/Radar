import mongoose from "mongoose";

const speedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    radarId: {
      type: String,
      required: true,
      index: true,
    },
    ownerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    capturedAt: {
      type: Date,
      required: true,
      index: true,
    },
    speedKmh: {
      type: Number,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // za kasneje:
    imageUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// hitre queryje za app
speedEventSchema.index({ ownerUser: 1, capturedAt: -1 });
speedEventSchema.index({ radarId: 1, capturedAt: -1 });

const SpeedEvent = mongoose.model("SpeedEvent", speedEventSchema);
export default SpeedEvent;