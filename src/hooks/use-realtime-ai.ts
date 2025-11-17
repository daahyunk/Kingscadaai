// ------------------------------------------
// KingSCADA AI — 극안정화 버전 useRealtimeAI
//  - STT 항상 수신하지만, 실제로는 "사람이 말한 문장"만 통과
//  - 시작 1초 무조건 버리기
//  - Silence Gate (호흡/키보드/바람/짧은 음절 → 무시)
//  - AI 말하는 동안 STT 자동 차단
//  - AI 에코 차단 + 추임새 필터
// ------------------------------------------

import { useRef, useState } from "react";

export type Lang = "ko" | "en" | "zh";

export interface RealtimeMessageCallback {
  onUserMessage?: (text: string) => void;
  onAIMessage?: (text: string) => void;
  onEquipmentDetail?: (equipmentId: string) => void;
}

export function useRealtimeAI() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messageCallbackRef = useRef<RealtimeMessageCallback>({});
  const currentResponseRef = useRef("");
  const lastAssistantTextRef = useRef("");

  // ⭐ 콜 시작 시간
  const callStartTimeRef = useRef<number>(0);

  // ⭐ AI가 말하는 중인지 여부
  const isAssistantSpeakingRef = useRef(false);

  // ----------------------------------------------------
  // Silence Gate — 짧은 잡음/모음/자음/호흡 무조건 제거
  // ----------------------------------------------------
  function isSilence(text: string): boolean {
    if (!text) return true;

    // 1글자 또는 2글자 → 대부분 잡음
    if (text.length <= 2) return true;

    // 자음/모음 연속
    if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(text)) return true;

    // 영어 1~2글자
    if (/^[a-zA-Z]{1,2}$/.test(text)) return true;

    // Whisper 고질 hallucination
    if (
      text.includes("MBC") ||
      text.includes("뉴스") ||
      text.includes("이덕영")
    )
      return true;

    return false;
  }

  // ----------------------------------------------------
  // 사람이 실제 말한 문장인지 검사하는 강력 필터
  // ----------------------------------------------------
  function isHumanSpeech(text: string): boolean {
    if (!text) return false;

    // 기본 길이 조건
    if (text.length < 3) return false;

    // 자음/모음만 → 잡음
    if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(text)) return false;

    // 영어 잡음
    if (/^[a-zA-Z]{1,2}$/.test(text)) return false;

    // bye/thankyou 등 STT 환각
    if (/^(bye|byebye|thank|thankyou)$/i.test(text)) return false;

    // 자연어 포함 시 → 사람 발화로 인정
    if (/[가-힣]/.test(text)) return true;
    if (/[a-zA-Z]/.test(text)) return true;

    return false;
  }

  // ----------------------------------------------------
  // 기존 에코/추임새 필터
  // ----------------------------------------------------
  function shouldIgnoreTranscript(
    transcript: string,
    lastAssistantText: string
  ) {
    const t = transcript.trim();
    if (!t) return true;

    // 추임새
    const noiseWords = ["음", "어", "아"];
    if (noiseWords.includes(t)) return true;

    // AI 직전 발화와 유사하면 에코
    if (lastAssistantText) {
      const normA = lastAssistantText.replace(/\s+/g, "");
      const normT = t.replace(/\s+/g, "");

      if (!normT) return true;

      if (
        normA.includes(normT) ||
        normT.includes(normA.slice(0, Math.max(5, Math.min(30, normA.length))))
      ) {
        return true;
      }
    }

    return false;
  }

  // ----------------------------------------------------
  // startCall
  // ----------------------------------------------------
  async function startCall(
    lang: Lang = "ko",
    callbacks?: RealtimeMessageCallback,
    equipmentState?: Record<string, number>
  ) {
    if (isConnecting || isConnected) return;

    messageCallbackRef.current = callbacks || {};
    currentResponseRef.current = "";
    lastAssistantTextRef.current = "";
    callStartTimeRef.current = Date.now();
    isAssistantSpeakingRef.current = false;

    setIsConnecting(true);
    console.log("[Realtime] startCall");

    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();
      if (!API_BASE_URL) throw new Error("VITE_API_URL not set");

      // ------------------- 세션 발급 -------------------
      const params = new URLSearchParams();
      if (equipmentState) {
        for (const [k, v] of Object.entries(equipmentState)) {
          params.append(k, String(v));
        }
      }

      const sessionUrl = `${API_BASE_URL}/api/session/${lang}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const sessionRes = await fetch(sessionUrl);
      const sessionData = await sessionRes.json();
      const EPHEMERAL_KEY = sessionData?.client_secret?.value;
      if (!EPHEMERAL_KEY) throw new Error("No ephemeral key");

      // ------------------- 마이크 -------------------
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // 🟢 autoGain 끄기 = 환각 줄어듦
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // ------------------- Peer -------------------
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // ------------------- AI 음성 수신 -------------------
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (e) => {
        const [remoteStream] = e.streams;
        if (remoteStream) audio.srcObject = remoteStream;
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          endCall();
        }
      };

      // ------------------- DataChannel -------------------
      const channel = pc.createDataChannel("response");
      channelRef.current = channel;

      channel.onopen = () => {
        channel.send(JSON.stringify({ type: "response.create" }));
      };

      channel.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          // ---------------- AI 음성 → delta ----------------
          if (msg.type === "response.audio.delta") {
            isAssistantSpeakingRef.current = true;
          }

          // ---------------- AI 음성 → done ----------------
          if (msg.type === "response.audio.done") {
            setTimeout(() => {
              isAssistantSpeakingRef.current = false;
            }, 150);
          }

          // ---------------- AI 텍스트 ----------------
          if (msg.type === "response.audio_transcript.delta") {
            currentResponseRef.current += msg.delta ?? "";
          }

          if (msg.type === "response.audio_transcript.done") {
            const full = currentResponseRef.current.trim();
            currentResponseRef.current = "";

            if (!full) return;

            const match = full.match(/\[EQUIPMENT_DETAIL:(\w+)\]/);
            const equipId = match?.[1] || null;
            const clean = full.replace(/\[EQUIPMENT_DETAIL:\w+\]/g, "").trim();

            lastAssistantTextRef.current = clean;
            messageCallbackRef.current.onAIMessage?.(clean);
            if (equipId)
              messageCallbackRef.current.onEquipmentDetail?.(equipId);
          }

          // ---------------- 사용자 STT ----------------
          if (
            msg.type === "conversation.item.input_audio_transcription.completed"
          ) {
            const text = msg.transcript?.trim();
            if (!text) return;

            // ① 첫 1초 무시
            if (Date.now() - callStartTimeRef.current < 1000) {
              return;
            }

            // ② AI 말할 때 무조건 차단
            if (isAssistantSpeakingRef.current) {
              return;
            }

            // ③ Silence Gate
            if (isSilence(text)) {
              return;
            }

            // ④ 자연어(사람 발화) 검증
            if (!isHumanSpeech(text)) {
              return;
            }

            // ⑤ 에코/추임새
            if (shouldIgnoreTranscript(text, lastAssistantTextRef.current)) {
              return;
            }

            // ---------------- 최종 통과 ----------------
            messageCallbackRef.current.onUserMessage?.(text);
          }
        } catch (e) {
          console.error("onmessage parse error", e);
        }
      };

      // ------------------- SDP -------------------
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp || "",
        }
      );

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      console.error("startCall error", err);
      endCall();
    } finally {
      setIsConnecting(false);
    }
  }

  // ----------------------------------------------------
  // endCall
  // ----------------------------------------------------
  function endCall() {
    try {
      channelRef.current?.close();
      peerRef.current?.getSenders().forEach((s) => s.track?.stop());
      peerRef.current?.close();

      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.srcObject = null;

      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}

    channelRef.current = null;
    peerRef.current = null;
    audioRef.current = null;
    streamRef.current = null;

    setIsConnected(false);
    setIsConnecting(false);
  }

  return { startCall, endCall, isConnecting, isConnected };
}
