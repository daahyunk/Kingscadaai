import { Droplets, Thermometer, Wind, Gauge, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Equipment {
  id: number;
  name: string;
  type: 'pump' | 'temperature' | 'flow' | 'pressure';
  status: 'online' | 'alarm' | 'offline';
  value: number;
  unit: string;
  threshold?: number;
  icon: typeof Droplets;
}

interface AllEquipmentMonitoringProps {
  currentPressure: number;
  isAlarmActive: boolean;
}

export function AllEquipmentMonitoring({ currentPressure, isAlarmActive }: AllEquipmentMonitoringProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);

  const allEquipment: Equipment[] = [
    { id: 1, name: '펌프 1', type: 'pump', status: 'online', value: 13.2, unit: 'bar', threshold: 15.0, icon: Droplets },
    { id: 2, name: '펌프 2', type: 'pump', status: 'online', value: 14.1, unit: 'bar', threshold: 15.0, icon: Droplets },
    { id: 3, name: '펌프 3', type: 'pump', status: isAlarmActive ? 'alarm' : 'online', value: currentPressure, unit: 'bar', threshold: 15.0, icon: Droplets },
    { id: 4, name: '펌프 4', type: 'pump', status: 'online', value: 13.8, unit: 'bar', threshold: 15.0, icon: Droplets },
    { id: 5, name: '온도 센서 A', type: 'temperature', status: 'online', value: 23.5, unit: '°C', threshold: 80.0, icon: Thermometer },
    { id: 6, name: '온도 센서 B', type: 'temperature', status: 'online', value: 24.2, unit: '°C', threshold: 80.0, icon: Thermometer },
    { id: 7, name: '유량계 1', type: 'flow', status: 'online', value: 150, unit: 'L/min', icon: Wind },
    { id: 8, name: '유량계 2', type: 'flow', status: 'online', value: 145, unit: 'L/min', icon: Wind },
    { id: 9, name: '압력 센서 A', type: 'pressure', status: 'online', value: 12.8, unit: 'bar', threshold: 15.0, icon: Gauge },
    { id: 10, name: '압력 센서 B', type: 'pressure', status: 'online', value: 13.4, unit: 'bar', threshold: 15.0, icon: Gauge },
    { id: 11, name: '압력 센서 C', type: 'pressure', status: 'online', value: 14.0, unit: 'bar', threshold: 15.0, icon: Gauge },
    { id: 12, name: '압력 센서 D', type: 'pressure', status: 'online', value: 13.1, unit: 'bar', threshold: 15.0, icon: Gauge },
  ];

  const statusConfig = {
    online: { 
      color: 'text-green-400', 
      bg: 'bg-green-600/10', 
      border: 'border-slate-700',
      dot: 'bg-green-500',
      label: '정상'
    },
    alarm: { 
      color: 'text-red-400', 
      bg: 'bg-red-600/10', 
      border: 'border-red-600/30',
      dot: 'bg-red-500',
      label: '경고'
    },
    offline: { 
      color: 'text-slate-500', 
      bg: 'bg-slate-600/10', 
      border: 'border-slate-700',
      dot: 'bg-slate-500',
      label: '오프라인'
    }
  };

  const getPercentage = (equipment: Equipment) => {
    if (!equipment.threshold) return 0;
    return Math.min((equipment.value / equipment.threshold) * 100, 100);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
      <h2 className="text-slate-300 mb-4">전체 장비 모니터링 (12개)</h2>
      
      <div className="grid grid-cols-1 gap-2">
        {allEquipment.map((equipment) => {
          const Icon = equipment.icon;
          const config = statusConfig[equipment.status];
          const percentage = getPercentage(equipment);
          const isSelected = selectedEquipment === equipment.id;

          return (
            <div key={equipment.id}>
              <button
                onClick={() => setSelectedEquipment(isSelected ? null : equipment.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${config.bg} ${config.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-200 text-sm">{equipment.name}</p>
                        <span className={`text-xs ${config.color}`}>({config.label})</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`${config.color}`}>{equipment.value.toFixed(1)}</span>
                        <span className="text-xs text-slate-500">{equipment.unit}</span>
                        {equipment.threshold && (
                          <span className="text-xs text-slate-500 ml-2">
                            / {equipment.threshold} {equipment.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.dot} ${
                      equipment.status === 'alarm' ? 'animate-pulse' : ''
                    }`} />
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${
                      isSelected ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Progress Bar */}
                {equipment.threshold && (
                  <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        equipment.status === 'alarm' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
              </button>

              {/* Expanded Details */}
              {isSelected && (
                <div className="mt-2 ml-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">현재 값</p>
                      <p className={config.color}>{equipment.value.toFixed(1)} {equipment.unit}</p>
                    </div>
                    {equipment.threshold && (
                      <div>
                        <p className="text-slate-500 text-xs mb-1">임계치</p>
                        <p className="text-slate-300">{equipment.threshold} {equipment.unit}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500 text-xs mb-1">상태</p>
                      <p className={config.color}>{config.label}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">마지막 업데이트</p>
                      <p className="text-slate-300">방금 전</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
