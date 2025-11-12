import { AlarmData } from '../App';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AlarmCardProps {
  alarm: AlarmData;
}

export function AlarmCard({ alarm }: AlarmCardProps) {
  const { t, i18n } = useTranslation('alarms');

  // i18n 언어 코드를 locale 형식으로 변환
  const getLocale = () => {
    const langMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      zh: "zh-CN",
    };
    return langMap[i18n.language] || "ko-KR";
  };
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
    active: { text: t('alarmStatus_active'), color: 'text-red-400' },
    acknowledged: { text: t('alarmStatus_acknowledged'), color: 'text-yellow-400' },
    resolved: { text: t('alarmStatus_resolved'), color: 'text-green-400' }
  };

  // 제목 번역하기
  const getTitle = () => {
    if (alarm.titleKey) {
      return `${t("pump3_prefix")} ${t("exceedsThreshold")}`;
    }
    return alarm.title;
  };

  // 설명 번역하기
  const getDescription = () => {
    if (alarm.descriptionKey) {
      return t(alarm.descriptionKey.replace("alarms:", ""), alarm.descriptionParams);
    }
    return alarm.description;
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
              {getTitle()}
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
            {getDescription()}
          </p>
          
          <p className="text-xs text-slate-500">
            {alarm.timestamp.toLocaleTimeString(getLocale(), {
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
