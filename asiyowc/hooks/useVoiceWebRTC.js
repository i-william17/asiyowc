import { useEffect, useRef, useCallback, useMemo } from "react";
import { Platform, AppState } from "react-native";
import { Audio } from "expo-av";
import { getSocket } from "../services/socket";

// WebRTC globals (Expo / Web safe)
const RTCPeerConnection =
    global.RTCPeerConnection || window?.RTCPeerConnection;

const RTCSessionDescription =
    global.RTCSessionDescription || window?.RTCSessionDescription;

const RTCIceCandidate =
    global.RTCIceCandidate || window?.RTCIceCandidate;

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
                // ✅ FIXED: Changed from Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX to "doNotMix"
                interruptionModeIOS: "doNotMix",
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                // ✅ FIXED: Changed from Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX to "doNotMix"
                interruptionModeAndroid: "doNotMix",
                playThroughEarpieceAndroid: false, // speaker / bluetooth
                staysActiveInBackground: false,
            }).catch(console.warn); // ✅ FIXED: Added error catching
        }
    }, [enabled]);

    /* =====================================================
     APP STATE (BACKGROUND / FOREGROUND)
  ===================================================== */
    useEffect(() => {
        if (!enabled) return;

        const handleAppStateChange = (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                // 🔇 Mute mic when app is backgrounded
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = false;
                });

                // 🔴 Stop speaking indicator
                onSpeakingChange?.(false);
            }

            if (nextState === "active") {
                // 🎤 Resume mic
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = true;
                });

                // 🔁 Re-offer peers (safe reconnect)
                peersRef.current.forEach((_, peerId) => {
                    reconnectPeer(peerId);
                });
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);

        // ✅ FIXED: Removed duplicate AppState listener

        return () => sub.remove();
    }, [enabled]);

    /* =====================================================
       GET LOCAL AUDIO
    ===================================================== */

    const initLocalAudio = useCallback(async () => {
        if (localStreamRef.current) return localStreamRef.current;

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false,
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

            if (Platform.OS !== "web") return;

            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return;

            if (Platform.OS !== "web") {
                return; // speaking driven by socket events instead
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
                    onSpeakingChange(userId, true);
                    socketRef.current?.emit("voice:speaking", {
                        instanceId, // ✅ FIXED: Changed from roomId
                        isSpeaking: true,
                    });
                }

                if (avg <= SPEAKING_THRESHOLD && speaking) {
                    speaking = false;
                    onSpeakingChange(userId, false);
                    socketRef.current?.emit("voice:speaking", {
                        instanceId, // ✅ FIXED: Changed from roomId
                        isSpeaking: false,
                    });
                }
            }, SPEAKING_INTERVAL_MS);

            audioContextsRef.current.set(userId, audioContext);
            speakingTimersRef.current.set(userId, interval);
        },
        [onSpeakingChange, instanceId] // ✅ FIXED: Changed dependency from roomId to instanceId
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

            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peersRef.current.set(remoteUserId, pc);

            const stream = await initLocalAudio();
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            /* ===== ICE ===== */
            pc.onicecandidate = (event) => {
                if (!event.candidate) return;

                socketRef.current?.emit("voice:webrtc:ice", {
                    to: remoteUserId,
                    candidate: event.candidate,
                });
            };

            /* ===== REMOTE TRACK ===== */
            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;

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
                            .catch(() => {
                                console.warn("🔇 Autoplay blocked, waiting for user gesture");
                            });

                        audioElementsRef.current.set(remoteUserId, audio);
                    }
                }

            };

            pc.onconnectionstatechange = () => {
                if (
                    pc.connectionState === "failed" ||
                    pc.connectionState === "disconnected"
                ) {
                    removePeer(remoteUserId);
                }
            };

            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

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

            // Deterministic initiator selection
            const isInitiator =
                String(localUserIdRef.current) < String(remoteUserId);

            await createPeer(remoteUserId, isInitiator);
        },
        [createPeer]
    );

    /* =====================================================
       RESYNC PEERS
    ===================================================== */
    const resyncPeers = async (participants) => {
        cleanupAll();

        for (const p of participants) {
            if (p.role !== "speaker") continue;
            await connectToPeer(p.userId);
        }
    };

    /* =====================================================
       REMOVE PEER
    ===================================================== */

    const removePeer = useCallback((userId) => {
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

    /* =====================================================
       RECONNECT PEER
    ===================================================== */
    const reconnectPeer = async (remoteUserId) => {
        removePeer(remoteUserId);
        if (!peersRef.current.has(remoteUserId)) {
            await createPeer(remoteUserId, true);
        }
    };

    /* =====================================================
       SOCKET SIGNALING
    ===================================================== */

    useEffect(() => {
        if (!enabled || !socketRef.current || joinedRef.current) return;

        const socket = socketRef.current;
        joinedRef.current = true;

        socket.on("connect", () => {
            socket.emit("voice:join", { instanceId }); // ✅ FIXED: Changed from roomId
        });

        socket.emit("voice:join", { instanceId }, (res) => {
            if (res?.instance?.participants) {
                resyncPeers(
                    res.instance.participants.map(p => ({
                        userId: p._id
                    }))
                );
            }
        });

        socket.on("voice:user:joined", async ({ userId: remoteUserId }) => {
            if (remoteUserId === localUserId) return;

            const shouldInitiate =
                String(localUserId) < String(remoteUserId);

            if (shouldInitiate) {
                if (!peersRef.current.has(remoteUserId)) {
                    await createPeer(remoteUserId, true);
                }
            }
        });

        socket.on("voice:webrtc:offer", async ({ from, offer }) => {
            const pc = await createPeer(from, false);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("voice:webrtc:answer", {
                to: from,
                answer,
            });
        });

        socket.on("voice:webrtc:answer", async ({ from, answer }) => {
            const pc = peersRef.current.get(from);
            if (!pc) return;

            await pc.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        });

        socket.on("voice:webrtc:ice", async ({ from, candidate }) => {
            const pc = peersRef.current.get(from);
            if (!pc) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("voice:user:left", ({ userId }) => {
            removePeer(userId);
        });

        return () => {
            socket.off("voice:user:joined");
            socket.off("voice:webrtc:offer");
            socket.off("voice:webrtc:answer");
            socket.off("voice:webrtc:ice");
            socket.off("voice:user:left");
        };
    }, [
        enabled,
        instanceId, // ✅ FIXED: Changed from roomId
        localUserId,
        createPeer,
        resyncPeers,
        removePeer,
        reconnectPeer,
    ]);

    /* =====================================================
       PUBLIC CONTROLS
    ===================================================== */

    const muteLocal = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach((t) => {
            t.enabled = !t.enabled;
        });
    }, []);

    /* =====================================================
       CLEANUP ALL
    ===================================================== */

    const cleanupAll = useCallback(() => {
        destroyedRef.current = true;

        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        audioContextsRef.current.forEach((ctx) => ctx.close());
        audioContextsRef.current.clear();

        speakingTimersRef.current.forEach((i) => clearInterval(i));
        speakingTimersRef.current.clear();

        localStreamRef.current?.getTracks().forEach((t) => t.stop());
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