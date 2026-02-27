// hooks/useVoiceWebRTC.js
import { useEffect, useRef, useCallback, useState } from "react";
import { Platform, AppState } from "react-native";
import { Audio } from "expo-av";
import { Room } from "livekit-client";
import { server } from "../server";

const DEBUG = process.env.NODE_ENV === "development";

const log = (level, ...args) => {
  if (DEBUG || level === "error") console[level](...args);
};

export function useVoiceWebRTC({
  instanceId,
  enabled = true,
  localUserId, // kept for API shape; not used to reconnect
  token,
  onRemoteTrack,
  onSpeakingChange,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [outputMuted, setOutputMuted] = useState(false);

  const roomRef = useRef(null);
  const lastActiveSpeakersRef = useRef(new Set());
  const wasMutedBeforeBgRef = useRef(false);

  // 🔴 FIX: Ref for isMuted to avoid stale closures in event handlers
  const isMutedRef = useRef(isMuted);
  // 🔴 FIX 2: Ref for outputMuted to avoid stale closures in track handlers
  const outputMutedRef = useRef(outputMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // 🔴 FIX 2: Update outputMuted ref when state changes
  useEffect(() => {
    outputMutedRef.current = outputMuted;

    // Update all existing audio elements when output mute toggles
    if (Platform.OS === "web" && roomRef.current) {
      const els = document.querySelectorAll('[id^="livekit-audio-"]');
      els.forEach((el) => {
        el.muted = outputMuted;
        el.volume = outputMuted ? 0 : 1;
      });

      // Also update any tracks attached via MediaStream (for non-web platforms)
      if (roomRef.current.remoteParticipants) {
        roomRef.current.remoteParticipants.forEach(participant => {
          participant.trackPublications.forEach(publication => {
            if (publication.track && publication.kind === 'audio') {
              const track = publication.track;
              if (track.attachedElements) {
                track.attachedElements.forEach(el => {
                  el.muted = outputMuted;
                  el.volume = outputMuted ? 0 : 1;
                });
              }
            }
          });
        });
      }
    }
  }, [outputMuted]);

  // ✅ Callback refs (prevents reconnect loops)
  const onRemoteTrackRef = useRef(onRemoteTrack);
  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onRemoteTrackRef.current = onRemoteTrack;
  }, [onRemoteTrack]);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  // Optional: keep for debugging / identity checks
  const localUserIdRef = useRef(localUserId);
  useEffect(() => {
    localUserIdRef.current = localUserId;
  }, [localUserId]);

  /* =====================================================
     ✅ FIX 1: Define cleanupAll FIRST (before any effect that uses it)
  ===================================================== */
  const cleanupAll = useCallback((finalDestroy = false) => {
    log("log", "🧹 [LiveKit] cleanup", finalDestroy ? "(final)" : "(temporary)");
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsMuted(false);
    setOutputMuted(false);
    lastActiveSpeakersRef.current.clear();

    // ✅ Web audio cleanup
    if (Platform.OS === "web") {
      const els = document.querySelectorAll('[id^="livekit-audio-"]');
      els.forEach((el) => {
        try {
          el.pause();
          el.srcObject = null;
          el.remove();
        } catch { }
      });
    }
  }, []);

  const initLocalAudio = useCallback(async () => {
    if (!roomRef.current) return;
    log("log", "🎤 [LiveKit] enabling microphone");

    // 🔵 OPTIONAL HARDENING: Prevent mic re-enabling after kick
    if (roomRef.current.state !== "connected") return;

    await roomRef.current.localParticipant.setMicrophoneEnabled(true);
    setIsMuted(false);
  }, []);

  const muteLocal = useCallback(
    async (muted) => {
      if (!roomRef.current) return;
      const shouldMute = typeof muted === "boolean" ? muted : !isMuted;
      log("log", shouldMute ? "🔇 [LiveKit] muting" : "🔈 [LiveKit] unmuting");

      // 🔵 OPTIONAL HARDENING: Check connection state
      if (roomRef.current.state !== "connected") return;

      await roomRef.current.localParticipant.setMicrophoneEnabled(!shouldMute);
      setIsMuted(shouldMute);
    },
    [isMuted]
  );

  /* =====================================================
     ✅ FIX 2: Output Mute Control (now uses refs for consistency)
  ===================================================== */
  const toggleOutputMute = useCallback(() => {
    const newState = !outputMuted;
    setOutputMuted(newState);

    // The effect above will handle updating all elements
    log("log", newState ? "🔇 [LiveKit] output muted" : "🔊 [LiveKit] output unmuted");
  }, [outputMuted]);

  const isPeerConnected = useCallback(() => !!roomRef.current, []);

  const ensureMicPermission = useCallback(async () => {
    if (Platform.OS === "web") return true;

    try {
      const perm = await Audio.getPermissionsAsync();
      if (perm?.granted) return true;

      const req = await Audio.requestPermissionsAsync();
      return !!req?.granted;
    } catch (e) {
      log("warn", "⚠️ Mic permission failed", e);
      return false;
    }
  }, []);

  /* =====================================================
     ✅ FIX: Move resolveLiveKitUrl OUTSIDE the effect (near ensureMicPermission)
  ===================================================== */
  const resolveLiveKitUrl = useCallback(() => {
    try {
      // server = "http://192.168.1.112:5000/api"
      const base = server.replace("/api", "");
      const url = new URL(base);

      const host = url.hostname;

      // LiveKit runs on same machine at port 7880
      return `ws://${host}:7880`;
    } catch (e) {
      log("error", "❌ Failed to resolve LiveKit URL", e);
      return "ws://192.168.1.112:7880"; // safe fallback
    }
  }, []);

  /* =====================================================
     ✅ FIX 1: Move force mute effect AFTER cleanupAll is defined
  ===================================================== */
  useEffect(() => {
    // ✅ Run ONLY on web
    if (Platform.OS !== "web") return;
    if (!enabled) return;

    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
      return;
    }

    const handleForceMute = async () => {
      if (!roomRef.current) return;
      log("log", "🔒 [LiveKit] force mute triggered");

      await roomRef.current.localParticipant.setMicrophoneEnabled(false);
      setIsMuted(true);
    };

    const handleForceUnmute = async () => {
      if (!roomRef.current) return;
      log("log", "🔓 [LiveKit] force unmute triggered");

      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
    };

    const handleTerminateRTC = () => {
      log("log", "🛑 [LiveKit] force terminate RTC");
      cleanupAll(true);
    };

    window.addEventListener("voice:force:mute", handleForceMute);
    window.addEventListener("voice:force:unmute", handleForceUnmute);
    window.addEventListener("voice:terminate:rtc", handleTerminateRTC);

    return () => {
      window.removeEventListener("voice:force:mute", handleForceMute);
      window.removeEventListener("voice:force:unmute", handleForceUnmute);
      window.removeEventListener("voice:terminate:rtc", handleTerminateRTC);
    };
  }, [enabled, cleanupAll]);

  useEffect(() => {
    if (!enabled || !instanceId || !token) {
      log("log", "⏸️ [LiveKit] connection skipped", {
        enabled,
        instanceId,
        hasToken: !!token,
      });
      return;
    }

    let cancelled = false;
    let connectTimeout;

    const connect = async () => {
      try {
        // ✅ If already connected, don't reconnect
        if (roomRef.current && roomRef.current.state === "connected") {
          log("log", "✅ [LiveKit] already connected, skipping");
          return;
        }

        log("log", "🔌 [LiveKit] fetching token from backend");

        const res = await fetch(`${server}/community/voice/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomName: instanceId }),
        });

        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);

        const data = await res.json();
        const livekitToken = data.token;

        if (cancelled) return;

        log("log", "✅ [LiveKit] token received, connecting...");

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        roomRef.current = room;

        room.on("trackSubscribed", (track, publication, participant) => {
          if (track.kind !== "audio") return;

          log("log", "🔊 [LiveKit] remote audio track subscribed", participant.identity);

          const mediaStream = new MediaStream([track.mediaStreamTrack]);

          // ✅ WEB: attach to audio element with output mute support
          if (Platform.OS === "web") {
            const audioId = `livekit-audio-${participant.identity}`;
            let audioEl = document.getElementById(audioId);

            if (!audioEl) {
              audioEl = document.createElement("audio");
              audioEl.id = audioId;
              audioEl.autoplay = true;
              audioEl.playsInline = true;
              document.body.appendChild(audioEl);
            }

            // ✅ FIX 2: Apply current output mute state using ref
            audioEl.srcObject = mediaStream;
            audioEl.muted = outputMutedRef.current;
            audioEl.volume = outputMutedRef.current ? 0 : 1;
            audioEl.play().catch((err) => {
              log("warn", "⚠️ [audio] autoplay blocked; user interaction needed", err);
            });
          }

          onRemoteTrackRef.current?.(participant.identity, mediaStream);
        });

        room.on("trackUnsubscribed", (track, publication, participant) => {
          if (track.kind !== "audio") return;

          log("log", "🔇 [LiveKit] remote audio track unsubscribed", participant.identity);

          if (Platform.OS === "web") {
            const audioId = `livekit-audio-${participant.identity}`;
            const audioEl = document.getElementById(audioId);
            if (audioEl) {
              audioEl.pause();
              audioEl.srcObject = null;
              audioEl.remove();
            }
          }
        });

        /* =====================================================
           ✅ FIX 3: Speaking Guard - Skip if muted
           Uses ref instead of state to avoid stale closure
        ===================================================== */
        room.on("activeSpeakersChanged", (speakers) => {
          const currentActive = new Set(speakers.map((p) => p.identity));

          // Process speakers who stopped speaking
          lastActiveSpeakersRef.current.forEach((id) => {
            if (!currentActive.has(id)) onSpeakingChangeRef.current?.(id, false);
          });

          // Process new speakers with mute guard
          currentActive.forEach((id) => {
            // ✅ FIX 3: Skip if this is local user and they are muted
            // Uses isMutedRef.current instead of isMuted state
            if (id === roomRef.current?.localParticipant?.identity && isMutedRef.current) return;

            if (!lastActiveSpeakersRef.current.has(id)) {
              onSpeakingChangeRef.current?.(id, true);
            }
          });

          lastActiveSpeakersRef.current = currentActive;
        });

        room.on("participantDisconnected", (participant) => {
          log("log", "👋 [LiveKit] participant left", participant.identity);

          if (lastActiveSpeakersRef.current.has(participant.identity)) {
            onSpeakingChangeRef.current?.(participant.identity, false);
            lastActiveSpeakersRef.current.delete(participant.identity);
          }

          if (Platform.OS === "web") {
            const audioId = `livekit-audio-${participant.identity}`;
            const audioEl = document.getElementById(audioId);
            if (audioEl) {
              audioEl.pause();
              audioEl.srcObject = null;
              audioEl.remove();
            }
          }
        });

        room.on("connectionStateChanged", (state) => {
          log("log", "🔌 [LiveKit] connection state:", state);
        });

        // ✅ Now this works because resolveLiveKitUrl is defined at component top level
        const LIVEKIT_URL = resolveLiveKitUrl();

        // ✅ Native mic permission + audio mode setup
        if (Platform.OS !== "web") {
          const granted = await ensureMicPermission();
          if (!granted) {
            throw new Error("Microphone permission not granted");
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
        }

        // ✅ Connect
        await room.connect(LIVEKIT_URL, livekitToken);

        if (cancelled) {
          room.disconnect();
          return;
        }

        if (room.state === "connected") {
          // 🔵 OPTIONAL HARDENING: Check if we should enable mic
          if (!wasMutedBeforeBgRef.current) {
            await room.localParticipant.setMicrophoneEnabled(true);
          }
          log("log", "✅ [LiveKit] connected and mic enabled", {
            room: instanceId,
            participant: room.localParticipant.identity,
          });
        }
      } catch (err) {
        log("error", "❌ [LiveKit] connection error:", err);
        if (!cancelled) {
          log("log", "🔄 [LiveKit] scheduling retry in 5s");
          connectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (connectTimeout) clearTimeout(connectTimeout);
      log("log", "🔌 [LiveKit] disconnecting");
      roomRef.current?.disconnect();
      roomRef.current = null;
      lastActiveSpeakersRef.current.clear();

      if (Platform.OS === "web") {
        const els = document.querySelectorAll('[id^="livekit-audio-"]');
        els.forEach((el) => {
          try {
            el.pause();
            el.srcObject = null;
            el.remove();
          } catch { }
        });
      }
    };
  }, [enabled, instanceId, token, resolveLiveKitUrl, ensureMicPermission]); // ✅ Added resolveLiveKitUrl and ensureMicPermission to deps

  // App state mute restore (fine)
  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextState) => {
      if (!roomRef.current) return;

      if (nextState === "background" || nextState === "inactive") {
        log("log", "📱 [app] backgrounded - saving mute state");
        wasMutedBeforeBgRef.current = isMuted;
        roomRef.current.localParticipant.setMicrophoneEnabled(false);
      }

      if (nextState === "active") {
        log("log", "📱 [app] foregrounded - restoring mute state");
        if (!wasMutedBeforeBgRef.current) {
          roomRef.current.localParticipant.setMicrophoneEnabled(true);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [enabled, isMuted]);

  // Mobile audio mode (fine)
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === "web") return;

    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(console.warn);
  }, [enabled]);

  return {
    initLocalAudio,
    muteLocal,
    isMuted,
    toggleOutputMute,    // ✅ Expose output mute toggle
    outputMuted,         // ✅ Expose output mute state
    cleanup: cleanupAll,
    isPeerConnected,
    getPeers: () => {
      if (!roomRef.current) return [];
      return Array.from(roomRef.current.participants.values()).map((p) => p.identity);
    },
  };
}