// hooks/useVoiceWebRTC.js
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
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
    // Native WebRTC (Android / iOS)
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
    {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
    },
    {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
    }
];

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

const SPEAKING_THRESHOLD = 0.02;
const SPEAKING_INTERVAL_MS = 150;
const CONNECTION_TIMEOUT_MS = 25000; // ✅ Increased from 10s to 25s for stability
const DISABLE_DEBOUNCE_MS = 600; // ✅ Debounce time for enabled flicker

const DEBUG = process.env.NODE_ENV === 'development';

const log = (level, ...args) => {
    if (DEBUG || level === 'error') {
        console[level](...args);
    }
};

/* =====================================================
   HELPER: Deterministic initiator logic
   🔴 FIX #1: Match backend exactly (localeCompare < 0)
===================================================== */

const isInitiator = (localId, remoteId) => {
    if (!localId || !remoteId) return false;
    return String(localId).localeCompare(String(remoteId)) < 0;
};

/* =====================================================
   VOICE WEBRTC HOOK
===================================================== */

export function useVoiceWebRTC({
    instanceId,
    enabled = true,
    localUserId,
    token,
    onRemoteTrack,
    onSpeakingChange,
    initialSpeakers = [],
    isSocketConnected = false, // Track socket connection state
}) {
    /* =====================================================
       STATE
    ===================================================== */
    const [isMuted, setIsMuted] = useState(false); // ✅ FIX #3: Track mute state

    /* =====================================================
       REFS (NO RERENDERS)
    ===================================================== */

    const socketRef = useRef(null);
    const localStreamRef = useRef(null);

    const peersRef = useRef(new Map()); // userId => RTCPeerConnection
    const audioElementsRef = useRef(new Map()); // userId => HTMLAudioElement (web)
    const audioContextsRef = useRef(new Map()); // userId => AudioContext
    const speakingTimersRef = useRef(new Map()); // userId => interval
    const connectionTimeoutsRef = useRef(new Map()); // userId => timeout
    const pendingIceCandidatesRef = useRef(new Map()); // userId => RTCIceCandidate[]
    
    // ✅ Epoch for abort safety
    const epochRef = useRef(0);
    
    // ✅ Prevent concurrent peer creation
    const creatingPeersRef = useRef(new Map()); // userId => Promise

    // ✅ Debounce timer for enabled flicker
    const disableTimerRef = useRef(null);

    const destroyedRef = useRef(false);
    const localUserIdRef = useRef(localUserId);
    const userInteractedRef = useRef(false);

    useEffect(() => {
        localUserIdRef.current = localUserId;
    }, [localUserId]);

    /* =====================================================
       STABLE CALLBACKS (DEFINED BEFORE EFFECTS THAT USE THEM)
    ===================================================== */

    // ✅ Helper to check if peer connection is closed
    const isPcClosed = useCallback((pc) => {
        return !pc ||
            pc.signalingState === "closed" ||
            pc.connectionState === "closed" ||
            pc.iceConnectionState === "closed";
    }, []);

    const setAudioRoute = async (route) => {
        if (Platform.OS !== "android") return;
        await Audio.setAudioModeAsync({
            playThroughEarpieceAndroid: route === "earpiece",
        });
    };

    /* =====================================================
       GET LOCAL AUDIO
    ===================================================== */
    const initLocalAudio = useCallback(async () => {
        if (localStreamRef.current) return localStreamRef.current;

        log('log', "🎤 [audio] requesting microphone");

        if (Platform.OS !== "web") {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                log('error', "⛔ [audio] microphone permission denied");
                throw new Error("Microphone permission denied");
            }
        }

        if (!mediaDevices) {
            log('error', "❌ mediaDevices not available");
            throw new Error("Media devices not available");
        }

        const stream = await mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false,
        });

        log('log', "✅ [audio] mic granted");
        log('log', "🎧 [audio] local stream ready", {
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
       PROCESS PENDING ICE CANDIDATES
    ===================================================== */
    const processPendingIceCandidates = useCallback(async (userId, pc) => {
        const pending = pendingIceCandidatesRef.current.get(userId) || [];
        if (pending.length === 0) return;

        log('log', `🧊 Processing ${pending.length} pending ICE candidates for`, userId);

        for (const candidate of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                log('log', "✅ [webrtc] pending ICE candidate added", userId);
            } catch (error) {
                log('error', "❌ [webrtc] pending ICE candidate error", error);
            }
        }

        pendingIceCandidatesRef.current.delete(userId);
    }, []);

    /* =====================================================
       REMOVE PEER
    ===================================================== */
    const removePeer = useCallback((userId) => {
        log('log', "❌ [webrtc] peer removed", userId);

        // Clear connection timeout
        const timeout = connectionTimeoutsRef.current.get(userId);
        if (timeout) {
            clearTimeout(timeout);
            connectionTimeoutsRef.current.delete(userId);
        }

        // Clear pending ICE candidates
        pendingIceCandidatesRef.current.delete(userId);

        // Cleanup web audio element
        if (Platform.OS === "web") {
            const audio = audioElementsRef.current.get(userId);
            if (audio) {
                try {
                    audio.pause();
                    audio.srcObject = null;
                    audio.load();
                } catch (e) {
                    log('warn', `⚠️ [audio] error cleaning up element for ${userId}`, e);
                }
                audioElementsRef.current.delete(userId);
            }
        }

        const pc = peersRef.current.get(userId);
        if (!pc) return;

        try { pc.close(); } catch (e) {}
        peersRef.current.delete(userId);

        if (audioContextsRef.current.has(userId)) {
            audioContextsRef.current.get(userId).close();
            audioContextsRef.current.delete(userId);
        }

        if (speakingTimersRef.current.has(userId)) {
            clearInterval(speakingTimersRef.current.get(userId));
            speakingTimersRef.current.delete(userId);
        }
    }, []);

    /* =====================================================
       CLEANUP ALL
       🔴 FIX #3: Don't null socketRef on temporary cleanup
    ===================================================== */
    const cleanupAll = useCallback((finalDestroy = false) => {
        log('log', "🧹 [webrtc] cleanup all peers", finalDestroy ? "(final)" : "(temporary)");

        // Increment epoch to cancel in-flight createPeer operations
        epochRef.current += 1;

        // Only mark destroyed on final unmount
        if (finalDestroy) {
            destroyedRef.current = true;
        }

        // Cleanup web audio elements
        if (Platform.OS === "web") {
            audioElementsRef.current.forEach((audio, userId) => {
                try {
                    audio.pause();
                    audio.srcObject = null;
                    audio.load();
                } catch (e) {
                    log('warn', `⚠️ [audio] error cleaning up element for ${userId}`, e);
                }
            });
        }
        audioElementsRef.current.clear();

        // Clear all timeouts
        connectionTimeoutsRef.current.forEach((timeout) => {
            clearTimeout(timeout);
        });
        connectionTimeoutsRef.current.clear();

        // Clear pending ICE candidates
        pendingIceCandidatesRef.current.clear();

        // Close all peer connections
        peersRef.current.forEach((pc, userId) => {
            log('log', "❌ [webrtc] closing peer", userId);
            try { pc.close(); } catch (e) {}
        });
        peersRef.current.clear();

        // Close audio contexts
        audioContextsRef.current.forEach((ctx, userId) => {
            log('log', "🔇 [audio] closing audio context", userId);
            ctx.close();
        });
        audioContextsRef.current.clear();

        // Clear speaking timers
        speakingTimersRef.current.forEach((i, userId) => {
            log('log', "🗣️ [voice] clearing speaking timer", userId);
            clearInterval(i);
        });
        speakingTimersRef.current.clear();

        // Stop local tracks
        localStreamRef.current?.getTracks().forEach((t) => {
            log('log', "🎤 [audio] stopping local track");
            t.stop();
        });
        localStreamRef.current = null;

        // Reset mute state
        setIsMuted(false);

        // 🔴 FIX #3: Only clear socket reference on final destroy
        if (finalDestroy) {
            socketRef.current = null;
        }
    }, []);

    /* =====================================================
       SPEAKING DETECTION (AUDIO LEVEL)
    ===================================================== */
    const attachSpeakingDetection = useCallback(
        (userId, stream) => {
            if (!onSpeakingChange) return;
            if (audioContextsRef.current.has(userId)) return;

            log('log', "🗣️ [voice] speaking detection attached", userId);

            if (Platform.OS !== "web") return;

            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return;

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
                    log('log', "🟢 [voice] speaking START", userId);
                    onSpeakingChange(userId, true);
                    socketRef.current?.emit("voice:speaking", {
                        instanceId,
                        isSpeaking: true,
                    });
                }

                if (avg <= SPEAKING_THRESHOLD && speaking) {
                    speaking = false;
                    log('log', "🔴 [voice] speaking STOP", userId);
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
       CREATE PEER - FIXED with deterministic initiator logic
       🔴 FIX #1: Use backend-compatible initiator rule
    ===================================================== */
    const createPeer = useCallback(
        async (remoteUserId, forceInitiator = null) => {
            // ✅ Safety guards
            if (!remoteUserId) {
                console.warn("❌ createPeer called with undefined userId");
                return null;
            }

            if (!RTCPeerConnection) {
                console.error("❌ RTCPeerConnection not available");
                return null;
            }

            if (destroyedRef.current) return null;

            // ✅ Prevent connecting to self
            if (remoteUserId === localUserIdRef.current) {
                return null;
            }

            // ✅ Deduplicate concurrent createPeer calls for same user
            if (creatingPeersRef.current.has(remoteUserId)) {
                log('log', "⏳ [webrtc] waiting for existing peer creation", remoteUserId);
                return await creatingPeersRef.current.get(remoteUserId);
            }

            // 🔴 FIX #1: Deterministic initiator logic matching backend
            const shouldBeInitiator = forceInitiator !== null 
                ? forceInitiator 
                : isInitiator(localUserIdRef.current, remoteUserId);

            // Capture current epoch for abort safety
            const myEpoch = epochRef.current;

            // Create the promise that will be shared
            const promise = (async () => {
                try {
                    // Check if peer already exists
                    if (peersRef.current.has(remoteUserId)) {
                        return peersRef.current.get(remoteUserId);
                    }

                    log('log', "🤝 [webrtc] creating peer", {
                        remoteUserId,
                        initiator: shouldBeInitiator
                    });

                    // CRITICAL FIX #2: Add iceCandidatePoolSize for faster ICE gathering
                    const pc = new RTCPeerConnection({ 
                        iceServers: ICE_SERVERS,
                        iceCandidatePoolSize: 10, // Pre-gather ICE candidates
                    });
                    
                    peersRef.current.set(remoteUserId, pc);

                    // Get local audio stream (already pre-warmed by now)
                    const stream = await initLocalAudio();

                    // ✅ Check if cleanup happened while awaiting mic
                    if (epochRef.current !== myEpoch) {
                        log('log', "⏱️ [webrtc] aborting createPeer - epoch changed", remoteUserId);
                        try { pc.close(); } catch {}
                        peersRef.current.delete(remoteUserId);
                        return null;
                    }

                    // ✅ Check if peer was closed/removed during await
                    const stillSamePc = peersRef.current.get(remoteUserId) === pc;
                    if (!stillSamePc || isPcClosed(pc) || destroyedRef.current) {
                        log('log', "⏱️ [webrtc] aborting createPeer - peer invalid", remoteUserId);
                        try { pc.close(); } catch {}
                        if (stillSamePc) peersRef.current.delete(remoteUserId);
                        return null;
                    }

                    // Add local tracks
                    stream.getTracks().forEach((track) => {
                        if (!isPcClosed(pc)) {
                            pc.addTrack(track, stream);
                        }
                    });

                    log('log', "🎙️ [webrtc] local tracks added", {
                        remoteUserId,
                        tracks: stream.getTracks().map(t => t.kind)
                    });

                    // ✅ Set connection timeout
                    const timeoutId = setTimeout(() => {
                        const currentPc = peersRef.current.get(remoteUserId);
                        if (currentPc === pc && 
                            !isPcClosed(pc) && 
                            pc.connectionState !== "connected" && 
                            pc.connectionState !== "completed") {
                            log('warn', `⏱️ [${remoteUserId}] connection timeout, cleaning up`);
                            removePeer(remoteUserId);
                        }
                    }, CONNECTION_TIMEOUT_MS);

                    connectionTimeoutsRef.current.set(remoteUserId, timeoutId);

                    /* ===== ICE Candidate Handler ===== */
                    pc.onicecandidate = (event) => {
                        if (!event.candidate) return;

                        log('log', "🧊 [webrtc] ICE candidate", {
                            to: remoteUserId,
                            candidate: !!event.candidate
                        });

                        socketRef.current?.emit("voice:webrtc:ice", {
                            instanceId,
                            to: remoteUserId,
                            candidate: event.candidate,
                        });
                    };

                    /* ===== ICE Connection State ===== */
                    pc.oniceconnectionstatechange = () => {
                        log('log', `❄️ [${remoteUserId}] ICE state:`, pc.iceConnectionState);

                        if (pc.iceConnectionState === 'failed') {
                            log('log', `🔄 [${remoteUserId}] ICE failed, restarting...`);
                            pc.restartIce();
                        }
                    };

                    /* ===== Connection State ===== */
                    pc.onconnectionstatechange = () => {
                        log('log', `🔄 [webrtc] connection state changed:`, {
                            userId: remoteUserId,
                            state: pc.connectionState
                        });

                        // Clear timeout if connection established
                        if (pc.connectionState === 'connected' || pc.connectionState === 'completed') {
                            const timeout = connectionTimeoutsRef.current.get(remoteUserId);
                            if (timeout) {
                                clearTimeout(timeout);
                                connectionTimeoutsRef.current.delete(remoteUserId);
                            }
                        }

                        if (pc.connectionState === "failed") {
                            log('warn', "❌ [webrtc] peer failed permanently", remoteUserId);
                            removePeer(remoteUserId);
                        }
                    };

                    /* ===== Remote Track Handler ===== */
                    pc.ontrack = (event) => {
                        const [remoteStream] = event.streams;

                        log('log', "🔊 [audio] remote track received", {
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

                                // Only attempt to play if user has interacted
                                if (userInteractedRef.current) {
                                    audio.play()
                                        .then(() => {
                                            log('log', "▶️ [audio] autoplay success", remoteUserId);
                                        })
                                        .catch((err) => {
                                            log('warn', "⛔ [audio] autoplay failed", remoteUserId, err);
                                        });
                                } else {
                                    log('log', "⏸️ [audio] waiting for user interaction", remoteUserId);
                                }

                                audioElementsRef.current.set(remoteUserId, audio);
                            }
                        }
                    };

                    // ✅ If initiator, create and send offer (optimized)
                    if (shouldBeInitiator) {
                        // CRITICAL FIX #2: Optimized offer creation (removes one async gap)
                        await pc.setLocalDescription(await pc.createOffer());

                        log('log', "📨 [webrtc] offer sent →", remoteUserId);

                        socketRef.current?.emit("voice:webrtc:offer", {
                            instanceId,
                            to: remoteUserId,
                            offer: pc.localDescription,
                        });
                    }

                    // Process any pending ICE candidates
                    await processPendingIceCandidates(remoteUserId, pc);

                    return pc;
                } catch (error) {
                    log('error', "❌ [webrtc] createPeer error:", error);
                    // Clean up on error
                    const pc = peersRef.current.get(remoteUserId);
                    if (pc) {
                        try { pc.close(); } catch {}
                        peersRef.current.delete(remoteUserId);
                    }
                    return null;
                }
            })();

            // Store the promise and clean up when done
            creatingPeersRef.current.set(remoteUserId, promise);
            
            try {
                return await promise;
            } finally {
                creatingPeersRef.current.delete(remoteUserId);
            }
        },
        [attachSpeakingDetection, initLocalAudio, onRemoteTrack, processPendingIceCandidates, instanceId, removePeer, isPcClosed]
    );

    /* =====================================================
       RESYNC PEERS
       CRITICAL FIX #3: Remove socket connection gate
    ===================================================== */
    const resyncPeers = useCallback(async (participants) => {
        for (const p of participants) {
            const remoteUserId = p._id || p.userId || p.id;
            if (!remoteUserId) continue;
            if (remoteUserId === localUserIdRef.current) continue;

            // Let createPeer determine initiator status
            if (!peersRef.current.has(remoteUserId)) {
                await createPeer(remoteUserId, null);
            }
        }
    }, [createPeer]);

    /* =====================================================
       PUBLIC CONTROLS
       🔴 FIX #3: Boolean-driven mute with state tracking
    ===================================================== */
    const muteLocal = useCallback((muted) => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;

        const nextMuted = typeof muted === "boolean" ? muted : !track.enabled;
        track.enabled = !nextMuted;
        setIsMuted(nextMuted);

        log('log', nextMuted ? "🔇 [audio] muted" : "🔈 [audio] unmuted");
    }, []);

    const isPeerConnected = useCallback((userId) => {
        const pc = peersRef.current.get(userId);
        if (!pc) return false;
        return pc.connectionState === "connected" || pc.connectionState === "completed";
    }, []);

    /* =====================================================
       NOW ALL EFFECTS (ORDERED AFTER STABLE CALLBACKS)
    ===================================================== */

    // ✅ FIX #1: FINAL cleanup ONLY on unmount
    useEffect(() => {
        return () => {
            cleanupAll(true);
        };
    }, [cleanupAll]);

    // Track user interaction for web audio autoplay
    useEffect(() => {
        if (Platform.OS !== "web") return;

        const handleUserInteraction = () => {
            userInteractedRef.current = true;
            
            // 🟡 FIX #4: Trigger mic pre-warm on interaction
            initLocalAudio().catch((err) => {
                log('warn', "⚠️ [audio] pre-warm after interaction failed:", err);
            });
            
            // Attempt to play any pending audio elements
            audioElementsRef.current.forEach((audio, userId) => {
                if (audio.paused) {
                    audio.play().catch(err => {
                        log('warn', `⚠️ [audio] still blocked for ${userId}`, err);
                    });
                }
            });
        };

        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        return () => {
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };
    }, [initLocalAudio]);

    // Reset destroyed flag when enabled
    useEffect(() => {
        if (!enabled) return;
        destroyedRef.current = false;
        log('log', "🔁 [webrtc] destroyed flag reset, ready for connections");
    }, [enabled, instanceId]);

    // Pre-warm microphone
    useEffect(() => {
        if (!enabled) return;
        
        // 🟡 FIX #4: On web, wait for user interaction before pre-warming
        if (Platform.OS === "web" && !userInteractedRef.current) {
            log('log', "⏳ [audio] waiting for user interaction before pre-warming mic");
            return;
        }
        
        // Pre-warm microphone without waiting for peer creation
        initLocalAudio().catch((err) => {
            log('warn', "⚠️ [audio] pre-warm failed:", err);
        });
    }, [enabled, initLocalAudio]);

    // ✅ FIX #1: Socket init with NO cleanup return
    useEffect(() => {
        if (!enabled || !instanceId) return;

        // Reset destroyed flag when (re)initializing
        destroyedRef.current = false;

        // Get socket instance
        socketRef.current = getSocket();

        if (!socketRef.current) {
            log('error', "❌ [voice-webrtc] No socket instance available - make sure useVoiceSocket is initialized first");
            return;
        }

        log('log', "🔌 [voice-webrtc] socket ready (reused)", {
            instanceId,
            localUserId,
            socketId: socketRef.current.id,
            isConnected: socketRef.current.connected
        });

        // ✅ NO CLEANUP RETURN HERE - cleanup only on unmount
    }, [enabled, instanceId, localUserId]);

    // ✅ FIX #2: Debounced cleanup when disabled
    useEffect(() => {
        if (enabled) {
            // Clear any pending disable timer
            if (disableTimerRef.current) {
                clearTimeout(disableTimerRef.current);
                disableTimerRef.current = null;
            }
            return;
        }

        // Debounce cleanup to survive hydration flicker
        disableTimerRef.current = setTimeout(() => {
            log('log', "🔇 [voice-webrtc] disabled (debounced), cleaning up temporarily");
            cleanupAll(false);
            disableTimerRef.current = null;
        }, DISABLE_DEBOUNCE_MS);

        return () => {
            if (disableTimerRef.current) {
                clearTimeout(disableTimerRef.current);
                disableTimerRef.current = null;
            }
        };
    }, [enabled, cleanupAll]);

    // Initial speaker sync from Redux
    // useEffect(() => {
    //     if (!enabled) return;
    //     if (!initialSpeakers || initialSpeakers.length === 0) return;
        
    //     log('log', "🎤 [voice-webrtc] initial speaker sync from Redux", {
    //         count: initialSpeakers.length
    //     });

    //     resyncPeers(initialSpeakers);
    // }, [enabled, initialSpeakers, resyncPeers]);

    // Emit WebRTC ready
    useEffect(() => {
        if (!enabled || !instanceId) return;
        
        const socket = socketRef.current;
        if (!socket?.connected) return;

        log('log', "🟢 [voice-webrtc] emitting voice:webrtc:ready", { instanceId });
        socket.emit("voice:webrtc:ready", { instanceId });
    }, [enabled, instanceId]);

    // Emit ready when socket connects
    useEffect(() => {
        if (!enabled || !instanceId || !socketRef.current) return;

        const socket = socketRef.current;
        
        const onConnect = () => {
            log('log', "🟢 [voice-webrtc] socket connected, emitting ready");
            socket.emit("voice:webrtc:ready", { instanceId });
        };

        socket.on("connect", onConnect);
        
        return () => {
            socket.off("connect", onConnect);
        };
    }, [enabled, instanceId]);

    // Audio mode (mobile routing)
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

    // App state (background / foreground)
    useEffect(() => {
        if (!enabled) return;

        const handleAppStateChange = (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                log('log', "📱 [app] backgrounded - muting");
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = false;
                });
                setIsMuted(true);

                onSpeakingChange?.(false);
            }

            if (nextState === "active") {
                log('log', "📱 [app] foregrounded - resuming");
                localStreamRef.current?.getAudioTracks().forEach((t) => {
                    t.enabled = true;
                });
                setIsMuted(false);

                log('log', "📱 [app] foregrounded — keeping peers intact");
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);

        return () => sub.remove();
    }, [enabled, onSpeakingChange]);

    // Socket signaling
    useEffect(() => {
        if (!enabled || !socketRef.current) return;

        const socket = socketRef.current;

        log('log', "🔌 [voice-webrtc] setting up signaling listeners");

        // ✅ Handler for voice:user:joined
        const onUserJoined = async (payload) => {
            log("log", "👤 raw join payload", payload);

            const remoteUserId =
                payload?.userId ||
                payload?.participant?._id ||
                payload?._id ||
                payload?.id ||
                payload?.user?._id;

            if (!remoteUserId) {
                log("warn", "❌ join event missing userId", payload);
                return;
            }

            if (remoteUserId === localUserIdRef.current) return;

            // Use backend decision if provided, otherwise let createPeer decide
            const shouldCreateOffer = payload?.shouldCreateOffer;

            await createPeer(remoteUserId, shouldCreateOffer);
        };

        // ✅ Handler for voice:webrtc:offer
        const onOffer = async ({ from, offer }) => {
            log('log', "📩 [webrtc] offer received ←", from);

            const pc = await createPeer(from, false);
            if (!pc) return;

            // Handle negotiation collision with rollback
            if (pc.signalingState !== "stable") {
                log('log', "⚠️ signaling state not stable, performing rollback", from);
                try {
                    await pc.setLocalDescription({ type: "rollback" });
                } catch (e) {
                    log('warn', "⚠️ rollback failed, continuing anyway", e);
                }
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit("voice:webrtc:answer", {
                    instanceId,
                    to: from,
                    answer,
                });

                log('log', "📨 [webrtc] answer sent →", from);
            } catch (error) {
                log('error', "❌ [webrtc] error handling offer:", error);
            }
        };

        // ✅ Handler for voice:webrtc:answer
        const onAnswer = async ({ from, answer }) => {
            log('log', "📩 [webrtc] answer received ←", from);

            const pc = peersRef.current.get(from);
            if (!pc) {
                log('warn', "⚠️ [webrtc] answer for unknown peer", from);
                return;
            }

            try {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            } catch (error) {
                log('error', "❌ [webrtc] error handling answer:", error);
            }
        };

        // ✅ Handler for voice:webrtc:ice
        const onIce = async ({ from, candidate }) => {
            log('log', "🧊 [webrtc] ICE received ←", from);

            const pc = peersRef.current.get(from);

            // If peer doesn't exist yet, queue the candidate
            if (!pc) {
                log('log', "⏳ Queuing ICE candidate for", from);
                const pending = pendingIceCandidatesRef.current.get(from) || [];
                pending.push(candidate);
                pendingIceCandidatesRef.current.set(from, pending);
                return;
            }

            // If remote description isn't set yet, queue the candidate
            if (!pc.remoteDescription) {
                log('log', "⏳ Remote description not set, queuing ICE for", from);
                const pending = pendingIceCandidatesRef.current.get(from) || [];
                pending.push(candidate);
                pendingIceCandidatesRef.current.set(from, pending);
                return;
            }

            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                log('log', "✅ [webrtc] ICE candidate added", from);
            } catch (error) {
                log('error', "❌ [webrtc] ICE candidate error", error);
            }
        };

        // ✅ Handler for voice:user:left
        const onUserLeft = (payload) => {
            const userId =
                payload?.userId ||
                payload?._id ||
                payload?.id ||
                payload?.user?._id;

            if (!userId) {
                log('warn', "❌ user:left missing id", payload);
                return;
            }

            // Ignore self leave echo
            if (String(userId) === String(localUserIdRef.current)) {
                log('log', "👋 [voice-webrtc] ignoring self leave", userId);
                return;
            }

            log('log', "👋 [voice-webrtc] user left", userId);
            removePeer(userId);
        };

        // 🔴 FIX #2: Only listen to voice:user:speaking (not voice:speaking)
        const onUserSpeaking = ({ userId, isSpeaking }) => {
            log('log', isSpeaking ? "🟢 [voice] remote speaking" : "🔴 [voice] remote stopped", userId);
            onSpeakingChange?.(userId, isSpeaking);
        };

        // Register all listeners
        socket.on("voice:user:joined", onUserJoined);
        socket.on("voice:webrtc:offer", onOffer);
        socket.on("voice:webrtc:answer", onAnswer);
        socket.on("voice:webrtc:ice", onIce);
        socket.on("voice:user:left", onUserLeft);
        socket.on("voice:user:speaking", onUserSpeaking);
        // 🔴 FIX #2: Removed duplicate voice:speaking listener

        // Cleanup with named handlers
        return () => {
            socket.off("voice:user:joined", onUserJoined);
            socket.off("voice:webrtc:offer", onOffer);
            socket.off("voice:webrtc:answer", onAnswer);
            socket.off("voice:webrtc:ice", onIce);
            socket.off("voice:user:left", onUserLeft);
            socket.off("voice:user:speaking", onUserSpeaking);
            log('log', "🧹 [voice-webrtc] signaling listeners removed");
        };
    }, [
        enabled,
        instanceId,
        localUserId,
        createPeer,
        removePeer,
        onSpeakingChange,
    ]);

    /* =====================================================
       RETURN API
       🔴 FIX #3: Include isMuted state
    ===================================================== */

    return {
        initLocalAudio,
        muteLocal,
        isMuted, // ✅ Expose mute state
        cleanup: cleanupAll,
        isPeerConnected,
        getPeers: () => Array.from(peersRef.current.keys()),
    };
} 