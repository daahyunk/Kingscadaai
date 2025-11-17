// ------------------------------------------
// KingSCADA AI — 안정화 버전 useRealtimeAI
//  - STT 항상 수신
//  - 시작 1초 무조건 버리기 (초기 환각 제거)
//  - Silence Gate (극저음/호흡/바람 → 무시)
//  - AI가 자기 말 듣고 반복하는 에코 최소화
//  - 끼어들기(바로 말하기) 지원
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

  // ⭐ NEW: 콜 시작 시간
  const callStartTimeRef = useRef<number>(0);

  // --------------------------
  // Silence Gate (무음·잡음 필터)
  // --------------------------
  function isSilence(text: string): boolean {
    if (!text) return true;

    // 너무 짧은 문자(1~2글자) → 대부분 노이즈
    if (text.length <= 1) return true;

    // 한 단어 + 자음 비율 높은 경우
    if (/^[a-zA-Z]{1,2}$/.test(text)) return true;

    // 유명한 hallucination 패턴
    if (
      text.includes("MBC") ||
      text.includes("뉴스") ||
      text.includes("이덕영")
    )
      return true;

    return false;
  }

  // --------------------------
  // 텍스트 기반 STT 필터 (기존)
  // --------------------------
  function shouldIgnoreTranscript(
    transcript: string,
    lastAssistantText: string
  ): boolean {
    const t = transcript.trim();
    if (!t) return true;

    // 1) 추임새
    const noiseWords = ["음", "어", "아"];
    if (noiseWords.includes(t)) return true;

    // 2) AI 에코 방지
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

  // --------------------------
  // startCall
  // --------------------------
  async function startCall(
    lang: Lang = "ko",
    callbacks?: RealtimeMessageCallback,
    equipmentState?: Record<string, number>
  ) {
    if (isConnecting || isConnected) return;

    console.log("[Realtime] ✅ startCall()", { lang, equipmentState });

    // 콜백 초기화
    messageCallbackRef.current = callbacks || {};
    currentResponseRef.current = "";
    lastAssistantTextRef.current = "";
    callStartTimeRef.current = Date.now(); // ⭐ 1초 무시 시작
    console.log("[Realtime] ⏳ Ignoring STT for first 1000ms");

    setIsConnecting(true);

    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();
      if (!API_BASE_URL) throw new Error("VITE_API_URL is not set");

      // -----------------------
      // 1. Realtime Session 발급
      // -----------------------
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
      if (!sessionRes.ok)
        throw new Error(
          `Session fetch failed: ${
            sessionRes.status
          } ${await sessionRes.text()}`
        );

      const sessionData = await sessionRes.json();
      const EPHEMERAL_KEY = sessionData?.client_secret?.value;
      if (!EPHEMERAL_KEY)
        throw new Error("No ephemeral key received from /api/session");

      // -----------------------
      // 2. 마이크 스트림
      // -----------------------
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // -----------------------
      // 3. PeerConnection
      // -----------------------
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. 수신 오디오
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) audio.srcObject = remoteStream;
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          endCall();
        }
      };

      // -----------------------
      // 5. DataChannel
      // -----------------------
      const channel = pc.createDataChannel("response");
      channelRef.current = channel;

      channel.onopen = () => {
        channel.send(JSON.stringify({ type: "response.create" }));
      };

      channel.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          // 🔹 AI 음성 → 텍스트 델타
          if (msg.type === "response.audio_transcript.delta") {
            currentResponseRef.current += msg.delta ?? "";
          }

          // 🔹 AI 음성 → 최종 텍스트
          if (msg.type === "response.audio_transcript.done") {
            const full = currentResponseRef.current.trim();
            currentResponseRef.current = "";
            if (!full) return;

            const match = full.match(/\[EQUIPMENT_DETAIL:(\w+)\]/);
            const equipId = match?.[1] ?? null;

            const clean = full.replace(/\[EQUIPMENT_DETAIL:\w+\]/g, "").trim();
            lastAssistantTextRef.current = clean;

            messageCallbackRef.current.onAIMessage?.(clean);
            if (equipId)
              messageCallbackRef.current.onEquipmentDetail?.(equipId);
          }

          // 🔹 사용자 STT
          if (
            msg.type === "conversation.item.input_audio_transcription.completed"
          ) {
            const text = msg.transcript?.trim();
            if (!text) return;

            // ⭐ 1) 첫 1초 무조건 무시
            const elapsed = Date.now() - callStartTimeRef.current;
            if (elapsed < 1000) {
              console.log("[STT] ⏱ Ignored (first 1s):", text);
              return;
            }

            // ⭐ 2) Silence Gate
            if (isSilence(text)) {
              console.log("[STT] ❌ Ignored (silence/noise):", text);
              return;
            }

            // ⭐ 3) 에코/추임새 필터
            if (shouldIgnoreTranscript(text, lastAssistantTextRef.current)) {
              console.log("[STT] ❌ Ignored (heuristic):", text);
              return;
            }

            // 최종 통과
            console.log("[STT] 🎤 User:", text);
            messageCallbackRef.current.onUserMessage?.(text);
          }
        } catch (err) {
          console.error("[Realtime] onmessage parse error:", err);
        }
      };

      // -----------------------
      // 6. SDP Offer ↔ Answer
      // -----------------------
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const model = "gpt-4o-realtime-preview-2025-06-03";

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp ?? "",
        }
      );

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      console.error("[Realtime] startCall error:", err);
      endCall();
    } finally {
      setIsConnecting(false);
    }
  }

  // --------------------------
  // endCall
  // --------------------------
  function endCall() {
    console.log("[Realtime] 🔻 endCall()");

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
