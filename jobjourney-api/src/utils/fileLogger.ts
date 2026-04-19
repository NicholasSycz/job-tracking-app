import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOGS_DIR = path.resolve(__dirname, "../../../Logs");

type LogLevel = "info" | "warn" | "error";

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

let initialized = false;

async function ensureLogsDir(): Promise<void> {
  if (initialized) return;
  await mkdir(LOGS_DIR, { recursive: true });
  initialized = true;
}

function getLogFileName(category: string): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(LOGS_DIR, `${category}-${date}.log`);
}

function formatEntry(entry: LogMessage): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`;
  if (entry.data && Object.keys(entry.data).length > 0) {
    return base + " " + JSON.stringify(entry.data) + "\n";
  }
  return base + "\n";
}

async function writeLog(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): Promise<void> {
  try {
    await ensureLogsDir();
    const entry: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
    const filePath = getLogFileName(category);
    await appendFile(filePath, formatEntry(entry));
  } catch {
    // Don't let logging failures crash the app
  }
}

export const fileLogger = {
  // Request logging
  request(message: string, data?: Record<string, unknown>) {
    writeLog("info", "requests", message, data);
  },

  // Error logging
  error(message: string, data?: Record<string, unknown>) {
    writeLog("error", "errors", message, data);
  },

  // Application event logging
  event(message: string, data?: Record<string, unknown>) {
    writeLog("info", "events", message, data);
  },

  // Warning logging
  warn(message: string, data?: Record<string, unknown>) {
    writeLog("warn", "errors", message, data);
  },
};
