import { useState, useRef } from "react";
import { Mic, Send, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

interface VoiceInputProps {
  onVoiceCommand: (command: string) => void;
}

export function VoiceInput({ onVoiceCommand }: VoiceInputProps) {
  const { t } = useTranslation('chat');
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickCommands = [
    t('quickCommand1'),
    t('quickCommand2'),
    t('quickCommand3'),
    t('quickCommand4'),
  ];

  const handleMicClick = () => {
    setIsListening(!isListening);

    if (!isListening) {
      // Simulate voice recognition
      setTimeout(() => {
        setIsListening(false);
        // This would be replaced with actual voice recognition
      }, 2000);
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onVoiceCommand(inputValue);
      setInputValue("");
      setShowQuickCommands(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    onVoiceCommand(command);
    setShowQuickCommands(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Quick Commands Overlay */}
      {showQuickCommands && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setShowQuickCommands(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 px-4 py-4 max-w-6xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 text-slate-300 mb-3">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">{t('common:voiceCommands')}</span>
              </div>
              <div className="space-y-2">
                {quickCommands.map((command, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickCommand(command)}
                    className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-sm transition-colors border border-slate-700"
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-4 z-30">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowQuickCommands(!showQuickCommands)}
              variant="outline"
              size="icon"
              className="flex-shrink-0 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('common:inputPlaceholder')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                style={{ fontSize: '16px' }}
              />
            </div>

            <Button
              onClick={handleMicClick}
              size="icon"
              className={`flex-shrink-0 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              <Mic
                className={`w-5 h-5 ${isListening ? "animate-pulse" : ""}`}
              />
            </Button>

            <Button
              onClick={handleSend}
              size="icon"
              className="flex-shrink-0 bg-slate-700 hover:bg-slate-600"
              disabled={!inputValue.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {isListening && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/30 text-red-400 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">{t('common:voiceRecognizing')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
