import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// 🔸 언어 타입 정의
type Lang = "ko" | "en" | "ja" | "zh";

function resolveLang(input?: string): Lang {
  const l = (input || "").toLowerCase();
  if (l === "en" || l === "ja" || l === "zh") return l;
  return "ko";
}

// 🔸 언어별 인사말
function greetingByLang(lang: Lang) {
  switch (lang) {
    case "en":
      return `Hello! I'm the AI assistant for the Siheung Gaetgol Festival.`;
    case "ja":
      return `こんにちは！シフン・ゲッコル祭りのAI相談員です。`;
    case "zh":
      return `你好！我是始兴滩涂庆典的AI咨询顾问。`;
    default:
      return `안녕하세요! 저는 시흥갯골축제의 AI 상담사예요.`;
  }
}

function langMeta(lang: Lang) {
  switch (lang) {
    case "en":
      return { name: "English", code: "en" };
    case "ja":
      return { name: "Japanese", code: "ja" };
    case "zh":
      return { name: "Chinese", code: "zh" };
    default:
      return { name: "Korean", code: "ko" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("✅ [Server] registerRoutes 시작됨");

  // 🔹 축제 정보 제공 (테스트용)
  app.get("/festival", (_req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), "server", "festival-info.json");
    if (!fs.existsSync(filePath)) {
      console.error("❌ [Error] festival-info.json 파일이 없습니다!");
      return res.status(500).json({ error: "festival-info.json not found" });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(data);
  });

  // ✅ 방법1: /api/session + /api/session/:lang 두 개로 분리 (Express 5 호환)
  app.get("/api/session", async (req: Request, res: Response) => {
    req.params.lang = "ko"; // 기본 언어를 ko로 설정
    await handleSession(req, res);
  });

  app.get("/api/session/:lang", async (req: Request, res: Response) => {
    await handleSession(req, res);
  });

  // 🔹 다운로드 API (테스트용)
  app.get("/api/download-pamphlet", (_req: Request, res: Response) => {
    const filePath = path.join(
      process.cwd(),
      "public",
      "downloads",
      "festival-pamphlet.pdf"
    );
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Pamphlet not found" });
    }
    res.download(filePath);
  });

  const httpServer = createServer(app);
  console.log("✅ [Server] registerRoutes 완료됨");
  return httpServer;
}

// ✅ 공통 세션 처리 함수
async function handleSession(req: Request, res: Response) {
  console.log("🛰️ [Server] /session 요청 받음");

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("❌ [Error] .env에 OPENAI_API_KEY가 없습니다!");
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const lang = resolveLang(req.params.lang);
  const greet = greetingByLang(lang);
  const { name: langName } = langMeta(lang);

  const filePath = path.join(process.cwd(), "server", "festival-info.json");
  if (!fs.existsSync(filePath)) {
    console.error("❌ [Error] festival-info.json 파일이 없습니다!");
    return res.status(500).json({ error: "festival-info.json not found" });
  }

  const festival = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  try {
    console.log("⚙️ [Server] OpenAI 세션 생성 시도중...");

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: "alloy",
        instructions: `
You are the official AI voice assistant for '${festival.name}'.

1) On the first response, greet in ${langName}: "${greet}".
2) After that, respond in the same language as the user's input.
3) When a question maps to a UI section, call:
   navigateSection({ section: "<info|announcements|gallery|food|location|program|goods>" })
Then speak your answer.
Keep your answers concise and friendly.
        `.trim(),
      }),
    });

    if (!resp.ok) {
      const errData = await resp.text();
      console.error(`❌ [OpenAI Error] ${resp.status}: ${errData}`);
      return res.status(resp.status).json({ error: "OpenAI API failed" });
    }

    const data = await resp.json();
    console.log("✅ [Server] OpenAI 세션 생성 완료!");
    res.json(data);
  } catch (error: any) {
    console.error(
      "❌ [Server Error] OpenAI fetch 중 오류 발생:",
      error.message
    );
    res.status(500).json({ error: "Failed to create OpenAI session" });
  }
}
