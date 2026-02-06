// app/wellness/retreat/[id].js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    Pressable,
    StatusBar,
    Modal,
    Platform
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    FadeInUp,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate,
    runOnJS,
} from "react-native-reanimated";
import { Video, ResizeMode } from "expo-av";
import {
    ChevronLeft,
    Share2,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    Info,
    Star,
    Tag,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Sparkles,
    Brain,
    Layers,
    Lightbulb,
} from "lucide-react-native";
import LottieView from "lottie-react-native";

import tw from "../../../utils/tw";


import { fetchRetreatById, updateRetreatProgress } from "../../../store/slices/wellnessSlice";
import FeedShimmer from "../../../components/ui/ShimmerLoader";

const { width: W, height: H } = Dimensions.get("window");
const PURPLE = "#6A1B9A";

const COLORS = {
    purple: PURPLE,
    purpleDeep: "#4C1D95",
    purpleSoft: "#F5F0FF",
    bg: "#FAFAFA",
    card: "#FFFFFF",
    text: "#111827",
    sub: "#6B7280",
    line: "rgba(0,0,0,0.06)",
    success: "#10B981",
    warn: "#F59E0B",
    info: "#3B82F6",
    danger: "#EF4444",
};

const FONT = {
    r: "Poppins-Regular",
    m: "Poppins-Medium",
    sb: "Poppins-SemiBold",
    b: "Poppins-Bold",
    i: "Poppins-Italic",
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const formatNumber = (n) => {
    try {
        return new Intl.NumberFormat().format(n ?? 0);
    } catch {
        return String(n ?? 0);
    }
};

const formatMinutes = (mins) => {
    const m = Number(mins ?? 0);
    if (!Number.isFinite(m)) return "0 min";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
};

const levelLabel = (lvl) => {
    const v = String(lvl || "").toLowerCase();
    if (v.includes("begin")) return "Beginner-friendly";
    if (v.includes("inter")) return "Intermediate";
    if (v.includes("adv")) return "Advanced";
    return lvl ? String(lvl) : "All levels";
};

const typeLabel = (type) => {
    const v = String(type || "").toLowerCase();
    if (v.includes("breath")) return "Breathwork";
    if (v.includes("medit")) return "Meditation";
    if (v.includes("yoga")) return "Yoga";
    if (v.includes("sleep")) return "Sleep";
    return type ? String(type) : "Wellness Session";
};

const categoryLabel = (cat) => {
    const v = String(cat || "").toLowerCase();
    if (v.includes("stress")) return "Stress Relief";
    if (v.includes("focus")) return "Focus";
    if (v.includes("sleep")) return "Sleep";
    if (v.includes("anxiety")) return "Anxiety";
    return cat ? String(cat) : "Wellness";
};

const getBadge = (retreat) => {
    if (!retreat) return null;
    if (retreat.isFeatured) return { label: "Featured", icon: Sparkles, color: COLORS.warn };
    if (retreat.isActive === false) return { label: "Inactive", icon: ShieldCheck, color: COLORS.sub };
    return { label: "Active", icon: ShieldCheck, color: COLORS.success };
};

const shadow = (e = 3) => ({
    shadowColor: "#000",
    shadowOffset: { width: 0, height: e },
    shadowOpacity: 0.08,
    shadowRadius: e * 2,
    elevation: e,
});

const Card = ({ children, style }) => (
    <View style={[tw`bg-white rounded-2xl`, { borderWidth: 1, borderColor: COLORS.line }, shadow(2), style]}>
        {children}
    </View>
);

const Pill = ({ text, icon: Icon, tone = "soft", onPress }) => {
    const bg =
        tone === "soft" ? "rgba(106,27,154,0.10)" : tone === "dark" ? COLORS.purple : "rgba(17,24,39,0.06)";
    const fg = tone === "dark" ? "#fff" : COLORS.purple;

    const Body = (
        <View
            style={[
                tw`flex-row items-center px-3 py-2 rounded-full`,
                { backgroundColor: bg, borderWidth: 1, borderColor: "rgba(106,27,154,0.12)" },
            ]}
        >
            {Icon ? <Icon size={14} color={fg} style={tw`mr-1.5`} /> : null}
            <Text style={[tw`text-xs`, { fontFamily: FONT.m, color: fg }]}>{text}</Text>
        </View>
    );

    if (!onPress) return Body;

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            {Body}
        </Pressable>
    );
};

