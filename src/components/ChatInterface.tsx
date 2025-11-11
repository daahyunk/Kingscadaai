import { Message } from "../App";
import { Bot, User, AlertTriangle } from "lucide-react";

interface ChatInterfaceProps {
  messages: Message[];
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-slate-300 flex items-center gap-2 text-sm mb-4">
        <Bot className="w-5 h-5" />
        대화 내역
      </h2>

      <div className="space-y-3">
        {messages.map((message) => (
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
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 px-1">
                {message.timestamp.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
