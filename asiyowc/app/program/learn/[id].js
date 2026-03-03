import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Easing,
    Modal,
    Platform,
    ActivityIndicator,
    Image,
    Pressable,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import ResourceList from "../../../components/programs/ResourceList";

import { programService } from "../../../services/program";
import tw from "../../../utils/tw";

const { height } = Dimensions.get("window");

const LearnScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const videoRef = useRef(null);
    const confettiRef = useRef(null);
    const confettiProgramRef = useRef(null);
    const playerWrapRef = useRef(null);
    const hideTimerRef = useRef(null);
    const seekBarWidthRef = useRef(1);
    const lastTapRef = useRef({ time: 0, side: null });

    const [program, setProgram] = useState(null);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingComplete, setMarkingComplete] = useState(false);

    // 🎉 Modal states
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showProgramModal, setShowProgramModal] = useState(false);

    // ---- Load Animations ----
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;
    const [videoReady, setVideoReady] = useState(false);

    // ---- Video Controls ----
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState(null);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [speed, setSpeed] = useState(1.0);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekRatio, setSeekRatio] = useState(0);

    const seekBarRef = useRef(null);

    const getSeekRatioFromEvent = (e) => {
        if (Platform.OS === "web") {
            const rect = seekBarRef.current?.getBoundingClientRect();
            if (!rect) return 0;

            const clientX = e.nativeEvent.clientX;
            const x = clientX - rect.left;
            return clamp(x / rect.width, 0, 1);
        } else {
            const x = e.nativeEvent.locationX;
            return clamp(x / seekBarWidthRef.current, 0, 1);
        }
    };

    useEffect(() => {
        if (Platform.OS !== "web") return;

        const handleKeyDown = (e) => {
            if (!videoReady) return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    togglePlay();
                    break;

                case "ArrowRight":
                    seekBy(10000);
                    break;

                case "ArrowLeft":
                    seekBy(-10000);
                    break;

                case "KeyF":
                    toggleFullscreenWeb();
                    break;

                case "Escape":
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;

                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [videoReady, status]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        Animated.timing(slideUp, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, []);

    // Cleanup timer
    useEffect(() => {
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== "web") return;

        const handler = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handler);

        return () => {
            document.removeEventListener("fullscreenchange", handler);
        };
    }, []);

    // -------------------------------------------
    // LOAD PROGRAM — FETCH ALL PROGRESS STATES
    // -------------------------------------------
    useEffect(() => {
        const load = async () => {
            try {
                const res = await programService.getProgram(id);
                const data = res.data || res;

                const programData = data.program;
                const userProgress = data.userProgress || {};

                const completedModules = userProgress.completedModules || [];
                const progressValue = userProgress.progress ?? 0;

                // Save full program
                setProgram({
                    ...programData,
                    userProgress: {
                        completedModules,
                        progress: progressValue,
                    },
                });

                // Auto continue where the user left off
                if (completedModules.length > 0) {
                    setCurrentModuleIndex(completedModules.length);
                }

            } catch (err) {
                console.log("❌ LOAD ERROR:", err?.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    // Reset videoReady state when module changes
    useEffect(() => {
        setVideoReady(false);
        setIsPlaying(false);
        setStatus(null);
    }, [currentModuleIndex]);

    // Helper functions
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const msToTime = (ms = 0) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const mm = String(mins).padStart(2, "0");
        const ss = String(secs).padStart(2, "0");
        return `${mm}:${ss}`;
    };

    const showControls = () => {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setControlsVisible((prev) => {
                if (!isSeeking) {
                    setShowSpeedMenu(false);
                    return false;
                }
                return prev;
            });
        }, 3000);
    };

    const togglePlay = async () => {
        try {
            showControls();
            if (!videoRef.current) return;

            if (isPlaying) {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                await videoRef.current.playAsync();
                setIsPlaying(true);
            }
        } catch (e) {
            console.log("togglePlay error:", e?.message || e);
        }
    };

    const seekToRatio = async (ratio01) => {
        try {
            if (!videoRef.current || !status?.durationMillis) return;
            const r = clamp(ratio01, 0, 1);
            const target = Math.floor(status.durationMillis * r);
            await videoRef.current.setPositionAsync(target);
        } catch (e) {
            console.log("seekToRatio error:", e?.message || e);
        }
    };

    const seekBy = async (deltaMs) => {
        try {
            if (!videoRef.current || !status?.positionMillis || !status?.durationMillis) return;
            showControls();
            const next = clamp(status.positionMillis + deltaMs, 0, status.durationMillis);
            await videoRef.current.setPositionAsync(next);
        } catch (e) {
            console.log("seekBy error:", e?.message || e);
        }
    };

    const setPlaybackSpeed = async (newSpeed) => {
        try {
            setSpeed(newSpeed);
            setShowSpeedMenu(false);
            showControls();
            if (videoRef.current) {
                await videoRef.current.setRateAsync(newSpeed, true);
            }
        } catch (e) {
            console.log("setPlaybackSpeed error:", e?.message || e);
        }
    };

    // Web fullscreen toggle
    const toggleFullscreenWeb = async () => {
        if (Platform.OS !== "web") return;

        const el = playerWrapRef.current;
        if (!el) return;

        try {
            if (!document.fullscreenElement) {
                await el.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.log("Fullscreen error:", err);
        }
    };

    if (loading || !program)
        return (
            <View style={tw`flex-1 items-center justify-center`}>
                <Text style={{ fontFamily: "Poppins-Medium" }}>Loading course...</Text>
            </View>
        );

    const modules = program.modules || [];
    const currentModule = modules[currentModuleIndex];

    const completedList = program?.userProgress?.completedModules || [];
    const completedModuleOrders = completedList.map((m) => m.moduleOrder);

    const progress = program?.userProgress?.progress ?? 0;

    // --------------------------------------------------
    // MARK MODULE COMPLETE HANDLER
    // --------------------------------------------------
    const markModuleComplete = async () => {
        try {
            setMarkingComplete(true);

            const result = await programService.completeModule(
                program._id,
                currentModule.order
            );

            const { completedModules, progress, isCompleted } = result;

            // Update program state instantly
            setProgram((prev) => ({
                ...prev,
                userProgress: {
                    ...(prev?.userProgress || {}),
                    completedModules,
                    progress,
                },
            }));

            // 🎉 Fire confetti + show modal for module completion
            setShowModuleModal(true);
            confettiRef.current?.start();

            // If program is done → final celebration!
            if (isCompleted) {
                setTimeout(() => {
                    setShowProgramModal(true);
                    confettiProgramRef.current?.start();
                }, 500);
            }

            // Move to next module automatically
            if (!isCompleted && currentModuleIndex < modules.length - 1) {
                setCurrentModuleIndex((prev) => prev + 1);
            }
        } catch (err) {
            console.log("❌ COMPLETE ERROR:", err?.response?.data || err.message);
        } finally {
            setMarkingComplete(false);
        }
    };

    // --------------------------------------------------
    // RENDER FUNCTIONS
    // --------------------------------------------------
    const renderVideoSection = () => (
        <Animated.View
            style={[
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUp }],
                }
            ]}
        >
            <View
                style={{
                    width: "100%",
                    backgroundColor: "#000",
                    overflow: "hidden",
                    borderBottomLeftRadius: isFullscreen ? 0 : 25,
                    borderBottomRightRadius: isFullscreen ? 0 : 25,
                    alignItems:
                        Platform.OS === "web" && !isFullscreen ? "center" : undefined,
                    paddingVertical:
                        Platform.OS === "web" && !isFullscreen ? 20 : undefined,
                }}
            >
                <View
                    ref={Platform.OS === "web" ? playerWrapRef : undefined}
                    onMouseEnter={() => {
                        if (Platform.OS === "web") {
                            setControlsVisible(true);
                        }
                    }}
                    onMouseLeave={() => {
                        if (Platform.OS === "web" && !isPlaying) {
                            setControlsVisible(false);
                        }
                    }}
                    style={
                        Platform.OS === "web"
                            ? isFullscreen
                                ? {
                                    backgroundColor: "#000000",
                                    borderRadius: 0,
                                    overflow: "hidden",
                                }
                                : {
                                    width: "100%",
                                    maxWidth: isFullscreen ? "100%" : 950,
                                    aspectRatio: isFullscreen ? undefined : 16 / 9,
                                    alignSelf: "center",
                                    borderRadius: isFullscreen ? 0 : 16,
                                    overflow: "hidden",
                                    backgroundColor: "#000",
                                    position: "relative",
                                }
                            : {
                                width: "100%",
                                height: height * 0.28,
                                backgroundColor: "#000",
                                position: "relative",
                            }
                    }
                >
                    {/* Video with pressable wrapper for controls */}
                    <Pressable
                        onPress={() => {
                            togglePlay();
                        }}
                        style={{ width: "100%", height: "100%" }}
                    >
                        <Video
                            ref={videoRef}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            resizeMode="cover"
                            source={{ uri: currentModule.videoUrl }}
                            shouldPlay={false}
                            onLoadStart={() => {
                                setVideoReady(false);
                                setIsPlaying(false);
                                setStatus(null);
                            }}
                            onReadyForDisplay={() => {
                                setVideoReady(true);
                                showControls();
                            }}
                            onPlaybackStatusUpdate={(s) => {
                                if (!s?.isLoaded) return;

                                setStatus(s);
                                setIsPlaying(s.isPlaying);

                                if (s.didJustFinish) {
                                    setIsPlaying(false);
                                }
                            }}
                        />
                    </Pressable>

                    {/* Loading Overlay */}
                    {!videoReady && (
                        <View
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#000",
                            }}
                        >
                            {/* Thumbnail */}
                            <View
                                style={{
                                    position: "absolute",
                                    width: "100%",
                                    height: "100%",
                                }}
                            >
                                <Image
                                    source={{ uri: program.thumbnail || program.image }}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                    resizeMode="cover"
                                />
                            </View>

                            {/* Spinner */}
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}

                    {/* Double-tap seek overlay */}
                    {videoReady && (
                        <View
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                flexDirection: "row",
                                opacity: 0.001,
                            }}
                            pointerEvents={controlsVisible ? "none" : "auto"}
                        >
                            {/* LEFT DOUBLE TAP */}
                            <Pressable
                                style={{ flex: 1 }}
                                onPress={() => {
                                    const now = Date.now();
                                    const last = lastTapRef.current;
                                    const isDouble = last.side === "left" && now - last.time < 280;
                                    lastTapRef.current = { time: now, side: "left" };
                                    if (isDouble) seekBy(-10000);
                                    else showControls();
                                }}
                            />

                            {/* RIGHT DOUBLE TAP */}
                            <Pressable
                                style={{ flex: 1 }}
                                onPress={() => {
                                    const now = Date.now();
                                    const last = lastTapRef.current;
                                    const isDouble = last.side === "right" && now - last.time < 280;
                                    lastTapRef.current = { time: now, side: "right" };
                                    if (isDouble) seekBy(10000);
                                    else showControls();
                                }}
                            />
                        </View>
                    )}

                    {/* Controls Overlay */}
                    {videoReady && controlsVisible && (
                        <View
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "rgba(0,0,0,0.25)",
                            }}
                            pointerEvents="box-none"
                        >
                            {/* CENTER PLAY/PAUSE */}
                            <TouchableOpacity
                                onPress={togglePlay}
                                activeOpacity={0.85}
                                style={{
                                    backgroundColor: "rgba(0,0,0,0.65)",
                                    width: 62,
                                    height: 62,
                                    borderRadius: 31,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#fff" />
                            </TouchableOpacity>

                            {/* TOP RIGHT ACTIONS */}
                            <View
                                style={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    flexDirection: "row",
                                    gap: 10,
                                }}
                            >
                                {/* SPEED */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowSpeedMenu((p) => !p);
                                        showControls();
                                    }}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        backgroundColor: "rgba(0,0,0,0.55)",
                                    }}
                                >
                                    <Text style={{ color: "#fff", fontFamily: "Poppins-SemiBold", fontSize: 12 }}>
                                        {speed}x
                                    </Text>
                                </TouchableOpacity>

                                {/* FULLSCREEN (WEB ONLY) */}
                                {/* {Platform.OS === "web" && (
                                    <TouchableOpacity
                                        onPress={toggleFullscreenWeb}
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 999,
                                            backgroundColor: "rgba(0,0,0,0.55)",
                                        }}
                                    >
                                        <Ionicons
                                            name={isFullscreen ? "contract-outline" : "expand-outline"}
                                            size={18}
                                            color="#fff"
                                        />
                                    </TouchableOpacity>
                                )} */}
                            </View>

                            {/* SPEED MENU */}
                            {showSpeedMenu && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 48,
                                        right: 12,
                                        backgroundColor: "rgba(0,0,0,0.85)",
                                        borderRadius: 12,
                                        overflow: "hidden",
                                    }}
                                >
                                    {[1.0, 1.25, 1.5].map((v) => (
                                        <TouchableOpacity
                                            key={v}
                                            onPress={() => setPlaybackSpeed(v)}
                                            style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 10,
                                                borderBottomWidth: v === 1.5 ? 0 : 1,
                                                borderBottomColor: "rgba(255,255,255,0.12)",
                                                minWidth: 90,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#fff",
                                                    fontFamily: "Poppins-Medium",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {v}x {v === speed ? "✓" : ""}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Seek Bar */}
                    {videoReady && status?.durationMillis && (
                        <View
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                paddingHorizontal: 12,
                                paddingBottom: 10,
                                paddingTop: 10,
                                backgroundColor: controlsVisible ? "rgba(0,0,0,0.25)" : "transparent",
                            }}
                            pointerEvents="box-none"
                        >
                            {/* Time row */}
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                                <Text style={{ color: "#fff", fontFamily: "Poppins-Medium", fontSize: 12 }}>
                                    {msToTime(status.positionMillis || 0)}
                                </Text>
                                <Text style={{ color: "#fff", fontFamily: "Poppins-Medium", fontSize: 12 }}>
                                    {msToTime(status.durationMillis || 0)}
                                </Text>
                            </View>

                            {/* Seek bar */}
                            <View
                                ref={Platform.OS === "web" ? seekBarRef : null}
                                onLayout={(e) => {
                                    seekBarWidthRef.current = e.nativeEvent.layout.width || 1;
                                }}
                                style={{
                                    height: 18,
                                    justifyContent: "center",
                                }}
                            >
                                {/* Track */}
                                <View style={{ height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)" }}>
                                    {/* Fill */}
                                    <View
                                        style={{
                                            height: 4,
                                            borderRadius: 999,
                                            width: `${clamp(
                                                isSeeking
                                                    ? seekRatio * 100
                                                    : (status.positionMillis / status.durationMillis) * 100,
                                                0,
                                                100
                                            )}%`,
                                            backgroundColor: "#A855F7",
                                        }}
                                    />
                                </View>

                                {/* Thumb */}
                                <View
                                    style={{
                                        position: "absolute",
                                        left: `${clamp(
                                            isSeeking
                                                ? seekRatio * 100
                                                : (status.positionMillis / status.durationMillis) * 100,
                                            0,
                                            100
                                        )
                                            }%`,
                                        transform: [{ translateX: -6 }],
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: "#fff",
                                    }}
                                />

                                {/* Drag layer */}
                                {Platform.OS === "web" ? (
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            cursor: "pointer",
                                        }}
                                        onMouseDown={(e) => {
                                            setIsSeeking(true);

                                            const rect = seekBarRef.current.getBoundingClientRect();
                                            const ratio = clamp(
                                                (e.clientX - rect.left) / rect.width,
                                                0,
                                                1
                                            );

                                            setSeekRatio(ratio);
                                            seekToRatio(ratio);

                                            const handleMove = (moveEvent) => {
                                                const rect = seekBarRef.current.getBoundingClientRect();
                                                const ratio = clamp(
                                                    (moveEvent.clientX - rect.left) / rect.width,
                                                    0,
                                                    1
                                                );
                                                setSeekRatio(ratio);
                                            };

                                            const handleUp = (upEvent) => {
                                                const rect = seekBarRef.current.getBoundingClientRect();
                                                const ratio = clamp(
                                                    (upEvent.clientX - rect.left) / rect.width,
                                                    0,
                                                    1
                                                );
                                                seekToRatio(ratio);
                                                setIsSeeking(false);

                                                window.removeEventListener("mousemove", handleMove);
                                                window.removeEventListener("mouseup", handleUp);
                                            };

                                            window.addEventListener("mousemove", handleMove);
                                            window.addEventListener("mouseup", handleUp);
                                        }}
                                    />
                                ) : (
                                    <Pressable
                                        onStartShouldSetResponder={() => true}
                                        onResponderGrant={(e) => {
                                            setIsSeeking(true);
                                            const ratio = getSeekRatioFromEvent(e);
                                            setSeekRatio(ratio);
                                            seekToRatio(ratio);
                                        }}
                                        onResponderMove={(e) => {
                                            if (!isSeeking) return;
                                            const ratio = getSeekRatioFromEvent(e);
                                            setSeekRatio(ratio);
                                        }}
                                        onResponderRelease={(e) => {
                                            const ratio = getSeekRatioFromEvent(e);
                                            seekToRatio(ratio);
                                            setIsSeeking(false);
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                        }}
                                    />
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View >
    );

    const renderProgress = () => (
        <View style={tw`px-6 mt-4`}>
            <Text style={{ fontFamily: "Poppins-Medium", marginBottom: 4 }}>
                Progress: {progress}%
            </Text>

            <View style={tw`h-3 bg-gray-200 rounded-full overflow-hidden`}>
                <View
                    style={[
                        tw`h-full bg-purple-600`,
                        { width: `${progress}%` },
                    ]}
                />
            </View>
        </View>
    );

    const renderModuleContent = () => (
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text
                style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 22,
                    color: "#1F2937",
                    marginBottom: 10,
                }}
            >
                {currentModule.title}
            </Text>

            <Text
                style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 15,
                    lineHeight: 22,
                    color: "#6B7280",
                }}
            >
                {currentModule.description}
            </Text>

            {/* Navigation Buttons */}
            <View style={tw`flex-row justify-between mt-8`}>
                {/* PREVIOUS */}
                <TouchableOpacity
                    disabled={currentModuleIndex === 0}
                    onPress={() => setCurrentModuleIndex((prev) => prev - 1)}
                    style={[
                        tw`px-5 py-3 rounded-xl`,
                        currentModuleIndex === 0
                            ? tw`bg-gray-300`
                            : tw`bg-gray-100 shadow-sm`,
                    ]}
                >
                    <Text style={{ fontFamily: "Poppins-Medium", color: "#374151" }}>
                        Previous
                    </Text>
                </TouchableOpacity>

                {/* MARK COMPLETE */}
                <TouchableOpacity
                    onPress={markModuleComplete}
                    disabled={markingComplete || completedModuleOrders.includes(currentModule.order)}
                    style={[
                        tw`px-6 py-3 rounded-xl shadow-md`,
                        completedModuleOrders.includes(currentModule.order)
                            ? tw`bg-green-600`
                            : tw`bg-purple-600`,
                    ]}
                >
                    <Text
                        style={{
                            fontFamily: "Poppins-SemiBold",
                            color: "#fff",
                        }}
                    >
                        {completedModuleOrders.includes(currentModule.order)
                            ? "Completed ✓"
                            : markingComplete
                                ? "Saving..."
                                : "Mark Complete"}
                    </Text>
                </TouchableOpacity>

                {/* NEXT */}
                <TouchableOpacity
                    disabled={currentModuleIndex === modules.length - 1}
                    onPress={() => setCurrentModuleIndex((prev) => prev + 1)}
                    style={[
                        tw`px-5 py-3 rounded-xl`,
                        currentModuleIndex === modules.length - 1
                            ? tw`bg-gray-300`
                            : tw`bg-purple-100`,
                    ]}
                >
                    <Text style={{ fontFamily: "Poppins-Medium", color: "#6D28D9" }}>
                        Next
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Module Outline List */}
            <Text
                style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 18,
                    color: "#1F2937",
                    marginTop: 30,
                    marginBottom: 10,
                }}
            >
                Module Outline
            </Text>

            {modules.map((m, index) => (
                <TouchableOpacity
                    key={m._id}
                    onPress={() => setCurrentModuleIndex(index)}
                    style={[
                        tw`p-4 rounded-xl mb-3 border flex-row items-center justify-between`,
                        index === currentModuleIndex
                            ? tw`bg-purple-100 border-purple-400`
                            : tw`bg-gray-50 border-gray-200`,
                    ]}
                >
                    <Text
                        style={{
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 15,
                            color: "#374151",
                        }}
                    >
                        {index + 1}. {m.title}
                    </Text>

                    {/* GREEN CHECK FROM BACKEND */}
                    {completedModuleOrders.includes(m.order) && (
                        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderContent = () => (
        <>
            {renderVideoSection()}
            {renderProgress()}
            {renderModuleContent()}
            {/* Additional Resources */}
            <ResourceList
                resources={currentModule.resources}
            />
        </>
    );

    // --------------------------------------------------
    // If all modules are done
    // --------------------------------------------------
    if (!currentModule)
        return (
            <View style={tw`flex-1 items-center justify-center p-4`}>
                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 22,
                        color: "#4B5563",
                    }}
                >
                    🎉 You have completed all modules!
                </Text>

                <TouchableOpacity
                    style={tw`mt-6 bg-purple-600 px-6 py-3 rounded-xl`}
                    onPress={() => router.push(`/program/${id}`)}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 16,
                        }}
                    >
                        Back to Program
                    </Text>
                </TouchableOpacity>
            </View>
        );

    return (
        <View style={tw`flex-1 bg-white`}>

            {/* HEADER */}
            <Animated.View
                style={[
                    tw`px-4 py-8 bg-purple-700 flex-row items-center justify-between`,
                    {
                        paddingTop: 65,
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUp }],
                        zIndex: 10,
                        display: isFullscreen ? "none" : "flex",
                    },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>

                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 20,
                        color: "#fff",
                        textAlign: "center",
                        flex: 1,
                    }}
                >
                    {program.title}
                </Text>

                <View style={{ width: 28 }} />
            </Animated.View>

            {/* SCROLLABLE CONTENT (NO VIDEO INSIDE) */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                style={{
                    display: isFullscreen ? "none" : "flex",
                }}
            >
                {renderVideoSection()}
                {renderProgress()}
                {renderModuleContent()}
                <ResourceList resources={currentModule.resources} />
            </ScrollView>

            {/* MODULE COMPLETION MODAL */}
            <Modal visible={showModuleModal} transparent animationType="fade">
                <View style={tw`flex-1 items-center justify-center bg-black/50`}>
                    <View style={tw`bg-white p-8 rounded-2xl items-center w-4/5`}>
                        <Ionicons name="checkmark-circle" size={48} color="#10B981" />

                        <Text
                            style={{
                                fontFamily: "Poppins-Bold",
                                fontSize: 22,
                                color: "#4B5563",
                                marginTop: 12,
                            }}
                        >
                            Module Completed
                        </Text>
                        <TouchableOpacity
                            style={tw`mt-6 bg-purple-600 px-6 py-3 rounded-xl`}
                            onPress={() => setShowModuleModal(false)}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontFamily: "Poppins-SemiBold",
                                }}
                            >
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ConfettiCannon
                    ref={confettiRef}
                    count={120}
                    origin={{ x: 200, y: -20 }}
                    fadeOut={true}
                    autoStart={false}
                />
            </Modal>

            {/* PROGRAM COMPLETION MODAL */}
            <Modal visible={showProgramModal} transparent animationType="fade">
                <View style={tw`flex-1 items-center justify-center bg-black/50`}>
                    <View style={tw`bg-white p-8 rounded-2xl items-center w-4/5`}>
                        <Ionicons name="trophy" size={48} color="#F59E0B" />

                        <Text
                            style={{
                                fontFamily: "Poppins-Bold",
                                fontSize: 22,
                                color: "#4B5563",
                                textAlign: "center",
                                marginTop: 12,
                            }}
                        >
                            Congratulations!
                        </Text>

                        <Text
                            style={{
                                fontFamily: "Poppins-Medium",
                                fontSize: 15,
                                color: "#6B7280",
                                textAlign: "center",
                                marginTop: 6,
                            }}
                        >
                            You completed the entire program.
                        </Text>

                        <TouchableOpacity
                            style={tw`mt-6 bg-green-600 px-6 py-3 rounded-xl`}
                            onPress={() => {
                                setShowProgramModal(false);
                                router.push(`/program/${id}`);
                            }}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontFamily: "Poppins-SemiBold",
                                }}
                            >
                                View Certificate
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ConfettiCannon
                    ref={confettiProgramRef}
                    count={200}
                    origin={{ x: 200, y: -20 }}
                    fadeOut={true}
                    autoStart={false}
                />
            </Modal>

        </View>
    );
};

export default LearnScreen;