const StatMini = ({ icon: Icon, label, value, sub }) => {
    return (
        <View style={[tw`flex-1 rounded-xl p-3`, { backgroundColor: "rgba(17,24,39,0.03)" }]}>
            <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <View
                        style={[
                            tw`w-9 h-9 rounded-xl items-center justify-center mr-2`,
                            { backgroundColor: "rgba(106,27,154,0.10)" },
                        ]}
                    >
                        <Icon size={18} color={COLORS.purple} />
                    </View>
                    <View>
                        <Text style={[tw`text-xs`, { fontFamily: FONT.r, color: COLORS.sub }]}>{label}</Text>
                        <Text style={[tw`text-base`, { fontFamily: FONT.sb, color: COLORS.text }]}>{value}</Text>
                    </View>
                </View>
                {sub ? (
                    <View style={[tw`px-2 py-1 rounded-full`, { backgroundColor: "rgba(16,185,129,0.10)" }]}>
                        <Text style={[tw`text-[10px]`, { fontFamily: FONT.m, color: COLORS.success }]}>{sub}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const Divider = () => <View style={[tw`my-4`, { height: 1, backgroundColor: COLORS.line }]} />;

const SkeletonLine = ({ w = "100%", h = 10, r = 10, style }) => (
    <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: "rgba(17,24,39,0.06)" }, style]} />
);

const formatTime = (millis) => {
    const totalSec = Math.max(0, Math.floor((millis || 0) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return `${mm}:${ss}`;
};

/* ============================================================
   SMALL MODAL: Session Info / Meta
============================================================ */
const InfoModal = ({ visible, onClose, retreat }) => {
    if (!retreat) return null;

    const badge = getBadge(retreat);
    const BadgeIcon = badge?.icon || Info;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={tw`flex-1`} onPress={onClose}>
                <View style={[tw`flex-1 justify-end`, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Pressable
                        onPress={() => { }}
                        style={[
                            tw`bg-white rounded-t-3xl px-5 pt-5 pb-8`,
                            { borderTopWidth: 1, borderColor: COLORS.line },
                        ]}
                    >
                        <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[tw`text-base`, { fontFamily: FONT.b, color: COLORS.text }]}>Session details</Text>
                            <TouchableOpacity onPress={onClose} style={tw`px-3 py-2`}>
                                <Text style={[tw`text-sm`, { fontFamily: FONT.m, color: COLORS.purple }]}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={tw`mt-3 flex-row items-center`}>
                            <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`, { backgroundColor: "rgba(106,27,154,0.10)" }]}>
                                <BadgeIcon size={20} color={badge?.color || COLORS.purple} />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={[tw`text-sm`, { fontFamily: FONT.sb, color: COLORS.text }]}>{retreat.title}</Text>
                                <Text style={[tw`text-xs mt-0.5`, { fontFamily: FONT.r, color: COLORS.sub }]}>
                                    Narrator: {retreat.instructor || "—"}
                                </Text>
                            </View>
                            {badge ? (
                                <View style={[tw`px-3 py-1.5 rounded-full`, { backgroundColor: `${badge.color}15` }]}>
                                    <Text style={[tw`text-xs`, { fontFamily: FONT.m, color: badge.color }]}>{badge.label}</Text>
                                </View>
                            ) : null}
                        </View>

                        <Divider />

                        <View style={tw`flex-row flex-wrap`}>
                            <View style={tw`mr-2 mb-2`}>
                                <Pill text={typeLabel(retreat.type)} icon={Layers} />
                            </View>
                            <View style={tw`mr-2 mb-2`}>
                                <Pill text={levelLabel(retreat.level)} icon={Star} />
                            </View>
                            <View style={tw`mr-2 mb-2`}>
                                <Pill text={categoryLabel(retreat.category)} icon={Tag} />
                            </View>
                            <View style={tw`mr-2 mb-2`}>
                                <Pill text={formatMinutes(retreat.duration)} icon={Clock} />
                            </View>
                        </View>

                        <Divider />

                        <Text style={[tw`text-sm mb-2`, { fontFamily: FONT.sb, color: COLORS.text }]}>About</Text>
                        <Text style={[tw`text-sm leading-6`, { fontFamily: FONT.r, color: COLORS.sub }]}>
                            {retreat.description || "No description provided."}
                        </Text>

                        <Divider />

                        <Text style={[tw`text-sm mb-2`, { fontFamily: FONT.sb, color: COLORS.text }]}>Tags</Text>
                        <View style={tw`flex-row flex-wrap`}>
                            {(retreat.tags || []).length === 0 ? (
                                <Text style={[tw`text-sm`, { fontFamily: FONT.r, color: COLORS.sub }]}>No tags.</Text>
                            ) : (
                                retreat.tags.map((t, idx) => (
                                    <View key={`${t}-${idx}`} style={tw`mr-2 mb-2`}>
                                        <Pill text={`#${t}`} />
                                    </View>
                                ))
                            )}
                        </View>

                        <Divider />

                        <Text style={[tw`text-xs`, { fontFamily: FONT.r, color: "rgba(17,24,39,0.45)" }]}>
                            Tip: Start the session and return anytime — your progress can be tracked.
                        </Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

/* ============================================================
   VIDEO PLAYER (in-card) — sophisticated controls + scrub UI
============================================================ */
const VideoPlayerCard = ({
    title,
    videoUrl,
    thumbnail,
    purple = COLORS.purple,
    onProgressCommit,
    initialPositionMillis = 0,
    initialProgressPercent = 0,
}) => {
    const videoRef = useRef(null);

    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const [status, setStatus] = useState(null);
    const [buffering, setBuffering] = useState(false);

    // local scrub
    const [scrubbing, setScrubbing] = useState(false);
    const [scrubMillis, setScrubMillis] = useState(0);

    const controlScale = useSharedValue(1);
    const overlayOpacity = useSharedValue(1);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const pressIn = () => {
        controlScale.value = withSpring(0.98, { damping: 14 });
    };
    const pressOut = () => {
        controlScale.value = withSpring(1, { damping: 14 });
    };

    const controlWrapStyle = useAnimatedStyle(() => ({
        transform: [{ scale: controlScale.value }],
    }));

    const durationMillis = status?.durationMillis || 0;
    const positionMillis = status?.positionMillis || 0;

    const effectivePos = scrubbing ? scrubMillis : positionMillis;
    const progressPct = durationMillis ? clamp((effectivePos / durationMillis) * 100, 0, 100) : initialProgressPercent;

    const timeLeft = durationMillis ? Math.max(0, durationMillis - effectivePos) : 0;

    const togglePlay = useCallback(async () => {
        try {
            if (!videoRef.current) return;

            if (playing) {
                await videoRef.current.pauseAsync();
                setPlaying(false);

                // ✅ FIX 2: SAVE ON PAUSE ONLY
                if (durationMillis > 0) {
                    const pct = clamp((positionMillis / durationMillis) * 100, 0, 100);
                    onProgressCommit?.(pct, positionMillis, durationMillis);
                }

                overlayOpacity.value = withTiming(1, { duration: 180 });
            } else {
                await videoRef.current.playAsync();
                setPlaying(true);
                overlayOpacity.value = withTiming(0, { duration: 240 });
            }
        } catch (e) {
            console.log("Video toggle error:", e);
        }
    }, [playing, positionMillis, durationMillis]);

    const skip = useCallback(async (deltaSec) => {
        try {
            if (!videoRef.current || !status) return;
            const next = clamp((status.positionMillis || 0) + deltaSec * 1000, 0, status.durationMillis || 0);
            await videoRef.current.setPositionAsync(next);

            // Save progress after skip
            if (durationMillis > 0) {
                const pct = clamp((next / durationMillis) * 100, 0, 100);
                onProgressCommit?.(pct, next, durationMillis);
            }
        } catch (e) {
            console.log("Skip error:", e);
        }
    }, [status, durationMillis]);

    const toggleMute = useCallback(async () => {
        try {
            if (!videoRef.current) return;
            const next = !muted;
            setMuted(next);
            await videoRef.current.setIsMutedAsync(next);
        } catch (e) {
            console.log("Mute error:", e);
        }
    }, [muted]);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (!videoRef.current) return;
            if (!fullscreen) {
                setFullscreen(true);
                await videoRef.current.presentFullscreenPlayer();
            } else {
                setFullscreen(false);
                await videoRef.current.dismissFullscreenPlayer();
            }
        } catch (e) {
            console.log("Fullscreen error:", e);
        }
    }, [fullscreen]);

    const onPlaybackStatusUpdate = useCallback(
        (s) => {
            setStatus(s);
            setBuffering(!!s?.isBuffering);
            if (s?.isLoaded) {
                setReady(true);
                // when it ends, show overlay again and save progress
                if (s.didJustFinish) {
                    setPlaying(false);
                    overlayOpacity.value = withTiming(1, { duration: 200 });
                    // ✅ Save 100% progress when video finishes
                    if (s.durationMillis > 0) {
                        runOnJS(onProgressCommit)?.(100, s.positionMillis || 0, s.durationMillis || 0);
                    }
                }
            }
        },
        [onProgressCommit]
    );

    // resume from last position once loaded
    const resumedOnce = useRef(false);
    useEffect(() => {
        const resume = async () => {
            try {
                if (!videoRef.current) return;
                if (!status?.isLoaded) return;
                if (resumedOnce.current) return;

                resumedOnce.current = true;
                const resumeAt = clamp(initialPositionMillis || 0, 0, status.durationMillis || 0);
                if (resumeAt > 1500) {
                    await videoRef.current.setPositionAsync(resumeAt);
                }
            } catch (e) {
                console.log("Resume error:", e);
            }
        };
        resume();
    }, [status?.isLoaded]);

    // ✅ FIX 1: REMOVED the periodic progress update useEffect
    // No more frequent Redux updates while playing!

    // ✅ FIX 3: Save on unmount
    useEffect(() => {
        return () => {
            // Save progress when component unmounts (user leaves screen)
            if (durationMillis > 0 && positionMillis > 0) {
                const pct = clamp((positionMillis / durationMillis) * 100, 0, 100);
                onProgressCommit?.(pct, positionMillis, durationMillis);
            }
        };
    }, []);

    const onScrubStart = () => {
        setScrubbing(true);
        setScrubMillis(positionMillis || 0);
    };

    const onScrubMove = (x) => {
        if (!durationMillis) return;
        const barW = W - 64;
        const pct = clamp(x / barW, 0, 1);
        setScrubMillis(pct * durationMillis);
    };

    const onScrubEnd = async () => {
        try {
            if (!videoRef.current) return;
            setScrubbing(false);
            await videoRef.current.setPositionAsync(scrubMillis);
            // ✅ Save progress after scrubbing
            if (durationMillis > 0) {
                const pct = clamp((scrubMillis / durationMillis) * 100, 0, 100);
                onProgressCommit?.(pct, scrubMillis, durationMillis);
            }
        } catch (e) {
            console.log("Scrub end error:", e);
        }
    };

    const videoHeight =
        Platform.OS === "web"
            ? Math.min(H * 0.65, 560)
            : 250;

    return (
        <Card style={[tw`p-4`, { overflow: "hidden" }]}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-1 pr-2`}>
                    <Text style={[tw`text-sm`, { fontFamily: FONT.sb, color: COLORS.text }]} numberOfLines={1}>
                        {title || "Session"}
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, { fontFamily: FONT.r, color: COLORS.sub }]}>
                        {ready ? "Ready to play" : "Preparing video…"}
                    </Text>
                </View>

                {buffering ? (
                    <View style={[tw`px-3 py-1.5 rounded-full flex-row items-center`, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                        <ActivityIndicator size="small" color={COLORS.warn} style={tw`mr-1.5`} />
                        <Text style={[tw`text-xs`, { fontFamily: FONT.m, color: COLORS.warn }]}>Buffering</Text>
                    </View>
                ) : null}
            </View>

            <View style={[tw`rounded-2xl overflow-hidden`, { backgroundColor: "#111827" }]}>
                {/* VIDEO */}
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls={false}
                    shouldPlay={false}
                    isMuted={muted}
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                    style={{ width: "100%", height: videoHeight, backgroundColor: "#111827" }}
                    posterSource={thumbnail ? { uri: thumbnail } : undefined}
                    usePoster={!!thumbnail}
                    posterStyle={{ resizeMode: "cover" }}
                />

                {/* OVERLAY + MAIN BUTTON */}
                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        tw`absolute left-0 right-0 top-0 bottom-0 items-center justify-center`,
                        overlayStyle,
                    ]}
                >
                    <LinearGradient
                        colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.45)"]}
                        style={tw`absolute left-0 right-0 top-0 bottom-0`}
                    />
                    <Animated.View style={controlWrapStyle}>
                        <TouchableOpacity
                            onPress={togglePlay}
                            onPressIn={pressIn}
                            onPressOut={pressOut}
                            activeOpacity={0.9}
                            style={[
                                tw`w-16 h-16 rounded-full items-center justify-center`,
                                { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
                            ]}
                        >
                            {playing ? <Pause size={26} color="#fff" /> : <Play size={26} color="#fff" />}
                        </TouchableOpacity>
                    </Animated.View>

                    {!!thumbnail && !playing ? (
                        <View style={tw`absolute bottom-3 left-3`}>
                            <View style={[tw`px-3 py-1.5 rounded-full`, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                                <Text style={[tw`text-xs`, { fontFamily: FONT.m, color: "#fff" }]}>Tap to start</Text>
                            </View>
                        </View>
                    ) : null}
                </Animated.View>

                {/* MINI CONTROLS BAR */}
                <View style={tw`absolute left-0 right-0 bottom-0 px-3 pb-3`}>
                    {/* timeline */}
                    <Pressable
                        onPressIn={onScrubStart}
                        onPressOut={onScrubEnd}
                        onPress={(e) => {
                            const x = e.nativeEvent.locationX;
                            onScrubStart();
                            onScrubMove(x);
                            onScrubEnd();
                        }}
                        onResponderMove={(e) => onScrubMove(e.nativeEvent.locationX)}
                        style={tw`w-full`}
                    >
                        <View style={[tw`rounded-full overflow-hidden`, { height: 8, backgroundColor: "rgba(255,255,255,0.18)" }]}>
                            <View style={{ width: `${progressPct}%`, height: "100%", backgroundColor: purple }} />
                        </View>
                    </Pressable>

                    <View style={tw`flex-row items-center justify-between mt-2`}>
                        <Text style={[tw`text-xs`, { fontFamily: FONT.m, color: "rgba(255,255,255,0.85)" }]}>
                            {formatTime(effectivePos)} • -{formatTime(timeLeft)}
                        </Text>

                        <View style={tw`flex-row items-center`}>
                            <TouchableOpacity
                                onPress={() => skip(-10)}
                                style={[tw`w-9 h-9 rounded-full items-center justify-center mr-2`, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                                activeOpacity={0.85}
                            >
                                <SkipBack size={16} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={togglePlay}
                                style={[tw`w-9 h-9 rounded-full items-center justify-center mr-2`, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                                activeOpacity={0.85}
                            >
                                {playing ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => skip(10)}
                                style={[tw`w-9 h-9 rounded-full items-center justify-center mr-2`, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                                activeOpacity={0.85}
                            >
                                <SkipForward size={16} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={toggleMute}
                                style={[tw`w-9 h-9 rounded-full items-center justify-center mr-2`, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                                activeOpacity={0.85}
                            >
                                {muted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={toggleFullscreen}
                                style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                                activeOpacity={0.85}
                            >
                                {fullscreen ? <Minimize2 size={16} color="#fff" /> : <Maximize2 size={16} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Card>
    );
};

/* ============================================================
   MAIN SCREEN
============================================================ */
export default function RetreatDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const dispatch = useDispatch();

    const { token } = useSelector((s) => s.auth);
    const { selectedRetreat, loading } = useSelector((s) => s.wellness);

    // Sophisticated UI states
    const [bookmarked, setBookmarked] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [updatingProgress, setUpdatingProgress] = useState(false);

    // Animated header collapse
    const scrollY = useSharedValue(0);
    const headerH = 120;
    const headerMin = 80;

    // "progress resume" support
    const localResumeRef = useRef({ positionMillis: 0, durationMillis: 0, progress: 0 });

    useEffect(() => {
        if (!id || !token) return;
        dispatch(fetchRetreatById({ id, token }));
    }, [id, token]);

    // If your API provides saved progress, adopt it
    useEffect(() => {
        if (!selectedRetreat) return;
        const p = clamp(Number(selectedRetreat.progress ?? 0), 0, 100);
        const pos = clamp(Number(selectedRetreat.lastPositionMillis ?? 0), 0, 10 ** 12);
        const dur = clamp(Number(selectedRetreat.durationMillis ?? 0), 0, 10 ** 12);
        localResumeRef.current = { progress: p, positionMillis: pos, durationMillis: dur };
    }, [selectedRetreat?._id]);

    const badge = useMemo(() => getBadge(selectedRetreat), [selectedRetreat]);
    const BadgeIcon = badge?.icon || ShieldCheck;

    const headerStyle = useAnimatedStyle(() => {
        const h = interpolate(scrollY.value, [0, 180], [headerH, headerMin], Extrapolate.CLAMP);
        const br = interpolate(scrollY.value, [0, 180], [30, 22], Extrapolate.CLAMP);
        return {
            height: h,
            borderBottomLeftRadius: br,
            borderBottomRightRadius: br,
        };
    });

    const headerTitleStyle = useAnimatedStyle(() => {
        const ty = interpolate(scrollY.value, [0, 180], [0, 12], Extrapolate.CLAMP);
        const op = interpolate(scrollY.value, [0, 120], [1, 0.92], Extrapolate.CLAMP);
        return { transform: [{ translateY: ty }], opacity: op };
    });

    const commitProgress = useCallback(
        async (pct, positionMillis, durationMillis) => {
            if (!selectedRetreat?._id || !token) return;

            // Keep local resume
            localResumeRef.current = {
                progress: clamp(pct, 0, 100),
                positionMillis: Math.max(0, Math.floor(positionMillis || 0)),
                durationMillis: Math.max(0, Math.floor(durationMillis || 0)),
            };

            // Push to backend (only called on pause/finish/unmount now)
            try {
                setUpdatingProgress(true);
                await dispatch(
                    updateRetreatProgress({
                        id: selectedRetreat._id,
                        token,
                        payload: {
                            progress: clamp(pct, 0, 100),
                            lastPositionMillis: Math.floor(positionMillis || 0),
                            durationMillis: Math.floor(durationMillis || 0),
                        },
                    })
                ).unwrap?.();
            } catch (e) {
                console.log("Progress update failed:", e?.message || e);
            } finally {
                setUpdatingProgress(false);
            }
        },
        [selectedRetreat?._id, token]
    );

    const quickMeta = useMemo(() => {
        if (!selectedRetreat) return [];
        return [
            { icon: Layers, text: typeLabel(selectedRetreat.type) },
            { icon: Star, text: levelLabel(selectedRetreat.level) },
            { icon: Tag, text: categoryLabel(selectedRetreat.category) },
            { icon: Clock, text: formatMinutes(selectedRetreat.duration) },
        ];
    }, [selectedRetreat?._id]);

    const stats = useMemo(() => {
        if (!selectedRetreat) return null;

        const participants = formatNumber(selectedRetreat.participantsCount ?? 0);
        const completions = formatNumber(selectedRetreat.completionsCount ?? 0);
        const avg = `${Math.round(selectedRetreat.averageCompletionRate ?? 0)}%`;
        const minutes = formatNumber(selectedRetreat.totalMinutesWatched ?? 0);

        return { participants, completions, avg, minutes };
    }, [selectedRetreat?._id]);

    if (loading || !selectedRetreat) {
        return (
            <SafeAreaView style={[tw`flex-1`, { backgroundColor: COLORS.bg }]}>
                <StatusBar barStyle="light-content" />
                <FeedShimmer />
            </SafeAreaView>
        );
    }

    const progressPct = clamp(Number(selectedRetreat.progress ?? localResumeRef.current.progress ?? 0), 0, 100);
    const initialPos = Number(selectedRetreat.lastPositionMillis ?? localResumeRef.current.positionMillis ?? 0);

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: COLORS.bg }]}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <Animated.View style={[tw`px-4 pt-7`, { backgroundColor: COLORS.purple }, headerStyle]}>
                <Animated.View style={[tw`flex-row items-center justify-between`, headerTitleStyle]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[
                            tw`w-10 h-10 rounded-full items-center justify-center`,
                            { backgroundColor: "rgba(255,255,255,0.16)" },
                        ]}
                        activeOpacity={0.8}
                    >
                        <ChevronLeft size={20} color="#fff" />
                    </TouchableOpacity>

                    <View style={tw`flex-1 px-3 ml-4`}>
                        <Text style={[tw`text-white text-xl`, { fontFamily: FONT.b }]} numberOfLines={1}>
                            {selectedRetreat.title}
                        </Text>
                        <Text style={[tw`text-white/90 text-md mt-0.5`, { fontFamily: FONT.r }]} numberOfLines={1}>
                            Narrator: {selectedRetreat.instructor || "—"}
                        </Text>
                    </View>

                    <View style={tw`flex-row items-center`}>
                        <TouchableOpacity
                            onPress={() => setInfoOpen(true)}
                            style={[
                                tw`w-10 h-10 rounded-full items-center justify-center mr-2`,
                                { backgroundColor: "rgba(255,255,255,0.16)" },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Info size={18} color="#fff" />
                        </TouchableOpacity>

                    </View>
                </Animated.View>

                {/* decorative subtle wave */}
                <View style={[tw`absolute left-0 right-0 bottom-0`, { height: 32, opacity: 0.18 }]}>
                    <LinearGradient
                        colors={["rgba(255,255,255,0.0)", "rgba(255,255,255,0.25)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={tw`w-full h-full`}
                    />
                </View>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
                onScroll={(e) => {
                    const y = e.nativeEvent.contentOffset.y;
                    scrollY.value = y;
                }}
                scrollEventThrottle={16}
            >

                {/* VIDEO PLAYER */}
                {/* VIDEO PLAYER */}
                <View
                    style={[
                        Platform.OS === "web"
                            ? {
                                width: "100%",
                                maxWidth: 1100,   // desktop cinematic width
                                alignSelf: "center",
                                marginTop: 16,
                            }
                            : tw`px-4 mt-4`,
                    ]}
                >
                    <VideoPlayerCard
                        title={selectedRetreat.title}
                        videoUrl={selectedRetreat.videoUrl}
                        thumbnail={selectedRetreat.thumbnail}
                        initialPositionMillis={initialPos}
                        initialProgressPercent={progressPct}
                        onProgressCommit={(pct, pos, dur) => commitProgress(pct, pos, dur)}
                    />
                </View>

                {/* FEATURE STRIP */}
                <Animated.View style={tw`px-4 mt-4`} entering={FadeInUp.delay(260).duration(260)}>
                    <LinearGradient
                        colors={["rgba(106,27,154,0.12)", "rgba(59,130,246,0.08)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[tw`rounded-2xl p-4`, { borderWidth: 1, borderColor: "rgba(106,27,154,0.12)" }]}
                    >
                        <View style={tw`flex-row items-start`}>
                            <View style={[tw`w-11 h-11 items-center justify-center mr-3`]}>
                                <Lightbulb size={18} color={COLORS.purple} />
                            </View>

                            <View style={tw`flex-1`}>
                                <Text style={[tw`text-sm`, { fontFamily: FONT.b, color: COLORS.text }]}>Pro tip</Text>
                                <Text style={[tw`text-sm leading-6 mt-1`, { fontFamily: FONT.r, color: COLORS.sub }]}>
                                    Try breathing through the full session without rushing. If emotions rise, pause, then continue gently.
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                </Animated.View>

                {/* BOTTOM WELLNESS ANIMATION */}
                <View style={[tw`items-center justify-center py-10`]}>
                    <LottieView
                        source={require("../../../assets/animations/calm.json")}
                        autoPlay
                        loop
                        speed={1}
                        style={{ width: 250, height: 250 }}
                    />
                </View>

            </Animated.ScrollView>
            {/* INFO MODAL */}
            <InfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} retreat={selectedRetreat} />
        </SafeAreaView>
    );
}