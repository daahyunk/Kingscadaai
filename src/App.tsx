import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { AlarmCard } from "./components/AlarmCard";
import { PumpStatus } from "./components/PumpStatus";
import { PressureChart } from "./components/PressureChart";
import { MonitoringView } from "./components/MonitoringView";
import { VoiceInput } from "./components/VoiceInput";
import { SystemOverview } from "./components/SystemOverview";
import { TabNavigation } from "./components/TabNavigation";
import { AlertCircle } from "lucide-react";

export type TabType = "overview" | "monitoring" | "alarms" | "chat";

export interface Message {
  id: string;
  type: "user" | "system" | "alert";
  content: string;
  timestamp: Date;
}

export interface AlarmData {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  timestamp: Date;
  status: "active" | "acknowledged" | "resolved";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "system",
      content:
        "KingSCADA AI 음성 어시스턴트가 준비되었습니다. 무엇을 도와드릴까요?",
      timestamp: new Date(),
    },
  ]);

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
      title: "펌프 3번 압력 임계치 초과",
      description: "현재 압력: 15.5 bar (임계치: 15.0 bar)",
      timestamp: new Date(),
      status: "active",
    };

    setAlarms([alarm]);

    const alertMessage: Message = {
      id: "msg-" + Date.now(),
      type: "alert",
      content:
        "🚨 경고. 펌프 3번의 압력 15.5 bar, 임계치 초과. 긴급 조치가 필요합니다.",
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
    let response = "";

    if (command.includes("추이") || command.includes("분석")) {
      response =
        "최근 1시간 동안 압력이 13.0 bar에서 15.5 bar로 급격히 상승했습니다. 유량 센서 값은 정상입니다.";
    } else if (command.includes("밸브") || command.includes("줄여")) {
      setValvePosition(50);
      response =
        "밸브 V-102 조작 중. 현재 50%로 설정 완료. 압력 변화를 모니터링합니다.";

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
          content: "✅ 압력이 정상 범위로 회복되었습니다. (현재: 13.5 bar)",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, normalMessage]);
      }, 3000);
    } else if (command.includes("보고서")) {
      response =
        "오늘 10시 45분 펌프 3번 압력 이상 조치 보고서를 PDF로 생성하여 관리자에게 자동 전송했습니다.";
    } else if (command.includes("상태")) {
      response = `펌프 3번 현재 상태: 압력 ${pressure} bar, 밸브 V-102 위치 ${valvePosition}%`;
    } else {
      response = "명령을 이해했습니다. 처리 중입니다.";
    }

    const systemMessage: Message = {
      id: "msg-" + Date.now(),
      type: "system",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      {/* Header */}
      <header className="bg-slate-950 px-4 py-4">
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
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alarmCount={alarms.filter((a) => a.status === "active").length}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
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
              <h2 className="text-slate-300 mb-4">알람 관리</h2>
              {alarms.length > 0 ? (
                <div className="space-y-2">
                  {alarms.map((alarm) => (
                    <AlarmCard key={alarm.id} alarm={alarm} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>활성 알람이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col h-[calc(100vh-140px)] pb-24">
            <div className="flex-1 overflow-y-auto">
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
