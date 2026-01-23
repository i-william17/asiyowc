import { useEffect, useRef, useCallback, useMemo } from "react";
import { Platform, AppState } from "react-native";
import { Audio } from "expo-av";
import { getSocket } from "../services/socket";

/* =====================================================
   🌍 CROSS-PLATFORM WEBRTC ADAPTER
===================================================== */

let RTCPeerConnection;
let RTCIceCandidate;
let RTCSessionDescription;
let mediaDevices;

if (Platform.OS === "web") {
    // Browser WebRTC
    RTCPeerConnection = window.RTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription;
    mediaDevices = navigator.mediaDevices;

    if (!RTCPeerConnection) {
        console.error("❌ WebRTC not supported in this browser");
    }
} else {
    // // Native WebRTC (Android / iOS)
    // const webrtc = require("react-native-webrtc");

    // RTCPeerConnection = webrtc.RTCPeerConnection;
    // RTCIceCandidate = webrtc.RTCIceCandidate;
    // RTCSessionDescription = webrtc.RTCSessionDescription;
    // mediaDevices = webrtc.mediaDevices;
}

console.log("🌍 WebRTC Runtime", {
    platform: Platform.OS,
    RTCPeerConnection: !!RTCPeerConnection,
    mediaDevices: !!mediaDevices,
});

/* =====================================================
   CONFIG
===================================================== */

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

const SPEAKING_THRESHOLD = 0.02;
const SPEAKING_INTERVAL_MS = 150;

/* =====================================================
   VOICE WEBRTC HOOK
===================================================== */

