import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// 🔸 언어 타입 정의
type Lang = "ko" | "en" | "zh";

function resolveLang(input?: string): Lang {
  const l = (input || "").toLowerCase();
  if (l === "en" || l === "zh") return l;
  return "ko";
}

// 🔸 언어별 인사말
function greetingByLang(lang: Lang) {
  switch (lang) {
    case "en":
      return `Hello! I'm the KingSCADA AI assistant. If you need to check anything about your equipment, just let me know. I'll quickly review the situation and guide you with the right actions.`;
    case "zh":
      return `你好！我是 KingSCADA AI。如果你想了解设备相关情况或需要确认什么，随时告诉我。我会迅速了解状况，并给出相应的处理建议。`;
    default:
      return `안녕하세요! 킹스카다 AI입니다. 설비에 관련해 궁금한 점이나 확인이 필요하시면 말씀해 주세요. 바로 상황을 파악해 필요한 조치를 안내해드릴게요.`;
  }
}

function langMeta(lang: Lang) {
  switch (lang) {
    case "en":
      return { name: "English", code: "en" };
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

  // 모든 현재 장비 상태 받기
  const currentEquipmentState: Record<string, number> = {};
  const equipmentKeys = [
    "pump1",
    "pump2",
    "pump3",
    "pump4",
    "temperatureSensorA",
    "temperatureSensorB",
    "flowMeter1",
    "flowMeter2",
    "pressureSensorA",
    "pressureSensorB",
    "pressureSensorC",
    "pressureSensorD",
    "valvePosition",
  ];

  equipmentKeys.forEach((key) => {
    if (req.query[key]) {
      currentEquipmentState[key] = parseFloat(req.query[key] as string);
    }
  });

  console.log("[Server] Current equipment state:", currentEquipmentState);

  const equipmentFilePath = path.join(process.cwd(), "server", "equipment-info.json");
  if (!fs.existsSync(equipmentFilePath)) {
    console.error("❌ [Error] equipment-info.json 파일이 없습니다!");
    return res.status(500).json({ error: "equipment-info.json not found" });
  }

  let equipmentInfo = JSON.parse(fs.readFileSync(equipmentFilePath, "utf-8"));

  // 현재값을 equipment 정보에 추가
  if (Object.keys(currentEquipmentState).length > 0) {
    equipmentInfo = {
      ...equipmentInfo,
      currentState: currentEquipmentState,
    };
  }

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
        input_audio_transcription: {
          model: "whisper-1",
        },
        instructions: `
            You are the KingSCADA AI voice guidance assistant. You help users monitor and manage equipment in real-time, providing status updates and recommended actions when issues are detected.

            Available Equipment:
${equipmentInfo.equipment
  .map((eq: any) => {
    const name = eq.names[lang];
    const range = eq.normalRange;
    const measures = eq.measures
      .map((m: any) => `${m.condition[lang]}: ${m.action[lang]}`)
      .join(" | ");
    return `- ${name} (${eq.type}): Normal range ${range.min}-${range.max} ${eq.unit} | Measures: ${measures}`;
  })
  .join("\n")}

            Current Equipment Status:
${equipmentInfo.currentState ? Object.entries(equipmentInfo.currentState)
  .map(([key, value]) => {
    if (key === "pump1") return `- Pump 1: ${value} bar`;
    if (key === "pump2") return `- Pump 2: ${value} bar`;
    if (key === "pump3") return `- Pump 3: ${value} bar`;
    if (key === "pump4") return `- Pump 4: ${value} bar`;
    if (key === "temperatureSensorA") return `- Temperature Sensor A: ${value}°C`;
    if (key === "temperatureSensorB") return `- Temperature Sensor B: ${value}°C`;
    if (key === "flowMeter1") return `- Flow Meter 1: ${value} L/min`;
    if (key === "flowMeter2") return `- Flow Meter 2: ${value} L/min`;
    if (key === "pressureSensorA") return `- Pressure Sensor A: ${value} bar`;
    if (key === "pressureSensorB") return `- Pressure Sensor B: ${value} bar`;
    if (key === "pressureSensorC") return `- Pressure Sensor C: ${value} bar`;
    if (key === "pressureSensorD") return `- Pressure Sensor D: ${value} bar`;
    if (key === "valvePosition") return `- Valve Position: ${value}%`;
    return null;
  })
  .filter(Boolean)
  .join("\n") : "No current status available"}

            Rules:
            1) On the very first response, say exactly one short greeting in ${langName}:
"${greet}"
            2) Always respond in the same language as the user's input (${langName} in this session).
            3) When a user asks about equipment status or issues, refer to the current equipment status above and provide specific guidance based on the available equipment information.
            4) Keep your answers concise and friendly.
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
