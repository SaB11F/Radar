import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";

import protectRoute from "../middleware/auth.middleware.js";
import Radar from "../models/Radar.js";
import SpeedEvent from "../models/SpeedEvent.js";

const router = express.Router();

// helper: user-friendly radarId
const generateRadarId = () => {
  // primer: RADAR-7F3A2C (kratko, za demo)
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RADAR-${suffix}`;
};

router.post("/", protectRoute, async (req, res) => {
  try {
    const { name } = req.body;

    const radarId = generateRadarId();
    const deviceKeyPlain = crypto.randomBytes(18).toString("base64url"); // user-friendly copy/paste
    const deviceKeyHash = await bcrypt.hash(deviceKeyPlain, 10);

    const radar = await Radar.create({
      radarId,
      name: name || "My Radar",
      ownerUser: req.user._id,
      deviceKeyHash,
    });

    // Vrni plaintext key samo 1x (za vpis v RPi config)
    return res.status(201).json({
      radarId: radar.radarId,
      name: radar.name,
      deviceKey: deviceKeyPlain,
    });
  } catch (err) {
    console.error("Create radar error:", err);
    return res.status(500).json({ message: "Failed to create radar" });
  }
});

router.get("/", protectRoute, async (req, res) => {
  try {
    const radars = await Radar.find({ ownerUser: req.user._id })
      .select("radarId name createdAt")
      .sort({ createdAt: -1 });

    return res.json(radars);
  } catch (err) {
    console.error("List radars error:", err);
    return res.status(500).json({ message: "Failed to fetch radars" });
  }
});

router.get("/:radarId/events", protectRoute, async (req, res) => {
  try {
    const { radarId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

    // ownership check
    const radar = await Radar.findOne({ radarId, ownerUser: req.user._id });
    if (!radar) {
      return res.status(404).json({ message: "Radar not found" });
    }

    const events = await SpeedEvent.find({
      radarId,
      ownerUser: req.user._id,
    })
      .sort({ capturedAt: -1 })
      .limit(limit);

    return res.json(events);
  } catch (err) {
    console.error("List events error:", err);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

export default router;