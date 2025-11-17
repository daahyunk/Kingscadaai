import { useState, useRef, useEffect } from "react";
import { Mic, Send, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { useRealtimeAI } from "../hooks/use-realtime-ai";

interface VoiceInputProps {
  onVoiceCommand: (command: string) => void;
  onAIMessage?: (message: string) => void;
  onEquipmentDetail?: (equipmentId: string) => void;
  currentEquipmentState?: Record<string, number>;
}

export function VoiceInput({
  onVoiceCommand,
  onAIMessage,
  onEquipmentDetail,
  currentEquipmentState,
}: VoiceInputProps) {
  const { t, i18n } = useTranslation("chat");
  const [inputValue, setInputValue] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [volumeBars, setVolumeBars] = useState<number[]>([
    0.3, 0.5, 0.7, 0.5, 0.3,
  ]);
  const [showEndHint, setShowEndHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startCall, endCall, isConnecting, isConnected } = useRealtimeAI();

  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setVolumeBars((prev) => prev.map(() => Math.random() * 0.7 + 0.3));
    }, 150);

    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      setShowEndHint(true);
      const timer = setTimeout(() => setShowEndHint(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const quickCommands = [
    t("quickCommand1"),
    t("quickCommand2"),
    t("quickCommand3"),
    t("quickCommand4"),
  ];

  /** 🎙️ 마이크 버튼 클릭 */
  const handleMicClick = async () => {
    if (isConnected) {
      endCall();
      return;
    }

    if (isConnecting) return;

    try {
      // ======================================================
      //  ⭐ 언어 변환 (string → Lang("ko" | "en" | "zh"))
      // ======================================================
      const rawLang = i18n.language || "ko"; // "ko" | "ko-KR" | "en-US"

      const short = rawLang.slice(0, 2); // "ko", "en", "zh"

      const supportedLangs = ["ko", "en", "zh"] as const;
      const currentLang = (
        supportedLangs.includes(short as any) ? short : "ko"
      ) as "ko" | "en" | "zh";

      console.log(
        `[VoiceInput] Starting AI voice call with language: ${rawLang} → ${currentLang}`
      );

      // ======================================================
      //  ⭐ AI 음성 세션 연결
      // ======================================================
      await startCall(
        currentLang,
        {
          onUserMessage: (text) => {
            console.log("[VoiceInput] User speech:", text);
            onVoiceCommand(text);
          },
          onAIMessage: (text) => {
            console.log("[VoiceInput] AI speech:", text);
            onAIMessage?.(text);
          },
          onEquipmentDetail: (equipmentId) => {
            console.log("[VoiceInput] Equipment detail:", equipmentId);
            onEquipmentDetail?.(equipmentId);
          },
        },
        currentEquipmentState
      );
    } catch (err) {
      console.error("[VoiceInput] startCall failed:", err);
    }
  };

  /** 텍스트 명령 보내기 */
  const handleSend = () => {
    if (inputValue.trim()) {
      onVoiceCommand(inputValue);
      setInputValue("");
      setShowQuickCommands(false);
    }
  };

  /** 빠른 명령 선택 */
  const handleQuickCommand = (command: string) => {
    onVoiceCommand(command);
    setShowQuickCommands(false);
  };

  /** 엔터키 */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ⭐ 빠른 명령 오버레이 */}
      {showQuickCommands && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setShowQuickCommands(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 px-4 py-4 max-w-6xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 text-slate-300 mb-3">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">{t("common:voiceCommands")}</span>
              </div>
              <div className="space-y-2">
                {quickCommands.map((command, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickCommand(command)}
                    className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-sm transition-colors border border-slate-700"
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ 하단 음성 입력바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-4 z-30">
        <div className="max-w-6xl mx-auto">
          {/* 연결 중 UI */}
          {isConnecting && (
            <div className="mb-4 flex flex-col items-center gap-3">
              <div className="flex items-end justify-center gap-1 h-12">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-full transition-all duration-150"
                    style={{
                      height: `${12 + Math.sin(Date.now() / 100 + i) * 16}px`,
                      animation: `wave 0.6s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-blue-400">
                  {t("common:voiceConnecting")}
                </p>
                <p className="text-xs text-slate-400 mt-1">마이크 준비 중...</p>
              </div>
            </div>
          )}

          {/* 연결됨 UI */}
          {isConnected && (
            <div className="mb-4 flex flex-col items-center gap-3">
              <div className="flex items-end justify-center gap-1.5 h-12">
                {volumeBars.map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-sm transition-all duration-150"
                    style={{
                      height: `${height * 40}px`,
                    }}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {t("common:voiceConnected")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  AI 음성 안내 중...
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* 빠른 명령 버튼 */}
            <Button
              onClick={() => setShowQuickCommands(!showQuickCommands)}
              variant="outline"
              size="icon"
              className="flex-shrink-0 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            {/* 텍스트 입력 */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("common:inputPlaceholder")}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                style={{ fontSize: "16px" }}
              />
            </div>

            {/* 🎙️ 마이크 버튼 */}
            <div className="relative">
              <Button
                onClick={handleMicClick}
                size="icon"
                className={`flex-shrink-0 transition-all duration-300 ${
                  isConnecting
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : isConnected
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <Mic
                  className={`w-5 h-5 ${
                    isConnecting
                      ? "animate-pulse"
                      : isConnected
                      ? "text-white"
                      : ""
                  }`}
                />
              </Button>

              {isConnected && showEndHint && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-3 bg-red-500 text-white text-sm rounded-lg whitespace-nowrap shadow-lg z-50 font-medium">
                  빨간 버튼을 눌러 종료하세요
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                </div>
              )}
            </div>

            {/* 전송 버튼 */}
            <Button
              onClick={handleSend}
              size="icon"
              className="flex-shrink-0 bg-slate-700 hover:bg-slate-600"
              disabled={!inputValue.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
