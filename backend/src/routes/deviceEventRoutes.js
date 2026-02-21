import express from "express";
import crypto from "crypto";

import deviceAuth from "../middleware/deviceAuth.middleware.js";
import SpeedEvent from "../models/SpeedEvent.js";

const router = express.Router();

router.post("/", deviceAuth, async (req, res) => {
  try {
    const { speedKmh, capturedAt, meta } = req.body;

    if (typeof speedKmh !== "number") {
      return res.status(400).json({ message: "speedKmh must be a number" });
    }

    const capturedAtDate = capturedAt ? new Date(capturedAt) : new Date();
    if (Number.isNaN(capturedAtDate.getTime())) {
      return res.status(400).json({ message: "capturedAt is invalid" });
    }

    const eventId = crypto.randomUUID();

    const event = await SpeedEvent.create({
      eventId,
      radarId: req.radar.radarId,
      ownerUser: req.ownerUserId,
      capturedAt: capturedAtDate,
      speedKmh,
      meta: meta || {},
    });

    return res.status(201).json({
      eventId: event.eventId,
      radarId: event.radarId,
      capturedAt: event.capturedAt,
      speedKmh: event.speedKmh,
    });
  } catch (err) {
    console.error("Device ingest error:", err);
    return res.status(500).json({ message: "Failed to ingest event" });
  }
});

export default router;