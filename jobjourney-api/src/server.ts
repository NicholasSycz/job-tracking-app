import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth";
import applicationRoutes from "./routes/applications";
import settingsRoutes from "./routes/settings";
import goalsRoutes from "./routes/goals";
import { errorHandler } from "./middleware/errorHandler";
import { PORT, isOriginAllowed, validateConfig } from "./config";
import { authLimiter, apiLimiter } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/logger";

// Validate configuration on startup
validateConfig();

const app = express();

// Request logging - must be early to capture all requests
app.use(requestLogger);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Serve uploaded files (avatars, etc.)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Apply rate limiters
app.use("/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter, applicationRoutes);
app.use("/api/settings", apiLimiter, settingsRoutes);
app.use("/api/goals", apiLimiter, goalsRoutes);

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
