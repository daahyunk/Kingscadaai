import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

// .env 파일 경로를 명시적으로 지정
const envPath = path.join(process.cwd(), ".env");
console.log("📂 [dotenv] .env 경로:", envPath);
console.log("📂 [dotenv] .env 파일 존재 여부:", fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("❌ [dotenv] .env 로드 실패:", result.error);
} else {
  console.log("✅ [dotenv] .env 로드 완료");
  console.log("🔑 [dotenv] OPENAI_API_KEY 존재:", !!process.env.OPENAI_API_KEY);
}

// ----------------------------------------------
// 언어 타입 & 유틸
// ----------------------------------------------
type Lang = "ko" | "en" | "zh";
const SUPPORTED_LANGS: Lang[] = ["ko", "en", "zh"];

function resolveLang(input?: string): Lang {
  const l = (input || "").toLowerCase();
  return (SUPPORTED_LANGS as string[]).includes(l) ? (l as Lang) : "ko";
}

function greetingByLang(lang: Lang) {
  switch (lang) {
    case "en":
      return `Hello! I'm the KingSCADA AI assistant. Feel free to ask about any equipment status or operations.`;
    case "zh":
      return `你好！我是 KingSCADA AI。如果你想了解设备状态或需要确认任何内容，请随时告诉我。`;
    default:
      return `안녕하세요! 킹스카다 AI입니다. 설비 상태나 점검이 필요하시면 언제든지 말씀해주세요.`;
  }
}

function langMeta(lang: Lang) {
  return {
    ko: { name: "Korean" },
    en: { name: "English" },
    zh: { name: "Chinese" },
  }[lang];
}

// ----------------------------------------------
// Request params 타입 (lang 포함)
// ----------------------------------------------
type LangParams = { lang?: string };

// ----------------------------------------------
// equipment-info.json 캐싱
// ----------------------------------------------
let EQUIP_INFO_CACHE: any | null = null;

function loadEquipmentInfo() {
  if (EQUIP_INFO_CACHE) return EQUIP_INFO_CACHE;

  const filePath = path.join(process.cwd(), "server", "equipment-info.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("equipment-info.json not found");
  }

  const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  EQUIP_INFO_CACHE = json;
  return json;
}

