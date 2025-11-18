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
  app.get("/api/session", (req: Request<LangParams>, res: Response) => {
    handleSession(req, res, "ko");
  });

  // /api/session/:lang
  app.get("/api/session/:lang", (req: Request<LangParams>, res: Response) => {
    handleSession(req, res);
  });

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
You are the KingSCADA AI voice assistant. Provide clear, safe, and concise guidance about industrial equipment.

LANGUAGE RULE:
- Respond ONLY in ${langName}.
- Speak naturally. Never speak internal codes, markers, or field names.

MARKER RULE (UI 카드 전용):
- Markers like [EQUIPMENT_DETAIL:id] MUST NOT be spoken.
- Use markers ONLY when describing equipment **status**.
- If multiple equipment are described, attach a marker for each one.
- Do NOT attach markers for maintenance-date questions or alarm-summary questions.

FIRST RESPONSE:
- The FIRST response of this session must be ONLY the greeting in ${langName}:
"${greet}"
- Do NOT mention equipment on the first response.

WHEN USER ASKS ABOUT EQUIPMENT STATUS:
- Use equipmentInfo + currentState.
- Describe status naturally in ${langName}.
- After describing each equipment, attach its marker:
  Example:
  Spoken: "펌프 3의 압력이 정상입니다."
  Text:   "펌프 3의 압력이 정상입니다. [EQUIPMENT_DETAIL:pump3]"

WHEN USER ASKS ABOUT:
1) “정기 점검일 / next maintenance date / 下次维护时间”
2) “최근 3개월 비정상 알람 요약 / abnormal alarms / 异常报警汇总”
- Look up the equipment’s nextMaintenance or recentAlarms.
- Respond cleanly in ${langName}, without mentioning internal field names.
- DO NOT attach markers for these answers.
  Example:
  "펌프 3의 다음 정기 점검일은 12월 5일입니다."

ABOUT ALARM SUMMARY:
- Summaries should be natural:
  "최근 3개월 동안 4건의 알람이 있었고, 평균 복구 시간은 12분입니다."

CUSTOM ALARM CREATION:
- When user asks to create a custom alarm (e.g., “펌프 3 고온 알람 만들어 줘”, “Create a high temp alarm for pump 3”):
  - Extract:
    • Target equipment  
    • Alarm type  
    • Threshold  
    • Recipient  
  - Respond naturally in ${langName}.
  - Do NOT mention internal field names.
  - Do NOT attach any markers.
  - Example:
    "펌프 3의 고온 알람을 생성했습니다. 임계값은 95도이며, 담당자는 김철수 대리로 설정했습니다."

EQUIPMENT LIST (REFERENCE DATA):
${equipmentInfo.equipment
  .map((eq: any) => {
    const name = eq.names[lang];
    const range = eq.normalRange;
    const measures = eq.measures
      .map((m: any) => `${m.condition[lang]} → ${m.action[lang]}`)
      .join(" | ");

    const maint = eq.nextMaintenance;
    const alarms = eq.recentAlarms
      ? `Alarms: ${eq.recentAlarms.count}, Avg Recovery: ${eq.recentAlarms.avgRecoveryMinutes}min`
      : "";

    return `- ${name} (${eq.type}): Normal ${range.min}-${range.max}${eq.unit} | Measures: ${measures} | Next Maintenance: ${maint} | ${alarms}`;
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
    console.error(
      "❌ [Server Error] OpenAI fetch 중 오류 발생:",
      error.message
    );
    res.status(500).json({
      error: "Failed to create OpenAI session",
      detail: error.message,
    });
  }
}
