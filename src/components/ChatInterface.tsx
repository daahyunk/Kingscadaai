import { Message } from "../App";
import { Bot, User, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EquipmentCardWithDetail } from "./EquipmentCardWithDetail";
import { useState, useEffect } from "react";

interface ChatInterfaceProps {
  messages: Message[];
  equipmentStatus?: Record<string, number>;
  equipmentInfo?: any;
  pressureHistory?: Array<{ time: string; pressure: number }>;
}

export function ChatInterface({
  messages,
  equipmentStatus = {},
  equipmentInfo,
  pressureHistory = [],
}: ChatInterfaceProps) {
  const { t, i18n } = useTranslation(["chat", "common"]);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(
    null
  );

  // i18n 언어 코드를 locale 형식으로 변환
  const getLocale = () => {
    const langMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      zh: "zh-CN",
    };
    return langMap[i18n.language] || "ko-KR";
  };


  // 장비 ID를 기반으로 장비 정보 조회
  const getEquipmentInfo = (equipmentId: string) => {
    if (!equipmentInfo || !equipmentInfo.equipment) return null;
    return equipmentInfo.equipment.find(
      (eq: any) => eq.id === equipmentId
    );
  };

  // 장비 타입 매핑
  const getEquipmentType = (
    equipmentId: string
  ): "pump" | "temperature" | "flow" | "pressure" => {
    if (equipmentId.includes("pump")) return "pump";
    if (equipmentId.includes("temperature") || equipmentId.includes("Temperature"))
      return "temperature";
    if (equipmentId.includes("flow") || equipmentId.includes("Flow"))
      return "flow";
    return "pressure";
  };

  // 장비 상태 결정
  const getEquipmentStatus = (
    equipmentId: string,
    value: number,
    threshold?: number
  ): "online" | "alarm" | "offline" => {
    if (value === undefined || value === null) return "offline";
    if (threshold && value > threshold) return "alarm";
    return "online";
  };

  return (
    <div className="space-y-3">
      <h2 className="text-slate-300 flex items-center gap-2 text-sm mb-4">
        <Bot className="w-5 h-5" />
        {t("common:chatHistory")}
      </h2>

      <div className="space-y-4">
        {messages.map((message) => {
          // equipmentDetailId가 있는 메시지에서 카드 렌더링
          if (message.equipmentDetailId) {
            const equipInfo = getEquipmentInfo(message.equipmentDetailId);
            if (equipInfo) {
              const currentValue =
                equipmentStatus[message.equipmentDetailId] ||
                equipInfo.normalRange.max;
              const equipmentType = getEquipmentType(message.equipmentDetailId);
              const status = getEquipmentStatus(
                message.equipmentDetailId,
                currentValue,
                equipInfo.normalRange.max
              );

              // 장비 타입에 따라 추가 파라미터 설정
              const additionalParams = [];
              if (
                message.equipmentDetailId.includes("pump") &&
                equipmentStatus.valvePosition
              ) {
                additionalParams.push({
                  label: t("monitoring:valveAdjustment") || "Valve Position",
                  value: equipmentStatus.valvePosition.toString(),
                  unit: "%",
                });
              }

              // 장비별 히스토리 데이터 준비
              let historyData: Array<{ time: string; value: number }> = [];
              if (equipmentType === "pump" && pressureHistory.length > 0) {
                historyData = pressureHistory.map((item) => ({
                  time: item.time,
                  value: item.pressure,
                }));
              }

              // 히스토리가 없으면 현재값으로 기본 데이터 생성
              if (historyData.length === 0) {
                historyData = [
                  {
                    time: "Now",
                    value: currentValue,
                  },
                ];
              }

              return (
                <div
                  key={message.id}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                    <Bot className="w-4 h-4" />
                  </div>

                  <div className="flex-1">
                    {/* AI 응답 텍스트 */}
                    {message.content && (
                      <div className="inline-block max-w-[85%] rounded-lg px-4 py-2.5 bg-slate-800 text-slate-200 mb-3">
                        <p className="whitespace-pre-wrap text-sm">
                          {message.translationKey
                            ? t(message.translationKey, message.translationParams)
                            : message.content}
                        </p>
                      </div>
                    )}

                    {/* 안내 팁 */}
                    <p className="text-xs text-slate-400 mb-2 px-1">
                      💡 카드를 클릭하면 자세한 정보를 확인할 수 있습니다.
                    </p>

                    {/* 장비 카드 - 말풍선 스타일 */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-hidden">
                      <EquipmentCardWithDetail
                        equipment={{
                          id: 1,
                          name:
                            equipInfo.names[i18n.language] ||
                            equipInfo.names.ko,
                          type: equipmentType,
                          status,
                          value: currentValue,
                          unit: equipInfo.unit,
                          threshold: equipInfo.normalRange.max,
                        }}
                        isExpanded={expandedEquipment === message.equipmentDetailId}
                        onToggle={() =>
                          setExpandedEquipment(
                            expandedEquipment === message.equipmentDetailId
                              ? null
                              : message.equipmentDetailId
                          )
                        }
                        historyData={historyData}
                        additionalParams={
                          additionalParams.length > 0
                            ? additionalParams
                            : undefined
                        }
                      />
                    </div>

                    <p className="text-xs text-slate-500 mt-1 px-1">
                      {message.timestamp.toLocaleTimeString(getLocale(), {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            }
          }

          // 일반 메시지 렌더링
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === "user"
                    ? "bg-blue-600"
                    : message.type === "alert"
                    ? "bg-red-600"
                    : "bg-slate-700"
                }`}
              >
                {message.type === "user" ? (
                  <User className="w-4 h-4" />
                ) : message.type === "alert" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div
                className={`flex-1 ${
                  message.type === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block max-w-[85%] rounded-lg px-4 py-2.5 ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : message.type === "alert"
                      ? "bg-red-600/20 text-red-300 border border-red-600/30"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">
                    {message.translationKey
                      ? t(message.translationKey, message.translationParams)
                      : message.content}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString(getLocale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
