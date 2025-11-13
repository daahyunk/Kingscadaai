import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChatInterface } from "./components/ChatInterface";
import { AlarmCard } from "./components/AlarmCard";
import { PumpStatus } from "./components/PumpStatus";
import { PressureChart } from "./components/PressureChart";
import { MonitoringView } from "./components/MonitoringView";
import { VoiceInput } from "./components/VoiceInput";
import { SystemOverview } from "./components/SystemOverview";
import { TabNavigation } from "./components/TabNavigation";
import { AlertCircle, Globe } from "lucide-react";

export type TabType = "overview" | "monitoring" | "alarms" | "chat";

export interface Message {
  id: string;
  type: "user" | "system" | "alert";
  content: string;
  timestamp: Date;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
}

export interface AlarmData {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  timestamp: Date;
  status: "active" | "acknowledged" | "resolved";
  titleKey?: string;
  descriptionKey?: string;
  descriptionParams?: Record<string, string | number>;
}

interface AppProps {
  initialLanguage?: string;
}

export default function App({ initialLanguage = "ko" }: AppProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // URL 기반 언어 설정
  useEffect(() => {
    if (initialLanguage && i18n.language !== initialLanguage) {
      i18n.changeLanguage(initialLanguage);
      localStorage.setItem("language", initialLanguage);
    }
  }, [initialLanguage, i18n]);
  const [messages, setMessages] = useState<Message[]>([]);

  // 메시지 초기화 - 언어가 로드될 때마다 실행
  useEffect(() => {
    setMessages([
      {
        id: "1",
        type: "system",
        content: t("chat:assistantGreeting"),
        timestamp: new Date(),
      },
    ]);
  }, [i18n.language, t]);

  const [alarms, setAlarms] = useState<AlarmData[]>([]);
  const [pressure, setPressure] = useState(13.0);
  const [valvePosition, setValvePosition] = useState(100);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [pressureHistory, setPressureHistory] = useState<
    Array<{ time: string; pressure: number }>
  >([
    { time: "09:45", pressure: 13.0 },
    { time: "10:00", pressure: 13.2 },
    { time: "10:15", pressure: 13.8 },
    { time: "10:30", pressure: 14.5 },
    { time: "10:45", pressure: 15.5 },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Detect if user is scrolled near the bottom
  const isNearBottom = () => {
    if (!chatContainerRef.current) return false;
    const container = chatContainerRef.current;
    const threshold = 100; // pixels from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  // Handle manual scroll
  const handleScroll = () => {
    setIsUserScrolling(!isNearBottom());
  };

  // Auto-scroll only if user is at the bottom
  useEffect(() => {
    if (!isUserScrolling && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserScrolling]);

  // Simulate alarm trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAlarm();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const triggerAlarm = () => {
    setPressure(15.5);
    setIsAlarmActive(true);

    const alarm: AlarmData = {
      id: "alarm-" + Date.now(),
      severity: "critical",
      title: "",
      description: "",
      timestamp: new Date(),
      status: "active",
      titleKey: "alarmTitle_pump3",
      descriptionKey: "alarms:alarmDescription_pressure",
      descriptionParams: { pressure: 15.5, threshold: 15.0 },
    };

    setAlarms([alarm]);

    const alertMessage: Message = {
      id: "msg-" + Date.now(),
      type: "alert",
      content: "",
      translationKey: "alarms:alarmMessage",
      translationParams: { pressure: 15.5 },
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, alertMessage]);
  };

  const handleVoiceCommand = (command: string) => {
    const userMessage: Message = {
      id: "msg-" + Date.now(),
      type: "user",
      content: command,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Process command
    setTimeout(() => {
      processCommand(command);
    }, 500);
  };

  const processCommand = (command: string) => {
    let translationKey = "";
    let translationParams: Record<string, string | number> = {};

    // 다국어 음성 명령어 지원
    const trendKeywords = ["추이", "분석", "trend", "analyze", "趋势", "分析"];
    const valveKeywords = ["밸브", "줄여", "valve", "reduce", "阀门", "减少"];
    const reportKeywords = ["보고서", "report", "报告"];
    const statusKeywords = ["상태", "status", "状态"];

    if (trendKeywords.some((kw) => command.includes(kw))) {
      translationKey = "alarms:pressureAnalysisResponse";
    } else if (valveKeywords.some((kw) => command.includes(kw))) {
      setValvePosition(50);
      translationKey = "alarms:valveOperationResponse";

      // Simulate pressure decrease
      setTimeout(() => {
        setPressure(14.2);
        setPressureHistory((prev) => [
          ...prev,
          { time: "10:50", pressure: 14.2 },
        ]);
      }, 1500);

      setTimeout(() => {
        setPressure(13.5);
        setPressureHistory((prev) => [
          ...prev,
          { time: "10:55", pressure: 13.5 },
        ]);
        setIsAlarmActive(false);

        // Update alarm status
        setAlarms((prev) =>
          prev.map((alarm) => ({ ...alarm, status: "resolved" as const }))
        );

        const normalMessage: Message = {
          id: "msg-" + Date.now(),
          type: "system",
          translationKey: "alarms:pressureRecoveryMessage",
          translationParams: { pressure: 13.5 },
          content: "",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, normalMessage]);
      }, 3000);
    } else if (reportKeywords.some((kw) => command.includes(kw))) {
      translationKey = "alarms:reportGenerationResponse";
    } else if (statusKeywords.some((kw) => command.includes(kw))) {
      translationKey = "alarms:statusQueryResponse";
      translationParams = {
        pressure: pressure.toFixed(1),
        position: valvePosition,
      };
    } else {
      translationKey = "alarms:commandDefaultResponse";
    }

    const systemMessage: Message = {
      id: "msg-" + Date.now(),
      type: "system",
      content: "",
      translationKey,
      translationParams,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem("language", lang);
    setShowLanguageMenu(false);
    // URL 변경 후 페이지 새로고침
    window.location.href = `/${lang}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-950 px-4 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-1">
            <img
              src="/logo.webp"
              alt="KingSCADA Logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <h1
                className="text-white text-base font-geometric"
                style={{
                  fontFamily:
                    "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                <span className="font-bold">KingSCADA</span>{" "}
                <span className="font-semibold">AI</span>
              </h1>
              {/* <p className="text-slate-400 text-sm">음성 어시스턴트</p> */}
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 text-sm"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{i18n.language}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-lg z-50">
                <button
                  onClick={() => handleLanguageChange("ko")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    i18n.language === "ko"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-700 text-slate-300"
                  } first:rounded-t-lg`}
                >
                  🇰🇷 {t("common:korean")}
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`w-full text-left px-4 py-2 text-sm border-t border-slate-700 ${
                    i18n.language === "en"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  🇬🇧 {t("common:english")}
                </button>
                <button
                  onClick={() => handleLanguageChange("zh")}
                  className={`w-full text-left px-4 py-2 text-sm border-t border-slate-700 ${
                    i18n.language === "zh"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-700 text-slate-300"
                  } last:rounded-b-lg`}
                >
                  🇨🇳 {t("common:chinese")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alarmCount={alarms.filter((a) => a.status === "active").length}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4 pb-24">
        {activeTab === "overview" && (
          <SystemOverview
            pressure={pressure}
            valvePosition={valvePosition}
            isAlarmActive={isAlarmActive}
            alarmCount={alarms.filter((a) => a.status === "active").length}
          />
        )}

        {activeTab === "monitoring" && (
          <MonitoringView
            currentPressure={pressure}
            valvePosition={valvePosition}
            isAlarmActive={isAlarmActive}
            pressureHistory={pressureHistory}
          />
        )}

        {activeTab === "alarms" && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
              <h2 className="text-slate-300 mb-4">
                {t("alarms:alarmManagement")}
              </h2>
              {alarms.length > 0 ? (
                <div className="space-y-2">
                  {alarms.map((alarm) => (
                    <AlarmCard key={alarm.id} alarm={alarm} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t("alarms:noAlarms")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col flex-1">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleScroll}
            >
              <ChatInterface messages={messages} />
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* Voice Input (Fixed Bottom - Only in Chat Tab) */}
      {activeTab === "chat" && (
        <VoiceInput onVoiceCommand={handleVoiceCommand} />
      )}
    </div>
  );
}