// ----------------------------------------------
// 라우트 등록
// ----------------------------------------------
export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🚀 KingSCADA routes initializing…");

  // (테스트용) festival 정보
  app.get("/festival", (_req: Request, res: Response) => {
    try {
      const filePath = path.join(process.cwd(), "server", "festival-info.json");
      if (!fs.existsSync(filePath)) {
        throw new Error("festival-info.json missing");
      }
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      res.json(data);
    } catch (err: any) {
      console.error("❌ /festival error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 기본 언어: ko
  app.get(
    "/api/session",
    (req: Request<LangParams>, res: Response) => {
      handleSession(req, res, "ko");
    }
  );

  // /api/session/:lang
  app.get(
    "/api/session/:lang",
    (req: Request<LangParams>, res: Response) => {
      handleSession(req, res);
    }
  );

  // (테스트용) 다운로드
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
  console.log("✅ KingSCADA routes ready");
  return httpServer;
}

// ----------------------------------------------
// 공통 세션 처리
// ----------------------------------------------
async function handleSession(
  req: Request<LangParams>,
  res: Response,
  defaultLang: Lang = "ko"
) {
  try {
    console.log("🛰️ [Server] /api/session 요청 받음");

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY missing in .env");
    }

    // URL params 또는 기본 언어
    const lang = resolveLang(req.params.lang ?? defaultLang);
    const greet = greetingByLang(lang);
    const { name: langName } = langMeta(lang);

    // 1) 쿼리에서 현재 장비 상태 읽기
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
    ] as const;

    equipmentKeys.forEach((key) => {
      const raw = req.query[key];
      if (raw !== undefined) {
        const num = parseFloat(raw as string);
        if (!isNaN(num)) {
          currentEquipmentState[key] = num;
        }
      }
    });

    console.log("[Server] Current equipment state:", currentEquipmentState);

    // 2) equipment-info.json 로드 + currentState 병합
    const baseEquipmentInfo = loadEquipmentInfo();
    const equipmentInfo = {
      ...baseEquipmentInfo,
      ...(Object.keys(currentEquipmentState).length > 0
        ? { currentState: currentEquipmentState }
        : {}),
    };

    // 3) instructions 구성 (태그는 말하지 말고 텍스트에만 붙이는 규칙 포함)
    const instructions = `
You are the KingSCADA AI voice assistant. Provide clear, concise, safe guidance about industrial equipment based on the user's questions.

IMPORTANT RULES:
- Respond ONLY in ${langName}.
- NEVER speak or pronounce any system markers such as "[EQUIPMENT_DETAIL:xxx]".
- System markers are ONLY for the client UI card detection, not for speech.
- When describing equipment status, speak naturally and do not include brackets, codes, IDs, or tags in your spoken output.
- ALWAYS append equipment detail markers in the text output. Example:
  Spoken: "펌프 3의 압력이 정상 범위 내입니다."
  Text output: "펌프 3의 압력이 정상 범위 내입니다. [EQUIPMENT_DETAIL:pump3]"

MARKER USAGE FOR ALL LANGUAGES:
- You MUST use [EQUIPMENT_DETAIL:equipmentId] markers in your text output for every equipment you discuss.
- If user asks about multiple equipment (e.g., "전체 장비 설명해줘" or "Tell me about all pumps" or "请描述所有设备"),
  append MULTIPLE markers, one for each equipment. Example:
  "펌프 1, 2, 3의 상태입니다. [EQUIPMENT_DETAIL:pump1] [EQUIPMENT_DETAIL:pump2] [EQUIPMENT_DETAIL:pump3]"
- This rule applies to ${langName} and all supported languages equally.

FIRST RESPONSE RULE:
- On the FIRST response of the session, output ONLY this greeting in ${langName}, spoken naturally:
"${greet}"

Do NOT describe any equipment on the first response.

WHEN USER ASKS ABOUT EQUIPMENT:
- Provide an accurate description of the current status.
- ALWAYS append [EQUIPMENT_DETAIL:equipmentId] marker(s) after describing the equipment.
- Use equipmentInfo below.

AVAILABLE EQUIPMENT:
${equipmentInfo.equipment
  .map((eq: any) => {
    const name = eq.names[lang];
    const range = eq.normalRange;
    const measures = eq.measures
      .map((m: any) => `${m.condition[lang]} → ${m.action[lang]}`)
      .join(" | ");
    return `- ${name} (${eq.type}): Normal ${range.min}-${range.max}${eq.unit} | Measures: ${measures}`;
  })
  .join("\n")}

CURRENT EQUIPMENT STATUS:
${
  equipmentInfo.currentState
    ? Object.entries(equipmentInfo.currentState)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "No live sensor values provided"
}
`.trim();

    // 4) OpenAI Realtime Session 생성
    console.log("⚙️ [Server] OpenAI 세션 생성 시도중...");

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2025-06-03",
        voice: "alloy",
        input_audio_transcription: {
          model: "whisper-1",
        },
        instructions,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.text();
      console.error(`❌ [OpenAI Error] ${resp.status}: ${errData}`);
      return res
        .status(resp.status)
        .json({ error: "OpenAI API failed", detail: errData });
    }

    const data = await resp.json();
    console.log("✅ [Server] OpenAI 세션 생성 완료!");
    res.json(data);
  } catch (error: any) {
    console.error("❌ [Server Error] OpenAI fetch 중 오류 발생:", error.message);
    res.status(500).json({ error: "Failed to create OpenAI session", detail: error.message });
  }
}
