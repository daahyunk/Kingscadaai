import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EquipmentCardWithDetail } from "./EquipmentCardWithDetail";
import { Search, Filter, AlertCircle } from "lucide-react";

interface Equipment {
  id: number;
  name: string;
  type: "pump" | "temperature" | "flow" | "pressure";
  status: "online" | "alarm" | "offline";
  value: number;
  unit: string;
  threshold?: number;
}

interface MonitoringViewProps {
  currentPressure: number;
  valvePosition: number;
  isAlarmActive: boolean;
  pressureHistory: Array<{ time: string; pressure: number }>;
}

export function MonitoringView({
  currentPressure,
  valvePosition,
  isAlarmActive,
  pressureHistory,
}: MonitoringViewProps) {
  const { t } = useTranslation(["monitoring", "common"]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    null
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // 상단 고정 기능 관련 코드 (임시 비활성화)
  // const [isSticky, setIsSticky] = useState(false);
  // const headerRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   const handleScroll = () => {
  //     if (headerRef.current) {
  //       // 헤더의 원래 위치 저장 (최초 1회만)
  //       const headerOffset = headerRef.current.offsetTop;
  //       const scrollY = window.scrollY || window.pageYOffset;
  //       // 헤더의 원래 위치에 도달하기 전에 미리 패딩 추가 (자연스러운 전환)
  //       setIsSticky(scrollY >= headerOffset - 12);
  //     }
  //   };

  //   window.addEventListener("scroll", handleScroll, { passive: true });
  //   handleScroll(); // 초기 상태 확인

  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  const allEquipment: Equipment[] = [
    {
      id: 1,
      name: t("monitoring:pump1"),
      type: "pump",
      status: "online",
      value: 13.2,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 2,
      name: t("monitoring:pump2"),
      type: "pump",
      status: "online",
      value: 14.1,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 3,
      name: t("monitoring:pump3"),
      type: "pump",
      status: isAlarmActive ? "alarm" : "online",
      value: currentPressure,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 4,
      name: t("monitoring:pump4"),
      type: "pump",
      status: "online",
      value: 13.8,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 5,
      name: t("monitoring:temperatureSensorA"),
      type: "temperature",
      status: "online",
      value: 23.5,
      unit: "°C",
      threshold: 80.0,
    },
    {
      id: 6,
      name: t("monitoring:temperatureSensorB"),
      type: "temperature",
      status: "online",
      value: 24.2,
      unit: "°C",
      threshold: 80.0,
    },
    {
      id: 7,
      name: t("monitoring:flowMeter1"),
      type: "flow",
      status: "online",
      value: 150,
      unit: "L/min",
    },
    {
      id: 8,
      name: t("monitoring:flowMeter2"),
      type: "flow",
      status: "online",
      value: 145,
      unit: "L/min",
    },
    {
      id: 9,
      name: t("monitoring:pressureSensorA"),
      type: "pressure",
      status: "online",
      value: 12.8,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 10,
      name: t("monitoring:pressureSensorB"),
      type: "pressure",
      status: "online",
      value: 13.4,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 11,
      name: t("monitoring:pressureSensorC"),
      type: "pressure",
      status: "online",
      value: 14.0,
      unit: "bar",
      threshold: 15.0,
    },
    {
      id: 12,
      name: t("monitoring:pressureSensorD"),
      type: "pressure",
      status: "online",
      value: 13.1,
      unit: "bar",
      threshold: 15.0,
    },
  ];

  const selectedEquipment = allEquipment.find(
    (e) => e.id === selectedEquipmentId
  );

  // Generate history data for selected equipment
  const getHistoryData = (equipmentId: number) => {
    if (equipmentId === 3) {
      return pressureHistory.map((item) => ({
        time: item.time,
        value: item.pressure,
      }));
    }

    // Generate mock data for other equipment
    const equipment = allEquipment.find((e) => e.id === equipmentId);
    if (!equipment) return [];

    const baseValue = equipment.value;
    return [
      { time: "09:45", value: baseValue - 0.5 },
      { time: "10:00", value: baseValue - 0.3 },
      { time: "10:15", value: baseValue - 0.2 },
      { time: "10:30", value: baseValue - 0.1 },
      { time: "10:45", value: baseValue },
    ];
  };

  const getAdditionalParams = (equipmentId: number) => {
    if (equipmentId === 3) {
      return [
        {
          label: t("monitoring:valveAdjustment").split(" ")[1], // "밸브 V-102"
          value: valvePosition.toString(),
          unit: "%",
        },
      ];
    }
    return [];
  };

  const getAIRecommendation = (equipmentId: number) => {
    if (equipmentId === 3 && isAlarmActive) {
      return {
        priority: "high" as const,
        steps: [
          {
            step: 1,
            title: t("monitoring:pressureAnalysis"),
            description: t("monitoring:pressureAnalysisDescription"),
            completed: true,
          },
          {
            step: 2,
            title: t("monitoring:valveAdjustment"),
            description: t("monitoring:valveAdjustmentDescription"),
            completed: valvePosition === 50,
          },
          {
            step: 3,
            title: t("monitoring:pressureStabilization"),
            description: t("monitoring:pressureStabilizationDescription"),
            completed: false,
          },
          {
            step: 4,
            title: t("monitoring:reportGeneration"),
            description: t("monitoring:reportGenerationDescription"),
            completed: false,
          },
        ],
      };
    }
    return undefined;
  };

  const filteredEquipment = allEquipment.filter((e) => {
    const matchesSearch = e.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "alarm"
        ? e.status === "alarm"
        : e.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filterButtons = [
    { label: t("monitoring:allFilter"), value: "all", count: allEquipment.length },
    {
      label: t("monitoring:warningFilter"),
      value: "alarm",
      count: allEquipment.filter((e) => e.status === "alarm").length,
    },
    {
      label: t("monitoring:pumpFilter"),
      value: "pump",
      count: allEquipment.filter((e) => e.type === "pump").length,
    },
    {
      label: t("monitoring:temperatureFilter"),
      value: "temperature",
      count: allEquipment.filter((e) => e.type === "temperature").length,
    },
    {
      label: t("monitoring:flowFilter"),
      value: "flow",
      count: allEquipment.filter((e) => e.type === "flow").length,
    },
    {
      label: t("monitoring:pressureFilter"),
      value: "pressure",
      count: allEquipment.filter((e) => e.type === "pressure").length,
    },
  ];

  return (
    <div className="space-y-2">
      {/* Search & Filter Header */}
      <div
        // ref={headerRef}
        className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800"
      >
        <div className="flex items-center justify-between mb-2">
          {/* className={`flex items-center justify-between mb-2 ${
            isSticky ? "pt-12" : ""
          }`} */}
          <h2 className="text-slate-300 font-semibold">{t("monitoring:allFilter")} {t("common:equipmentType")}</h2>
          <span className="text-sm text-slate-500 font-medium tracking-tighter">
            {filteredEquipment.length}개
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t("common:searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8  py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pt-2 pb-4">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterType(btn.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filterType === btn.value
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {btn.value === "alarm" ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Filter className="w-3 h-3" />
              )}
              <span>{btn.label}</span>
              <span
                className={`text-xs ${
                  filterType === btn.value ? "text-blue-200" : "text-slate-500"
                }`}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Cards */}
      <div className="space-y-2">
        {filteredEquipment.length > 0 ? (
          filteredEquipment.map((equipment) => (
            <EquipmentCardWithDetail
              key={equipment.id}
              equipment={equipment}
              isExpanded={selectedEquipmentId === equipment.id}
              onToggle={() =>
                setSelectedEquipmentId(
                  selectedEquipmentId === equipment.id ? null : equipment.id
                )
              }
              historyData={getHistoryData(equipment.id)}
              additionalParams={getAdditionalParams(equipment.id)}
              aiRecommendation={getAIRecommendation(equipment.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t("common:noResults")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
