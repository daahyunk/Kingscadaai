// ------------------------------------------
// KingSCADA AI — 안정화 버전 useRealtimeAI
//  - STT 항상 수신
//  - AI가 자기 말 듣고 반복하는 에코 최소화 (텍스트 기반 필터)
//  - 사용자는 언제든 끼어들어서 말 가능
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
  const lastAssistantTextRef = useRef(""); // 마지막 AI 발화 텍스트

  // --------------------------
  // 텍스트 기반 STT 필터
  // --------------------------
  function shouldIgnoreTranscript(
    transcript: string,
    lastAssistantText: string
  ): boolean {
    const t = transcript.trim();
    if (!t) return true;

    // 1) 너무 짧은 의미 없는 추임새(노이즈)
    const noiseWords = ["음", "어", "아"];
    if (noiseWords.includes(t)) {
      return true;
    }

    // 2) AI가 방금 말한 문장과 거의 같은 경우 (에코 방지)
    if (lastAssistantText) {
      const normA = lastAssistantText.replace(/\s+/g, "");
      const normT = t.replace(/\s+/g, "");
      if (!normT) return true;

      // transcript가 AI 발화의 일부거나 거의 동일하다면 에코로 판단
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

    // 콜백/상태 초기화
    messageCallbackRef.current = callbacks || {};
    currentResponseRef.current = "";
    lastAssistantTextRef.current = "";
    setIsConnecting(true);

    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();
      if (!API_BASE_URL) {
        throw new Error("VITE_API_URL is not set");
      }

      // -----------------------
      // 1. 서버에서 Realtime Session 발급
      // -----------------------
      const params = new URLSearchParams();
      if (equipmentState) {
        for (const [k, v] of Object.entries(equipmentState)) {
          if (v !== undefined && v !== null) {
            params.append(k, String(v));
          }
        }
      }

      const sessionUrl = `${API_BASE_URL}/api/session/${lang}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      console.log("[Realtime] Fetching session:", sessionUrl);

      const sessionRes = await fetch(sessionUrl);
      if (!sessionRes.ok) {
        const text = await sessionRes.text();
        throw new Error(`Session fetch failed: ${sessionRes.status} ${text}`);
      }

      const sessionData = await sessionRes.json();
      const EPHEMERAL_KEY = sessionData?.client_secret?.value as
        | string
        | undefined;

      if (!EPHEMERAL_KEY) {
        throw new Error("No ephemeral key received from /api/session");
      }

      // -----------------------
      // 2. 마이크 스트림 준비
      // -----------------------
      console.log("[Realtime] Requesting microphone…");

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
      console.log("[Realtime] Microphone granted ✅");

      // -----------------------
      // 3. PeerConnection 생성
      // -----------------------
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });
      peerRef.current = pc;

      // 마이크 트랙 추가
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // -----------------------
      // 4. 오디오 수신 (AI 음성 출력)
      // -----------------------
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        console.log("[Realtime] ontrack: audio stream received");
        const [remoteStream] = event.streams;
        if (remoteStream) {
          audio.srcObject = remoteStream;
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[Realtime] Connection state:", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          endCall();
        }
      };

      // -----------------------
      // 5. DataChannel 생성
      // -----------------------
      const channel = pc.createDataChannel("response");
      channelRef.current = channel;

      channel.onopen = () => {
        console.log("[Realtime] Data channel open ✅");
        // 첫 응답 생성 트리거
        channel.send(JSON.stringify({ type: "response.create" }));
      };

      channel.onclose = () => {
        console.log("[Realtime] Data channel closed");
      };

      channel.onerror = (err) => {
        console.error("[Realtime] Data channel error:", err);
      };

      channel.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          // ----------------------------------
          // ① AI 음성 → 텍스트 스트리밍
          // ----------------------------------
          if (msg.type === "response.audio_transcript.delta") {
            if (msg.delta) {
              currentResponseRef.current += msg.delta;
            }
          }

          if (msg.type === "response.audio_transcript.done") {
            const full = currentResponseRef.current.trim();
            currentResponseRef.current = "";

            if (!full) return;

            // [EQUIPMENT_DETAIL:xxx] 추출
            const match = full.match(/\[EQUIPMENT_DETAIL:(\w+)\]/);
            const equipId = match?.[1] || null;
            const clean = full
              .replace(/\[EQUIPMENT_DETAIL:\w+\]/g, "")
              .trim();

            lastAssistantTextRef.current = clean;

            console.log("[Realtime] AI final text:", clean);

            // UI에 AI 답변 전달
            messageCallbackRef.current.onAIMessage?.(clean);

            // UI에 장비 상세 카드 트리거
            if (equipId) {
              messageCallbackRef.current.onEquipmentDetail?.(equipId);
            }
          }

          // ----------------------------------
          // ② 사용자 음성 → 텍스트 (Whisper)
          // ----------------------------------
          if (
            msg.type === "conversation.item.input_audio_transcription.completed"
          ) {
            const raw = msg.transcript as string | undefined;
            const text = raw?.trim();
            if (!text) return;

            // 텍스트 기반 필터 (에코/노이즈 제거)
            const ignore = shouldIgnoreTranscript(
              text,
              lastAssistantTextRef.current
            );
            if (ignore) {
              console.log("[Realtime] Ignore STT (heuristic):", text);
              return;
            }

            console.log("[Realtime] User STT text:", text);
            messageCallbackRef.current.onUserMessage?.(text);
          }
        } catch (err) {
          console.error("[Realtime] onmessage parse error:", err);
        }
      };

      // -----------------------
      // 6. SDP Offer ↔ Answer 교환
      // -----------------------
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const model = "gpt-4o-realtime-preview-2025-06-03";

      console.log("[Realtime] Sending SDP offer to OpenAI…");

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
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      console.log("[Realtime] ✅ Connected");
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
      if (channelRef.current) {
        try {
          channelRef.current.close();
        } catch {}
        channelRef.current = null;
      }

      if (peerRef.current) {
        try {
          peerRef.current.getSenders().forEach((s) => s.track?.stop());
          peerRef.current.close();
        } catch {}
        peerRef.current = null;
      }

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.srcObject = null;
        } catch {}
        audioRef.current = null;
      }

      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        streamRef.current = null;
      }
    } catch (err) {
      console.warn("[Realtime] endCall cleanup error:", err);
    }

    setIsConnected(false);
    setIsConnecting(false);
  }

  return { startCall, endCall, isConnecting, isConnected };
}
