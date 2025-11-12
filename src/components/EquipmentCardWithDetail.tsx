import {
  Droplets,
  Thermometer,
  Wind,
  Gauge,
  ChevronDown,
  TrendingUp,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
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
import { useState } from "react";

interface Equipment {
  id: number;
  name: string;
  type: "pump" | "temperature" | "flow" | "pressure";
  status: "online" | "alarm" | "offline";
  value: number;
  unit: string;
  threshold?: number;
}

interface AdditionalParam {
  label: string;
  value: string;
  unit: string;
}

interface AIRecommendation {
  priority: "high" | "medium" | "low";
  steps: Array<{
    step: number;
    title: string;
    description: string;
    completed?: boolean;
  }>;
}

interface EquipmentCardWithDetailProps {
  equipment: Equipment;
  isExpanded: boolean;
  onToggle: () => void;
  historyData: Array<{ time: string; value: number }>;
  additionalParams?: AdditionalParam[];
  aiRecommendation?: AIRecommendation;
}

export function EquipmentCardWithDetail({
  equipment,
  isExpanded,
  onToggle,
  historyData,
  additionalParams,
  aiRecommendation,
}: EquipmentCardWithDetailProps) {
  const [showAIRecommendation, setShowAIRecommendation] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "pump":
        return Droplets;
      case "temperature":
        return Thermometer;
      case "flow":
        return Wind;
      case "pressure":
        return Gauge;
      default:
        return Gauge;
    }
  };

  const statusConfig = {
    online: {
      color: "text-green-400",
      bg: "bg-green-600/10",
      border: "border-slate-700",
      dot: "bg-green-500",
      label: "정상",
    },
    alarm: {
      color: "text-red-400",
      bg: "bg-red-600/10",
      border: "border-red-600/30",
      dot: "bg-red-500",
      label: "경고",
    },
    offline: {
      color: "text-slate-500",
      bg: "bg-slate-600/10",
      border: "border-slate-700",
      dot: "bg-slate-500",
      label: "오프라인",
    },
  };

  const Icon = getIcon(equipment.type);
  const config = statusConfig[equipment.status];
  const percentage = equipment.threshold
    ? Math.min((equipment.value / equipment.threshold) * 100, 100)
    : 0;

  return (
    <div className={`rounded-lg border transition-all ${config.border}`}>
      {/* Card Header */}
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-lg transition-all overflow-hidden focus:outline-none ${config.border}`}
      >
        <div className={`p-4 ${config.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-slate-200 text-sm font-medium">
                    {equipment.name}
                  </p>
                  <span className={`text-xs font-medium ${config.color}`}>
                    ({config.label})
                  </span>
                  {equipment.status === "alarm" && aiRecommendation && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 rounded-full">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400">AI 조치</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`${config.color}`}>
                    {equipment.value.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {equipment.unit}
                  </span>
                  {equipment.threshold && (
                    <span className="text-xs text-slate-500 ml-2">
                      / {equipment.threshold} {equipment.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${config.dot} ${
                  equipment.status === "alarm" ? "animate-pulse" : ""
                }`}
              />
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {equipment.threshold && (
          <div className="px-4 pb-4">
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  equipment.status === "alarm" ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700 bg-slate-800/30">
          {/* Additional Parameters */}
          {/* Status Cards - Pressure and Valve */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Pressure Card */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon className="w-4 h-4" />
                  <span>{equipment.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${config.color}`}>
                    {equipment.value.toFixed(1)}
                  </span>
                  <span className="text-slate-500">{equipment.unit}</span>
                </div>
                {equipment.threshold && (
                  <div className="mt-2 text-xs text-slate-400">
                    임계치 - {equipment.threshold} {equipment.unit}
                  </div>
                )}
              </div>

              {/* Valve Card */}
              {additionalParams &&
                additionalParams.length > 0 &&
                additionalParams.map((param, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Droplets className="w-4 h-4" />
                      <span>{param.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl text-blue-400 font-bold">
                        {param.value}
                      </span>
                      <span className="text-slate-500">{param.unit}</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${param.value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Chart */}
          <div className="p-4">
            <h4 className="text-slate-300 text-sm mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="w-4 h-4" />
              추이 분석 (최근 1시간)
            </h4>

            <div style={{ height: "250px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historyData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  {equipment.threshold && (
                    <ReferenceLine
                      y={equipment.threshold}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{
                        value: "임계치",
                        fill: "#ef4444",
                        fontSize: 11,
                        position: "right",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-400">측정값</span>
              </div>
              {equipment.threshold && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-0.5 bg-red-500"
                    style={{ borderTop: "2px dashed" }}
                  />
                  <span className="text-slate-400">임계치</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendations Button - Show only for alarms */}
          {equipment.status === "alarm" && aiRecommendation && (
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAIRecommendation(!showAIRecommendation);
                }}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/40 rounded-lg transition-all focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-600/20 rounded-lg">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-purple-300 font-semibold">
                      AI 추천 조치
                    </p>
                    <p className="text-xs text-purple-400/70">
                      {aiRecommendation.steps.filter((s) => s.completed).length}
                      /{aiRecommendation.steps.length} 단계 완료
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      aiRecommendation.priority === "high"
                        ? "bg-red-600/20 text-red-400"
                        : aiRecommendation.priority === "medium"
                        ? "bg-yellow-600/20 text-yellow-400"
                        : "bg-blue-600/20 text-blue-400"
                    }`}
                  >
                    {aiRecommendation.priority === "high"
                      ? "긴급"
                      : aiRecommendation.priority === "medium"
                      ? "주의"
                      : "일반"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-400 transition-transform ${
                      showAIRecommendation ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* AI Recommendation Content */}
              {showAIRecommendation && (
                <div className="mt-3 space-y-2">
                  {aiRecommendation.steps.map((step) => (
                    <div
                      key={step.step}
                      className={`flex gap-3 p-2.5 rounded-lg border transition-all ${
                        step.completed
                          ? "bg-green-600/5 border-green-600/20"
                          : "bg-slate-800/50 border-slate-700"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-purple-600/20 border-2 border-purple-500/50 flex items-center justify-center">
                            <span className="text-xs text-purple-400">
                              {step.step}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={`text-sm ${
                              step.completed
                                ? "text-green-400 line-through"
                                : "text-slate-200"
                            }`}
                          >
                            {step.title}
                          </p>
                        </div>
                        <p
                          className={`text-xs ${
                            step.completed
                              ? "text-green-500/70"
                              : "text-slate-400"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="mt-3 flex items-center gap-2 text-xs text-purple-400/70 bg-purple-600/5 p-2 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      AI가 실시간 데이터를 분석하여 최적의 조치를 제안합니다
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
