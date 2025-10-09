import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 5; // messages per minute

// Utility: simple rate limiting per user
function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, { count: 1, startTime: now });
    return false;
  }

  const userData = rateLimitMap.get(userId);

  // Reset counter if time window passed
  if (now - userData.startTime > windowMs) {
    rateLimitMap.set(userId, { count: 1, startTime: now });
    return false;
  }

  if (userData.count >= RATE_LIMIT) {
    return true;
  }

  userData.count += 1;
  return false;
}

// Log requests
app.use((req, res, next) => {
  if (req.method === "POST") {
    console.log(`[${new Date().toISOString()}] Incoming request:`, req.body);
  }
  next();
});

// Main webhook endpoint
app.post("/webhook", (req, res) => {
  const { message, user_id } = req.body;

  if (!message || !user_id) {
    return res.status(400).json({ error: "Invalid message format" });
  }

  // Rate limit check
  if (checkRateLimit(user_id)) {
    return res.json({
      method: "sendMessage",
      text: "⚠️ You are sending messages too quickly. Please wait a bit.",
    });
  }

  // Command handling
  let responseText = "";

  switch (message.trim().toLowerCase()) {
    case "/start":
      responseText = "👋 Hello! Welcome to OpenBot.";
      break;
    case "/help":
      responseText =
        "🧭 Commands available:\n/start - Welcome message\n/help - Show commands\n/info - About this bot";
      break;
    case "/info":
      responseText =
        "🤖 This is a demo OpenBot server built with Node.js + Express.";
      break;
    default:
      responseText = "❓ I don’t understand that yet — try /help.";
  }

  // Respond to SDK
  return res.json({
    method: "sendMessage",
    text: responseText,
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ OpenBot backend is running!");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down OpenBot server...");
  process.exit(0);
});

app.listen(PORT, () =>
  console.log(`🚀 OpenBot backend running on http://localhost:${PORT}`)
);
