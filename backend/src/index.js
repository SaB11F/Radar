import express from 'express';
import cors from 'cors';
import "dotenv/config";
import job from './lib/cron.js';

import authRoutes from './routes/authRoutes.js';
import deviceEventRoutes from './routes/deviceEventRoutes.js';
import appRadarRoutes from './routes/appRadarRoutes.js';

import { connectDB } from './lib/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

job.start();
app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/device/events", deviceEventRoutes);
app.use("/api/app/radars", appRadarRoutes);


app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
  connectDB();
});

