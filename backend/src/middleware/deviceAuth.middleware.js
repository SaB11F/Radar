import bcrypt from "bcrypt";
import Radar from "../models/Radar.js";

const deviceAuth = async (req, res, next) => {
  try {
    const radarId = req.header("X-RADAR-ID");
    const deviceKey = req.header("X-DEVICE-KEY");

    if (!radarId || !deviceKey) {
      return res.status(401).json({ message: "Missing device credentials" });
    }

    const radar = await Radar.findOne({ radarId });
    if (!radar) {
      return res.status(401).json({ message: "Invalid radarId" });
    }

    const ok = await bcrypt.compare(deviceKey, radar.deviceKeyHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid deviceKey" });
    }

    req.radar = radar;
    req.ownerUserId = radar.ownerUser;

    next();
  } catch (err) {
    console.error("deviceAuth error:", err);
    return res.status(500).json({ message: "Device auth failed" });
  }
};

export default deviceAuth;