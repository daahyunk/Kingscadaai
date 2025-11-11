import { TabType } from '../App';
import { LayoutDashboard, Activity, Bell, MessageSquare } from 'lucide-react';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  alarmCount: number;
}

export function TabNavigation({ activeTab, onTabChange, alarmCount }: TabNavigationProps) {
  const tabs = [
    { id: 'overview' as TabType, label: '개요', icon: LayoutDashboard },
    { id: 'monitoring' as TabType, label: '모니터링', icon: Activity },
    { id: 'alarms' as TabType, label: '알람', icon: Bell, badge: alarmCount },
    { id: 'chat' as TabType, label: '대화', icon: MessageSquare }
  ];

  return (
    <nav className="sticky top-[73px] z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 relative transition-colors ${
                  isActive 
                    ? 'text-blue-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
