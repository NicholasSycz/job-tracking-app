import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import applicationRoutes from "./routes/applications";
import settingsRoutes from "./routes/settings";
import messagesRoutes from "./routes/messages";
import membersRoutes from "./routes/members";
import { errorHandler } from "./middleware/errorHandler";
import { CORS_ORIGINS } from "./config";

const app = express();

app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Routes without rate limiting for tests
app.use("/auth", authRoutes);
app.use("/api", applicationRoutes);
app.use("/api", messagesRoutes);
app.use("/api", membersRoutes);
app.use("/api/settings", settingsRoutes);

// Global error handler
app.use(errorHandler);

export default app;