export function useVoiceWebRTC({
    instanceId,   // ✅ FIXED: Changed from roomId
    enabled = true,
    localUserId,
    onRemoteTrack,
    onSpeakingChange,
}) {
    /* =====================================================
       REFS (NO RERENDERS)
    ===================================================== */

    const socketRef = useRef(null);
    const localStreamRef = useRef(null);

    const peersRef = useRef(new Map()); // userId => RTCPeerConnection
    const audioElementsRef = useRef(new Map()); // userId => HTMLAudioElement (web)
    const audioContextsRef = useRef(new Map()); // userId => AudioContext
    const speakingTimersRef = useRef(new Map()); // userId => interval

    const joinedRef = useRef(false);
    const destroyedRef = useRef(false);
    const localUserIdRef = useRef(localUserId);

    useEffect(() => {
        localUserIdRef.current = localUserId;
    }, [localUserId]);

    const setAudioRoute = async (route) => {
        if (Platform.OS !== "android") return;

        await Audio.setAudioModeAsync({
            playThroughEarpieceAndroid: route === "earpiece",
        });
    };

    /* =====================================================
       INITIALIZE SOCKET
    ===================================================== */
    useEffect(() => {
        if (!enabled) return;

        socketRef.current = getSocket();

        console.log("🔌 [voice-webrtc] socket ready", {
            instanceId,
            localUserId
        });

        return () => {
            if (!enabled) cleanupAll();
        };
    }, [enabled]);

    /* =====================================================
       AUDIO MODE (MOBILE ROUTING)
    ===================================================== */

    useEffect(() => {
        if (!enabled) return;

        if (Platform.OS !== "web") {
            Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                interruptionModeIOS: "doNotMix",
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                interruptionModeAndroid: "doNotMix",
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: false,
            }).catch(console.warn);
        }
    }, [enabled]);

    /* =====================================================
     APP STATE (BACKGROUND / FOREGROUND)
  ===================================================== */
    useEffect(() => {
        if (!enabled) return;

        const handleAppStateChange = (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                console.log("📱 [app] backgrounded - muting");
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = false;
                });

                onSpeakingChange?.(false);
            }

            if (nextState === "active") {
                console.log("📱 [app] foregrounded - resuming");
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = true;
                });

                // ✅ FIX 1: DO NOTHING on foreground
                // WebRTC handles ICE resume automatically
                console.log("📱 [app] foregrounded — keeping peers intact");
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);

        return () => sub.remove();
    }, [enabled]);

    /* =====================================================
       GET LOCAL AUDIO
    ===================================================== */
    const initLocalAudio = useCallback(async () => {
        if (localStreamRef.current) return localStreamRef.current;

        console.log("🎤 [audio] requesting microphone");

        if (Platform.OS !== "web") {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                console.error("⛔ [audio] microphone permission denied");
                throw new Error("Microphone permission denied");
            }
        }

        const stream = await mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false,
        });

        console.log("✅ [audio] mic granted");
        console.log("🎧 [audio] local stream ready", {
            tracks: stream.getAudioTracks().map(t => ({
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
            }))
        });

        localStreamRef.current = stream;
        return stream;
    }, []);

    /* =====================================================
       SPEAKING DETECTION (AUDIO LEVEL)
    ===================================================== */

    const attachSpeakingDetection = useCallback(
        (userId, stream) => {
            if (!onSpeakingChange) return;

            if (audioContextsRef.current.has(userId)) return;

            console.log("🗣️ [voice] speaking detection attached", userId);

            if (Platform.OS !== "web") return;

            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return;

            if (Platform.OS !== "web") {
                return;
            }

            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const data = new Uint8Array(analyser.frequencyBinCount);

            let speaking = false;

            const interval = setInterval(() => {
                analyser.getByteFrequencyData(data);

                const avg =
                    data.reduce((sum, v) => sum + v, 0) / data.length / 255;

                if (avg > SPEAKING_THRESHOLD && !speaking) {
                    speaking = true;
                    console.log("🟢 [voice] speaking START", userId);
                    onSpeakingChange(userId, true);
                    socketRef.current?.emit("voice:speaking", {
                        instanceId,
                        isSpeaking: true,
                    });
                }

                if (avg <= SPEAKING_THRESHOLD && speaking) {
                    speaking = false;
                    console.log("🔴 [voice] speaking STOP", userId);
                    onSpeakingChange(userId, false);
                    socketRef.current?.emit("voice:speaking", {
                        instanceId,
                        isSpeaking: false,
                    });
                }
            }, SPEAKING_INTERVAL_MS);

            audioContextsRef.current.set(userId, audioContext);
            speakingTimersRef.current.set(userId, interval);
        },
        [onSpeakingChange, instanceId]
    );

    /* =====================================================
       CREATE PEER (MESH / SFU READY)
    ===================================================== */

    const createPeer = useCallback(
        async (remoteUserId, isInitiator) => {
            if (destroyedRef.current) return null;

            if (peersRef.current.has(remoteUserId)) {
                return peersRef.current.get(remoteUserId);
            }

            console.log("🤝 [webrtc] creating peer", {
                remoteUserId,
                initiator: isInitiator
            });

            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peersRef.current.set(remoteUserId, pc);

            const stream = await initLocalAudio();
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            console.log("🎙️ [webrtc] local tracks added", {
                remoteUserId,
                tracks: stream.getTracks().map(t => t.kind)
            });

            /* ===== ICE ===== */
            pc.onicecandidate = (event) => {
                if (!event.candidate) return;

                console.log("🧊 [webrtc] ICE candidate", {
                    to: remoteUserId,
                    candidate: !!event.candidate
                });

                socketRef.current?.emit("voice:webrtc:ice", {
                    to: remoteUserId,
                    candidate: event.candidate,
                });
            };

            /* ===== REMOTE TRACK ===== */
            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;

                console.log("🔊 [audio] remote track received", {
                    from: remoteUserId,
                    tracks: event.streams[0]?.getAudioTracks().length
                });

                onRemoteTrack?.(remoteUserId, remoteStream);
                attachSpeakingDetection(remoteUserId, remoteStream);

                if (Platform.OS === "web") {
                    let audio = audioElementsRef.current.get(remoteUserId);

                    if (!audio) {
                        audio = document.createElement("audio");
                        audio.autoplay = true;
                        audio.playsInline = true;
                        audio.srcObject = remoteStream;

                        audio
                            .play()
                            .then(() => {
                                console.log("▶️ [audio] autoplay success", remoteUserId);
                            })
                            .catch(() => {
                                console.warn("⛔ [audio] autoplay blocked — waiting for gesture");
                            });

                        audioElementsRef.current.set(remoteUserId, audio);
                    }
                }
            };

            pc.onconnectionstatechange = () => {
                console.log(`🔄 [webrtc] connection state changed:`, {
                    userId: remoteUserId,
                    state: pc.connectionState
                });

                // ✅ FIX 2: STOP DESTROYING PEERS ON disconnected
                if (pc.connectionState === "failed") {
                    console.warn("❌ [webrtc] peer failed permanently", remoteUserId);
                    removePeer(remoteUserId);
                }

                // ⚠️ DO NOT REMOVE ON "disconnected"
                // Disconnected is TEMPORARY (tab switch, network jitter)
            };

            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                console.log("📨 [webrtc] offer sent →", remoteUserId);

                socketRef.current?.emit("voice:webrtc:offer", {
                    to: remoteUserId,
                    offer,
                });
            }

            return pc;
        },
        [attachSpeakingDetection, initLocalAudio, onRemoteTrack]
    );

    /* =====================================================
   CONNECT TO PEER (HELPER)
===================================================== */

    const connectToPeer = useCallback(
        async (remoteUserId) => {
            if (!remoteUserId) return;
            if (remoteUserId === localUserIdRef.current) return;

            const isInitiator = String(localUserIdRef.current) < String(p.userId);
            await createPeer(p.userId, isInitiator);

            console.log("👤 [voice-webrtc] user joined", {
                remoteUserId,
                amInitiator: String(localUserId) < String(remoteUserId)
            });

            await createPeer(remoteUserId, isInitiator);
        },
        [createPeer]
    );

    /* =====================================================
       RESYNC PEERS
    ===================================================== */
    const resyncPeers = async (participants) => {
        console.log("🔄 [webrtc] resyncing peers", participants.length);

        for (const p of participants) {
            if (!peersRef.current.has(p.userId)) {
                const isInitiator =
                    String(localUserIdRef.current) < String(p.userId);

                await createPeer(p.userId, isInitiator);
            }
        }
    };

    /* =====================================================
       REMOVE PEER
    ===================================================== */

    const removePeer = useCallback((userId) => {
        console.log("❌ [webrtc] peer removed", userId);

        const pc = peersRef.current.get(userId);
        if (!pc) return;

        pc.close();
        peersRef.current.delete(userId);

        if (audioContextsRef.current.has(userId)) {
            audioContextsRef.current.get(userId).close();
            audioContextsRef.current.delete(userId);
        }

        if (speakingTimersRef.current.has(userId)) {
            clearInterval(speakingTimersRef.current.get(userId));
            speakingTimersRef.current.delete(userId);
        }

        audioElementsRef.current.delete(userId);
    }, []);

    // ✅ FIX 3: DELETE reconnectPeer() COMPLETELY
    // This function has been removed entirely

    /* =====================================================
       SOCKET SIGNALING
    ===================================================== */

    useEffect(() => {
        if (!enabled || !socketRef.current || joinedRef.current) return;

        const socket = socketRef.current;
        joinedRef.current = true;

        console.log("➡️ [voice-webrtc] joining instance", instanceId);

        socket.emit("voice:join", { instanceId }, (res) => {
            console.log("✅ [voice-webrtc] join ack", {
                speakers: res?.instance?.participants?.filter(p => p.role === "speaker"),
                total: res?.instance?.participants?.length
            });

            // ✅ FIX 4: Allowed peer creation location 1 - Initial join resync
            if (res?.instance?.participants) {
                resyncPeers(
                    res.instance.participants
                        .filter(p => p.role === "speaker")
                        .map(p => ({
                            userId: p._id
                        }))
                );
            }
        });

        socket.on("voice:user:joined", async ({ userId: remoteUserId }) => {
            console.log("👤 [voice-webrtc] user joined event", {
                remoteUserId,
                amInitiator: String(localUserId) < String(remoteUserId)
            });

            if (remoteUserId === localUserId) return;

            const shouldInitiate =
                String(localUserId) < String(remoteUserId);

            // ✅ FIX 4: Allowed peer creation location 2 - voice:user:joined when initiator
            if (shouldInitiate) {
                if (!peersRef.current.has(remoteUserId)) {
                    await createPeer(remoteUserId, true);
                }
            }
        });

        socket.on("voice:webrtc:offer", async ({ from, offer }) => {
            console.log("📩 [webrtc] offer received ←", from);

            const pc = await createPeer(from, false);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("voice:webrtc:answer", {
                to: from,
                answer,
            });

            console.log("📨 [webrtc] answer sent →", from);
        });

        socket.on("voice:webrtc:answer", async ({ from, answer }) => {
            console.log("📩 [webrtc] answer received ←", from);

            const pc = peersRef.current.get(from);
            if (!pc) return;

            await pc.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        });

        socket.on("voice:webrtc:ice", async ({ from, candidate }) => {
            console.log("🧊 [webrtc] ICE received ←", from);

            const pc = peersRef.current.get(from);
            if (!pc) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("✅ [webrtc] ICE candidate added", from);
            } catch (error) {
                console.log("❌ [webrtc] ICE candidate error", error);
            }
        });

        socket.on("voice:user:left", ({ userId }) => {
            console.log("👋 [voice-webrtc] user left", userId);
            removePeer(userId);
        });

        socket.on("voice:speaking", ({ userId, isSpeaking }) => {
            console.log(isSpeaking ? "🟢 [voice] remote speaking" : "🔴 [voice] remote stopped", userId);
            onSpeakingChange?.(userId, isSpeaking);
        });

        return () => {
            socket.off("voice:user:joined");
            socket.off("voice:webrtc:offer");
            socket.off("voice:webrtc:answer");
            socket.off("voice:webrtc:ice");
            socket.off("voice:user:left");
            socket.off("voice:speaking");
        };
    }, [
        enabled,
        instanceId,
        localUserId,
        createPeer,
        resyncPeers,
        removePeer,
        onSpeakingChange,
    ]);

    /* =====================================================
       PUBLIC CONTROLS
    ===================================================== */

    const muteLocal = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            console.log(track.enabled ? "🔈 [audio] unmuted" : "🔇 [audio] muted");
        }
    }, []);

    /* =====================================================
       CLEANUP ALL
    ===================================================== */

    const cleanupAll = useCallback(() => {
        console.log("🧹 [webrtc] cleanup all peers");

        destroyedRef.current = true;

        peersRef.current.forEach((pc, userId) => {
            console.log("❌ [webrtc] closing peer", userId);
            pc.close();
        });
        peersRef.current.clear();

        audioContextsRef.current.forEach((ctx, userId) => {
            console.log("🔇 [audio] closing audio context", userId);
            ctx.close();
        });
        audioContextsRef.current.clear();

        speakingTimersRef.current.forEach((i, userId) => {
            console.log("🗣️ [voice] clearing speaking timer", userId);
            clearInterval(i);
        });
        speakingTimersRef.current.clear();

        localStreamRef.current?.getTracks().forEach((t) => {
            console.log("🎤 [audio] stopping local track");
            t.stop();
        });
        localStreamRef.current = null;

        joinedRef.current = false;
    }, []);

    /* =====================================================
       RETURN API
    ===================================================== */

    return {
        initLocalAudio,
        muteLocal,
        cleanup: cleanupAll,
    };
}

