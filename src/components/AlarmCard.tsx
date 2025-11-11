import { AlarmData } from '../App';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface AlarmCardProps {
  alarm: AlarmData;
}

export function AlarmCard({ alarm }: AlarmCardProps) {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      bgColor: 'bg-red-600/10',
      borderColor: 'border-red-600/30',
      textColor: 'text-red-400',
      iconBg: 'bg-red-600/20'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-600/10',
      borderColor: 'border-yellow-600/30',
      textColor: 'text-yellow-400',
      iconBg: 'bg-yellow-600/20'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
      textColor: 'text-blue-400',
      iconBg: 'bg-blue-600/20'
    }
  };

  const config = severityConfig[alarm.severity];
  const Icon = config.icon;

  const statusConfig = {
    active: { text: '활성', color: 'text-red-400' },
    acknowledged: { text: '확인됨', color: 'text-yellow-400' },
    resolved: { text: '해결됨', color: 'text-green-400' }
  };

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${config.iconBg} ${config.textColor} p-2.5 rounded-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`${config.textColor}`}>
              {alarm.title}
            </h3>
            <div className="flex items-center gap-1.5">
              {alarm.status === 'resolved' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              <span className={`text-xs ${statusConfig[alarm.status].color}`}>
                {statusConfig[alarm.status].text}
              </span>
            </div>
          </div>
          
          <p className="text-slate-300 text-sm mb-2">
            {alarm.description}
          </p>
          
          <p className="text-xs text-slate-500">
            {alarm.timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
