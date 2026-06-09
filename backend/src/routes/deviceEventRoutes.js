import express from "express";
import crypto from "crypto";

import deviceAuth from "../middleware/deviceAuth.middleware.js";
import SpeedEvent from "../models/SpeedEvent.js";

const router = express.Router();

const parseCoordinatePair = ({ latitude, longitude }) => {
  const hasAny = latitude !== undefined || longitude !== undefined;
  if (!hasAny) return { provided: false };

  const lat = typeof latitude === "number" ? latitude : Number(latitude);
  const lon = typeof longitude === "number" ? longitude : Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "latitude and longitude must be valid numbers" };
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { error: "latitude/longitude out of range" };
  }

  return { provided: true, latitude: lat, longitude: lon };
};

router.get("/config", deviceAuth, async (req, res) => {
  try {
    return res.json({
      radarId: req.radar.radarId,
      name: req.radar.name,
      speedLimit: req.radar.speedLimit ?? 50,
      latitude: req.radar.latitude ?? null,
      longitude: req.radar.longitude ?? null,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Device config error:", err);
    return res.status(500).json({ message: "Failed to fetch device config" });
  }
});

router.post("/", deviceAuth, async (req, res) => {
  try {
    const { speedKmh, capturedAt, meta, latitude, longitude } = req.body;

    if (typeof speedKmh !== "number") {
      return res.status(400).json({ message: "speedKmh must be a number" });
    }

    const coordinates = parseCoordinatePair({ latitude, longitude });
    if (coordinates.error) {
      return res.status(400).json({ message: coordinates.error });
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

    if (
      coordinates.provided &&
      (req.radar.latitude !== coordinates.latitude ||
        req.radar.longitude !== coordinates.longitude)
    ) {
      req.radar.latitude = coordinates.latitude;
      req.radar.longitude = coordinates.longitude;
      await req.radar.save();
    }

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
