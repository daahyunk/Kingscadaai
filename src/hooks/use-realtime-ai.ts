import { useRef, useState, useCallback } from "react";

export interface RealtimeMessageCallback {
  onUserMessage?: (text: string) => void;
  onAIMessage?: (text: string) => void;
}

export function useRealtimeAI() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageCallbackRef = useRef<RealtimeMessageCallback>({});
  const currentResponseRef = useRef<string>("");

  async function startCall(
    lang: string = "ko",
    callbacks?: RealtimeMessageCallback,
    equipmentState?: Record<string, number>
  ) {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);

    try {
      // Store message callbacks
      if (callbacks) {
        messageCallbackRef.current = callbacks;
      }
      currentResponseRef.current = "";

      console.log(`[Realtime] Starting call for language: ${lang}`, equipmentState);

      const audioContext = new AudioContext();
      await audioContext.resume();
      console.log("[Realtime] AudioContext resumed ✅");

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        console.log(
          "[Realtime] Waiting 1.5s for audio pipeline stabilization..."
        );
        await new Promise((r) => setTimeout(r, 1500));
      }

      const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();

      // Build query parameters with all equipment status
      const params = new URLSearchParams();
      if (equipmentState) {
        Object.entries(equipmentState).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const sessionUrl = `${API_BASE_URL}/api/session/${lang}${params.toString() ? `?${params.toString()}` : ""}`;
      console.log("[Realtime] Fetching session from:", sessionUrl, "with params:", Object.fromEntries(params));
      const tokenRes = await fetch(sessionUrl);
      const data = await tokenRes.json();
      const EPHEMERAL_KEY: string | undefined = data?.client_secret?.value;

      if (!EPHEMERAL_KEY)
        throw new Error("No ephemeral key received from server");

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });

      peerRef.current = pc;

      const audio = new Audio();
      audio.autoplay = true;
      audio.volume = 0.9;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          audio.srcObject = stream;
          audio
            .play()
            .catch((e) => console.warn("[Realtime] Audio play failed:", e));
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[Realtime] Connection state:", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          endCall();
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const ch = pc.createDataChannel("response");
      channelRef.current = ch;

      ch.onopen = () => {
        console.log("[Realtime] Data channel open ✅");
        ch.send(JSON.stringify({ type: "response.create" }));
      };

      ch.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          // 모든 이벤트 로깅
          // console.log("[Realtime] onmessage received:", msg.type);

          // response.audio_transcript.delta - AI 응답 텍스트 스트리밍
          if (msg.type === "response.audio_transcript.delta") {
            if (msg.delta) {
              currentResponseRef.current += msg.delta;
              console.log("[Realtime] AI response chunk:", msg.delta);
            }
          }

          // response.audio_transcript.done - 응답 완료
          if (msg.type === "response.audio_transcript.done") {
            console.log("[Realtime] response.audio_transcript.done - full text:", currentResponseRef.current);
            if (currentResponseRef.current && messageCallbackRef.current.onAIMessage) {
              console.log("[Realtime] Calling onAIMessage with:", currentResponseRef.current);
              messageCallbackRef.current.onAIMessage(currentResponseRef.current);
              currentResponseRef.current = "";
            }
          }

          // 사용자 음성 변환 완료 (Whisper STT)
          if (msg.type === "conversation.item.input_audio_transcription.completed") {
            console.log("[Realtime] ✅ conversation.item.input_audio_transcription.completed event!", msg);
            const userText = msg.transcript;
            console.log("[Realtime] User speech text:", userText);
            console.log("[Realtime] Text trimmed:", userText?.trim());
            console.log("[Realtime] onUserMessage callback available:", !!messageCallbackRef.current.onUserMessage);

            if (userText?.trim() && messageCallbackRef.current.onUserMessage) {
              console.log("[Realtime] 🎤 Calling onUserMessage with:", userText);
              messageCallbackRef.current.onUserMessage(userText);
            } else {
              console.log("[Realtime] ❌ Not calling onUserMessage - text empty or callback missing");
            }
          }
        } catch (error) {
          console.error("[Realtime] Data channel message error:", error);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      const model = "gpt-4o-realtime-preview-2025-06-03";

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      const answerSdp = await sdpResponse.text();

      // ✅ 타입 오류 해결
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: answerSdp,
      };

      await pc.setRemoteDescription(answer);
      setIsConnected(true);

      console.log("[Realtime] ✅ Connected successfully");
    } catch (error) {
      console.error("[Realtime] startCall error:", error);
      endCall();
    } finally {
      setIsConnecting(false);
    }
  }

  function endCall() {
    console.log("[Realtime] Ending call…");

    try {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.getSenders().forEach((s) => s.track?.stop());
        peerRef.current.close();
        peerRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("[Realtime] endCall cleanup error:", err);
    }

    setIsConnected(false);
    setIsConnecting(false);
  }

  return { startCall, endCall, isConnecting, isConnected };
}

function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });
}
