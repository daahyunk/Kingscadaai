import { Gauge, Droplet, Activity } from 'lucide-react';

interface PumpStatusProps {
  pressure: number;
  valvePosition: number;
  isAlarmActive: boolean;
}

export function PumpStatus({ pressure, valvePosition, isAlarmActive }: PumpStatusProps) {
  const pressureStatus = pressure > 15.0 ? 'critical' : pressure > 14.0 ? 'warning' : 'normal';
  
  const statusColor = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    normal: 'text-green-400'
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
      <h2 className="text-slate-300 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        펌프 3번 실시간 상태
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Pressure */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Gauge className="w-4 h-4" />
            <span>압력</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl ${statusColor[pressureStatus]}`}>
              {pressure.toFixed(1)}
            </span>
            <span className="text-slate-500">bar</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            임계치: 15.0 bar
          </div>
        </div>

        {/* Valve Position */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Droplet className="w-4 h-4" />
            <span>밸브 V-102</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl text-blue-400">
              {valvePosition}
            </span>
            <span className="text-slate-500">%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${valvePosition}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className={`mt-4 px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
        isAlarmActive 
          ? 'bg-red-600/20 border border-red-600/30' 
          : 'bg-green-600/20 border border-green-600/30'
      }`}>
        <span className={isAlarmActive ? 'text-red-400' : 'text-green-400'}>
          {isAlarmActive ? '⚠️ 조치 필요' : '✓ 정상 운영'}
        </span>
        <div className={`w-2 h-2 rounded-full ${
          isAlarmActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'
        }`} />
      </div>
    </div>
  );
}
