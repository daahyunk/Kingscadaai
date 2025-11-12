import { Droplets, Thermometer, Wind, Gauge } from "lucide-react";

interface Equipment {
  id: number;
  name: string;
  type: "pump" | "temperature" | "flow" | "pressure";
  status: "online" | "alarm" | "offline";
  value: number;
  unit: string;
  threshold?: number;
}

interface EquipmentGridProps {
  equipment: Equipment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  filter: string;
}

export function EquipmentGrid({
  equipment,
  selectedId,
  onSelect,
  filter,
}: EquipmentGridProps) {
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
    },
    alarm: {
      color: "text-red-400",
      bg: "bg-red-600/10",
      border: "border-red-600/30",
      dot: "bg-red-500",
    },
    offline: {
      color: "text-slate-500",
      bg: "bg-slate-600/10",
      border: "border-slate-700",
      dot: "bg-slate-500",
    },
  };

  const filteredEquipment =
    filter === "all" ? equipment : equipment.filter((e) => e.type === filter);

  return (
    <div className="grid grid-cols-2 gap-3">
      {filteredEquipment.map((item) => {
        const Icon = getIcon(item.type);
        const config = statusConfig[item.status];
        const isSelected = selectedId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`relative p-3 rounded-lg border transition-all text-left ${
              isSelected
                ? "ring-2 ring-blue-500 border-blue-500"
                : config.border
            } ${config.bg}`}
          >
            {/* Status Dot */}
            <div
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                config.dot
              } ${item.status === "alarm" ? "animate-pulse" : ""}`}
            />

            {/* Icon */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded ${config.bg}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <span className="text-slate-200 text-sm">{item.name}</span>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1">
              <span className={`text-xl ${config.color}`}>
                {item.value.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">{item.unit}</span>
            </div>

            {/* Threshold indicator */}
            {item.threshold && (
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    item.status === "alarm" ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (item.value / item.threshold) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
