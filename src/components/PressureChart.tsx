import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface PressureChartProps {
  data: Array<{ time: string; pressure: number }>;
  threshold: number;
}

export function PressureChart({ data, threshold }: PressureChartProps) {
  const { t } = useTranslation(["monitoring", "common"]);

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-4">
      <h2 className="text-slate-300 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        {t("common:pressureTrend")} ({t("common:recentHour")})
      </h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              domain={[12, 16]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: t("common:threshold"),
                fill: '#ef4444',
                fontSize: 12,
                position: 'right'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="pressure" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-400">{t("common:pressureTrend").replace(" 추이", "")} (bar)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-red-500" style={{ borderTop: '2px dashed' }} />
          <span className="text-slate-400">{t("common:threshold")}</span>
        </div>
      </div>
    </div>
  );
}
