// ----------------------
// 🔥 1) .env 강제 로딩 (ESM 호환 버전)
// ----------------------
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ⭐ ESM에서는 __dirname을 직접 만들어야 함
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⭐ 루트 .env를 항상 찾도록 강제
const envPath = path.resolve(__dirname, "..", ".env");

console.log("📂 [dotenv] .env 경로:", envPath);

dotenv.config({ path: envPath });

console.log("🔑 [dotenv] OPENAI_API_KEY 존재:", !!process.env.OPENAI_API_KEY);

// ----------------------
// 기존 코드 시작
// ----------------------
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();

// CORS 설정
const allowedOrigins = [
  "https://wellintech.nuguna.ai",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5001",
  "http://127.0.0.1:5001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const port = parseInt(process.env.PORT || "8080", 10);

  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`Server is running on http://localhost:${port}`);
    }
  );
})();
