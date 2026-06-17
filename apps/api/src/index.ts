import "./env.js";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth.js";
import keysRouter from "./routes/keys.js";
import schedulesRouter from "./routes/schedules.js";
import roomsRouter from "./routes/rooms.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for dashboard and mobile client requests
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/keys", keysRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/rooms", roomsRouter);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "An unexpected internal server error occurred" });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Shinaa REST API server running on port ${PORT}`);
});
