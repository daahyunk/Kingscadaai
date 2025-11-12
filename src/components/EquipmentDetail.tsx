import {
  Activity,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";

interface Equipment {
  id: number;
  name: string;
  type: "pump" | "temperature" | "flow" | "pressure";
  status: "online" | "alarm" | "offline";
  value: number;
  unit: string;
  threshold?: number;
}

interface EquipmentDetailProps {
  equipment: Equipment;
  historyData: Array<{ time: string; value: number }>;
  additionalParams?: Array<{ label: string; value: string; unit: string }>;
}

export function EquipmentDetail({
  equipment,
  historyData,
  additionalParams,
}: EquipmentDetailProps) {
  const { t } = useTranslation(["monitoring", "common"]);

  const statusConfig = {
    online: {
      color: "text-green-400",
      bg: "bg-green-600/20",
      icon: CheckCircle,
    },
    alarm: { color: "text-red-400", bg: "bg-red-600/20", icon: AlertTriangle },
    offline: {
      color: "text-slate-500",
      bg: "bg-slate-600/20",
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[equipment.status];
  const StatusIcon = config.icon;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pump":
        return t("common:pumpType");
      case "temperature":
        return t("common:temperatureSensor");
      case "flow":
        return t("common:flowMeter");
      case "pressure":
        return t("common:pressureSensor");
      default:
        return t("common:equipmentType");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-slate-200">{equipment.name}</h2>
              <span className="text-xs text-slate-500">
                ({getTypeLabel(equipment.type)})
              </span>
            </div>
            <p className="text-xs text-slate-500">{t("monitoring:equipmentId")}: {equipment.id}</p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}
          >
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm ${config.color}`}>
              {equipment.status === "online"
                ? t("common:normal")
                : equipment.status === "alarm"
                ? t("common:warning")
                : t("common:offline")}
            </span>
          </div>
        </div>

        {/* Main Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Gauge className="w-4 h-4" />
              <span>{t("common:currentValue")}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl ${config.color}`}>
                {equipment.value.toFixed(1)}
              </span>
              <span className="text-slate-500">{equipment.unit}</span>
            </div>
            {equipment.threshold && (
              <div className="mt-2 text-xs text-slate-500">
                {t("common:threshold")}: {equipment.threshold} {equipment.unit}
              </div>
            )}
          </div>

          {/* Additional Parameter */}
          {additionalParams && additionalParams.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                <Activity className="w-4 h-4" />
                <span>{additionalParams[0].label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl text-blue-400">
                  {additionalParams[0].value}
                </span>
                <span className="text-slate-500">
                  {additionalParams[0].unit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div
          className={`mt-4 px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
            equipment.status === "alarm"
              ? "bg-red-600/20 border border-red-600/30"
              : "bg-green-600/20 border border-green-600/30"
          }`}
        >
          <span
            className={
              equipment.status === "alarm" ? "text-red-400" : "text-green-400"
            }
          >
            {equipment.status === "alarm" ? t("common:actionNeeded") : t("common:normalOperation")}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${
              equipment.status === "alarm"
                ? "bg-red-500 animate-pulse"
                : "bg-green-500"
            }`}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
        <h3 className="text-slate-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t("monitoring:trendAnalysis")}
        </h3>

        <div style={{ height: "300px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={historyData}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                {...(equipment.threshold && {
                  domain: [
                    Math.min(...historyData.map((d) => d.value)) - 2,
                    Math.max(
                      equipment.threshold + 2,
                      Math.max(...historyData.map((d) => d.value)) + 2
                    ),
                  ],
                })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              {equipment.threshold && (
                <ReferenceLine
                  y={equipment.threshold}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: t("common:threshold"),
                    fill: "#ef4444",
                    fontSize: 12,
                    position: "right",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-400">
              {t("monitoring:measurementValue")}
            </span>
          </div>
          {equipment.threshold && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-red-500"
                style={{ borderTop: "2px dashed" }}
              />
              <span className="text-slate-400">{t("monitoring:thresholdLabel")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
