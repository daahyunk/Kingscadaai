import { useTranslation } from "react-i18next";
import {
  Droplets,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Server,
  Gauge
} from 'lucide-react';

interface SystemOverviewProps {
  pressure: number;
  valvePosition: number;
  isAlarmActive: boolean;
  alarmCount: number;
}

export function SystemOverview({ pressure, isAlarmActive, alarmCount }: SystemOverviewProps) {
  const { t, i18n } = useTranslation();

  // i18n 언어 코드를 locale 형식으로 변환
  const getLocale = () => {
    const langMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      zh: "zh-CN",
    };
    return langMap[i18n.language] || "ko-KR";
  };

  const stats = [
    {
      label: t("overview:totalEquipment"),
      value: '12',
      unit: t("overview:equipment"),
      icon: Server,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600/10',
      iconBg: 'bg-blue-600/20'
    },
    {
      label: t("overview:online"),
      value: '12',
      unit: t("overview:equipment"),
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-600/10',
      iconBg: 'bg-green-600/20'
    },
    {
      label: t("overview:activeAlarms"),
      value: alarmCount.toString(),
      unit: t("overview:equipment"),
      icon: AlertTriangle,
      color: alarmCount > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: alarmCount > 0 ? 'bg-red-600/10' : 'bg-slate-600/10',
      iconBg: alarmCount > 0 ? 'bg-red-600/20' : 'bg-slate-600/20'
    },
    {
      label: t("overview:operatingTime"),
      value: '127',
      unit: 'days',
      icon: Clock,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/10',
      iconBg: 'bg-purple-600/20'
    }
  ];

  const equipmentStatus = [
    { id: 1, name: t("overview:pump1"), status: 'online', value: '13.2 bar', icon: Droplets },
    { id: 2, name: t("overview:pump2"), status: 'online', value: '14.1 bar', icon: Droplets },
    { id: 3, name: t("overview:pump3"), status: isAlarmActive ? 'alarm' : 'online', value: `${pressure.toFixed(1)} bar`, icon: Droplets },
    { id: 4, name: t("overview:pump4"), status: 'online', value: '13.8 bar', icon: Droplets },
    { id: 5, name: t("overview:temperatureSensorA"), status: 'online', value: '23.5°C', icon: Thermometer },
    { id: 6, name: t("overview:temperatureSensorB"), status: 'online', value: '24.2°C', icon: Thermometer },
    { id: 7, name: t("overview:flowMeter1"), status: 'online', value: '150 L/min', icon: Wind },
    { id: 8, name: t("overview:flowMeter2"), status: 'online', value: '145 L/min', icon: Wind },
  ];

  return (
    <div className="space-y-4">
      {/* System Status Banner */}
      <div className={`rounded-xl p-4 border ${
        isAlarmActive 
          ? 'bg-red-600/20 border-red-600/30' 
          : 'bg-green-600/20 border-green-600/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAlarmActive ? 'bg-red-600/30' : 'bg-green-600/30'
            }`}>
              {isAlarmActive ? (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              )}
            </div>
            <div>
              <h2 className={isAlarmActive ? 'font-semibold text-red-300' : 'text-green-300'}>
                {isAlarmActive ? t('common:emergencyActionRequired') : t('common:systemOperatingNormally')}
              </h2>
              <p className="text-sm text-slate-400">
                {new Date().toLocaleString(getLocale(), {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            isAlarmActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`} />
        </div>
      </div>

      {/* Pump System Image */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-slate-300 flex items-center gap-2 text-base font-semibold">
            <Gauge className="w-[21px] h-[21px]" />
            {t('common:pumpSystemStatus')}
          </h2>
        </div>
        <div className="relative">
          <img
            src="/pump.webp"
            alt="펌프 시스템"
            className="w-full h-auto"
          />
          {/* Overlay indicators on pump 3 if alarm is active */}
          {isAlarmActive && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-red-600/90 backdrop-blur border border-red-400 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg text-sm font-medium">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white">{t('overview:pump3PressureAnomaly')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className={`${stat.bgColor} border border-slate-700 rounded-xl p-4`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`${stat.iconBg} ${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-slate-400 text-sm">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-slate-500 text-sm">{stat.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment Status */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
        <h2 className="text-slate-300 flex items-center gap-2 text-base font-semibold mb-4">
          <TrendingUp className="w-5 h-5" />
          {t("overview:realTimeEquipmentStatus")}
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {equipmentStatus.map((equipment) => {
            const Icon = equipment.icon;
            const statusConfig = {
              online: { color: 'text-green-400', bg: 'bg-green-600/20', dot: 'bg-green-500' },
              alarm: { color: 'text-red-400', bg: 'bg-red-600/20', dot: 'bg-red-500' },
              offline: { color: 'text-slate-500', bg: 'bg-slate-600/20', dot: 'bg-slate-500' }
            };
            const config = statusConfig[equipment.status as keyof typeof statusConfig];

            return (
              <div
                key={equipment.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-red-600/30 transition-all ${
                  equipment.status === 'alarm'
                    ? 'animate-alarm-blink'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${config.bg} ${config.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm">{equipment.name}</p>
                    <p className={`text-xs ${config.color}`}>{equipment.value}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${config.dot} ${
                  equipment.status === 'alarm' ? 'animate-alarm-pulse shadow-lg shadow-red-500' : ''
                }`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}