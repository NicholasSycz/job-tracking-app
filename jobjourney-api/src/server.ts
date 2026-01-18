import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import applicationRoutes from "./routes/applications";
import settingsRoutes from "./routes/settings";
import { errorHandler } from "./middleware/errorHandler";
import { PORT, CORS_ORIGINS, validateConfig } from "./config";
import { authLimiter, apiLimiter } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/logger";

// Validate configuration on startup
validateConfig();

const app = express();

// Request logging - must be early to capture all requests
app.use(requestLogger);

app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Apply rate limiters
app.use("/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter, applicationRoutes);
app.use("/api/settings", apiLimiter, settingsRoutes);

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
