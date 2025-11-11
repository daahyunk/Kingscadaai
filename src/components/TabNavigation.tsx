import { TabType } from "../App";
import { LayoutDashboard, Activity, Bell, MessageSquare } from "lucide-react";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  alarmCount: number;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  alarmCount,
}: TabNavigationProps) {
  const tabs = [
    { id: "overview" as TabType, label: "개요", icon: LayoutDashboard },
    { id: "monitoring" as TabType, label: "모니터링", icon: Activity },
    { id: "alarms" as TabType, label: "알람", icon: Bell, badge: alarmCount },
    { id: "chat" as TabType, label: "대화", icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-[73px] z-20 bg-slate-950 border-b border-slate-700">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200 border-b-2 ${
                  isActive
                    ? "text-blue-400 border-blue-400"
                    : "text-slate-500 hover:text-slate-300 border-transparent"
                }`}
              >
                <div className="relative flex items-center justify-center h-5">
                  <Icon
                    className={`transition-all ${
                      isActive ? "w-5 h-5" : "w-4 h-4"
                    }`}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-all ${
                    isActive ? "text-blue-400 font-semibold" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
