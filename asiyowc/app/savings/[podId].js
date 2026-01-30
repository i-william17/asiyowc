// asiyowc/app/savings/[podId].js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Animated,
    Platform,
    Modal,
    Pressable,
    TextInput,
    Image
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import tw from "../../utils/tw";
import FeedShimmer from "../../components/ui/ShimmerLoader";
import LottieLoader from "../../components/animations/LottieLoader";

import {
    fetchPodById,
    joinPod,
    createContributionCheckout,
    clearCheckout,
} from "../../store/slices/savingsSlice";

/* ============================================================
   DROPDOWN OPTIONS (FROM SCHEMA)
============================================================ */

const CATEGORY_OPTIONS = [
    { label: "Emergency", value: "emergency", icon: "medical" },
    { label: "Investment", value: "investment", icon: "trending-up" },
    { label: "Education", value: "education", icon: "school" },
    { label: "Business", value: "business", icon: "briefcase" },
    { label: "Personal", value: "personal", icon: "person" },
    { label: "Group", value: "group", icon: "people" },
];

const PRIVACY_OPTIONS = [
    { label: "Public", value: "public", icon: "globe" },
    { label: "Private", value: "private", icon: "lock-closed" },
    { label: "Invite Only", value: "invite-only", icon: "mail" },
];

const FREQUENCY_OPTIONS = [
    { label: "Daily", value: "daily", icon: "calendar" },
    { label: "Weekly", value: "weekly", icon: "calendar" },
    { label: "Monthly", value: "monthly", icon: "calendar" },
    { label: "Custom", value: "custom", icon: "options" },
];

const POD_STATUS_OPTIONS = [
    { label: "Active", value: "active", icon: "checkmark-circle" },
    { label: "Paused", value: "paused", icon: "pause-circle" },
    { label: "Completed", value: "completed", icon: "trophy" },
    { label: "Cancelled", value: "cancelled", icon: "close-circle" },
];

const WITHDRAWAL_STATUS_OPTIONS = [
    { label: "Pending", value: "pending", icon: "time" },
    { label: "Approved", value: "approved", icon: "checkmark" },
    { label: "Rejected", value: "rejected", icon: "close" },
    { label: "Paid", value: "paid", icon: "cash" },
];

const CONTRIBUTION_STATUS_OPTIONS = [
    { label: "Pending", value: "pending", icon: "time" },
    { label: "Completed", value: "completed", icon: "checkmark-circle" },
    { label: "Failed", value: "failed", icon: "close-circle" },
];

const METHOD_OPTIONS = [
    { label: "M-Pesa", value: "mpesa", icon: "phone-portrait" },
    { label: "Bank", value: "bank", icon: "card" },
    { label: "Cash", value: "cash", icon: "cash" },
    { label: "Mobile", value: "mobile", icon: "phone-portrait" },
];

/* ============================================================
   HELPERS
============================================================ */

const safeMoney = (n) => {
    const val = Number(n || 0);
    if (Number.isNaN(val)) return 0;
    return val;
};

const fmtKES = (amount, currency = "KES") => {
    const v = safeMoney(amount);
    return `${currency} ${v.toLocaleString()}`;
};

const fmtDate = (d) => {
    if (!d) return "--";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "--";
    return dt.toLocaleDateString();
};

const fmtDateTime = (d) => {
    if (!d) return "--";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "--";
    return dt.toLocaleString();
};

const getId = (x) => {
    if (!x) return "";
    if (typeof x === "string") return x;
    if (typeof x === "object") return String(x._id || x.id || x.user || "");
    return String(x);
};

const getProfileName = (user) => {
    if (!user) return "Unknown";
    // backend: { profile: { fullName, avatar } } OR selected "profile.fullName"
    if (user.profile?.fullName) return user.profile.fullName;
    if (user["profile.fullName"]) return user["profile.fullName"];
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    return "Unknown";
};

const getAvatarUrl = (user) => {
    if (!user) return null;
    if (user.profile?.avatar?.url) return user.profile.avatar.url;
    if (user.avatar?.url) return user.avatar.url;
    if (typeof user.avatar === "string") return user.avatar;
    return null;
};

const findOption = (options, value) =>
    options.find((o) => o.value === value) || null;

/* ============================================================
   TIME FILTERING HELPER
============================================================ */

const filterByTime = (items, filter) => {
    if (filter === "all") return items;

    const now = Date.now();

    return items.filter((item) => {
        const time = new Date(item.date).getTime();
        if (Number.isNaN(time)) return false;

        const diff = now - time;

        switch (filter) {
            case "today":
                return diff <= 24 * 60 * 60 * 1000;
            case "week":
                return diff <= 7 * 24 * 60 * 60 * 1000;
            case "month":
                return diff <= 30 * 24 * 60 * 60 * 1000;
            default:
                return true;
        }
    });
};

/* ============================================================
   SMALL UI BUILDING BLOCKS
============================================================ */

const SectionTitle = ({ title, right }) => (
    <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={[tw`text-lg text-gray-900`, { fontFamily: "Poppins-Bold" }]}>
            {title}
        </Text>
        {right ? right : <View />}
    </View>
);

const Chip = ({ icon, text, bg = "bg-purple-100", color = "#6A1B9A" }) => (
    <View style={tw`flex-row items-center ${bg} px-3 py-1 rounded-full`}>
        <Ionicons name={icon} size={14} color={color} />
        <Text
            style={[
                tw`ml-2`,
                { fontFamily: "Poppins-Medium", fontSize: 12, color },
            ]}
        >
            {text}
        </Text>
    </View>
);

const Divider = () => <View style={tw`h-px bg-gray-100 my-4`} />;

const Stat = ({ label, value }) => (
    <View style={tw`items-center flex-1`}>
        <Text style={[tw`text-gray-400 text-sm`, { fontFamily: "Poppins-Regular" }]}>
            {label}
        </Text>
        <Text style={[tw`mt-1 text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
            {value}
        </Text>
    </View>
);

const Avatar = ({ uri, size = 40, nameFallback = "U" }) => {
    const initials = (nameFallback || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");

    return (
        <View
            style={[
                tw`items-center justify-center rounded-full bg-purple-100 overflow-hidden`,
                { width: size, height: size },
            ]}
        >
            {uri ? (
                <Image
                    source={{ uri }}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <Text
                    style={{
                        color: "#6A1B9A",
                        fontFamily: "Poppins-Bold",
                        fontSize: size * 0.4,
                    }}
                >
                    {initials || "U"}
                </Text>
            )}
        </View>
    );
};

/* ============================================================
   SIMPLE SELECT MODAL (NO EXTRA LIBS)
============================================================ */

const SelectModal = ({
    visible,
    title,
    options,
    value,
    onClose,
    onSelect,
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={tw`flex-1 bg-black/40`} onPress={onClose}>
                <Pressable
                    style={tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6`}
                    onPress={() => { }}
                >
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold" }]}>
                            {title}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={tw`p-2`}>
                            <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                        {options.map((opt) => {
                            const selected = opt.value === value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => {
                                        onSelect?.(opt.value);
                                        onClose?.();
                                    }}
                                    style={[
                                        tw`flex-row items-center justify-between px-4 py-4 rounded-2xl mb-2`,
                                        selected ? tw`bg-purple-50` : tw`bg-gray-50`,
                                    ]}
                                >
                                    <View style={tw`flex-row items-center`}>
                                        <Ionicons
                                            name={opt.icon || "options"}
                                            size={18}
                                            color={selected ? "#6A1B9A" : "#6B7280"}
                                        />
                                        <Text
                                            style={[
                                                tw`ml-3`,
                                                {
                                                    fontFamily: selected ? "Poppins-SemiBold" : "Poppins-Medium",
                                                    color: selected ? "#6A1B9A" : "#111827",
                                                },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </View>

                                    {selected && (
                                        <Ionicons name="checkmark" size={20} color="#6A1B9A" />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const ToggleTabs = ({ left, right, active, onChange }) => {
    return (
        <View style={tw`bg-white rounded-2xl p-2 shadow-sm flex-row`}>
            <TouchableOpacity
                onPress={() => onChange?.("left")}
                style={[
                    tw`flex-1 py-3 rounded-xl items-center`,
                    active === "left" ? tw`bg-purple-700` : tw`bg-transparent`,
                ]}
            >
                <Text
                    style={{
                        fontFamily: "Poppins-SemiBold",
                        color: active === "left" ? "#FFFFFF" : "#6B7280",
                    }}
                >
                    {left}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => onChange?.("right")}
                style={[
                    tw`flex-1 py-3 rounded-xl items-center`,
                    active === "right" ? tw`bg-purple-700` : tw`bg-transparent`,
                ]}
            >
                <Text
                    style={{
                        fontFamily: "Poppins-SemiBold",
                        color: active === "right" ? "#FFFFFF" : "#6B7280",
                    }}
                >
                    {right}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function PodDetailsScreen() {
    const { podId } = useLocalSearchParams();
    const router = useRouter();
    const dispatch = useDispatch();

    const token = useSelector((state) => state.auth.token);
    const currentUser = useSelector((state) => state.auth.user);
    const userId = currentUser?._id;

    const { activePod, checkout, loading, error } = useSelector(
        (state) => state.savings || {}
    );

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // checkout UI
    const [showCheckout, setShowCheckout] = useState(false);

    // members collapsible
    const [membersOpen, setMembersOpen] = useState(false);

    // toggle tabs
    const [historyTab, setHistoryTab] = useState("left"); // left=Contrib, right=Withdraw

    // settings sidebar
    const [showSettings, setShowSettings] = useState(false);
    const slideX = useRef(new Animated.Value(360)).current;

    // select modals
    const [selectState, setSelectState] = useState({
        open: false,
        title: "",
        options: [],
        value: "",
        key: "",
    });

    // collapsible sections in sidebar
    const [settingsCollapse, setSettingsCollapse] = useState({
        podSettings: true,
        contributionSettings: false,
        meta: false,
    });

    // contribution history UI
    const [showAllContributions, setShowAllContributions] = useState(false);
    const [timeFilter, setTimeFilter] = useState("all"); // "today" | "week" | "month" | "all"

    const maskId = (id, visible = 4) => {
        if (!id) return "••••••••";
        const str = String(id);
        if (str.length <= visible) return "••••••••";
        return `${"•".repeat(str.length - visible)}${str.slice(-visible)}`;
    };

    /* ============================================================
       LOAD POD
    ============================================================ */

    useEffect(() => {
        if (!podId || !token) return;

        dispatch(fetchPodById({ podId, token }));

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
        }).start();
    }, [podId, token, dispatch, fadeAnim]);

    /* ============================================================
       CHECKOUT HANDLING
    ============================================================ */

    // Fix 3: Safe redirect for web platform
    useEffect(() => {
        if (Platform.OS === "web" && checkout?.redirectUrl) {
            window.location.href = checkout.redirectUrl;
        }
    }, [checkout]);

    useEffect(() => {
        if (checkout?.redirectUrl) {
            setShowCheckout(true);
        }
    }, [checkout]);

    const refreshPod = useCallback(() => {
        if (!podId || !token) return;
        dispatch(fetchPodById({ podId, token }));
    }, [dispatch, podId, token]);

    const handleCheckoutClose = useCallback(() => {
        setShowCheckout(false);
        dispatch(clearCheckout());
        refreshPod();
    }, [dispatch, refreshPod]);

    const pod = activePod?.pod;
    const isMember = Boolean(activePod?.isMember);

    const normalized = useMemo(() => {
        if (!pod) {
            return {
                currency: "KES",
                targetAmount: 0,
                currentBalance: 0,
                remaining: 0,
                progress: 0,
                isGoalCompleted: false,
                myContribution: 0,
                creator: null,
                members: [],
                contributions: [],
                withdrawals: [],
                settings: {},
                cs: {},
                stats: {},
                status: "active",
                category: "group",
                deadline: null,
                goalDescription: "",
                podName: "",
                podDescription: "",
                createdAt: null,
                updatedAt: null,
                maxMembers: 0,
            };
        }

        const goal = pod.goal || {};
        const settings = pod.settings || {};
        const cs = pod.contributionSettings || {};
        const stats = pod.statistics || {};

        const currency = goal.currency || "KES";
        const targetAmount = safeMoney(goal.targetAmount);
        const currentBalance = safeMoney(pod.currentBalance);
        const remaining = Math.max(0, targetAmount - currentBalance);
        const rawProgress =
            targetAmount > 0
                ? (currentBalance / targetAmount) * 100
                : 0;

        // Fix 1: Use progress directly instead of normalized.progress
        const progress = Math.min(Number(rawProgress.toFixed(2)), 100);
        const isGoalCompleted = progress >= 100;

        const contributions = Array.isArray(pod.contributions) ? pod.contributions : [];

        const myContribution = contributions
            .filter((c) => getId(c.member) === String(userId))
            .reduce((sum, c) => sum + safeMoney(c.amount), 0);

        return {
            currency,
            targetAmount,
            currentBalance,
            remaining,
            progress,
            isGoalCompleted,
            myContribution,
            creator: pod.creator || null,
            members: Array.isArray(pod.members) ? pod.members : [],
            contributions,
            withdrawals: Array.isArray(pod.withdrawals) ? pod.withdrawals : [],
            settings,
            cs,
            stats,
            status: pod.status || "active",
            category: pod.category || "group",
            deadline: goal.deadline,
            goalDescription: goal.description || "",
            podName: pod.name || "Savings Pod",
            podDescription: pod.description || "",
            createdAt: pod.createdAt,
            updatedAt: pod.updatedAt,
            maxMembers: safeMoney(settings.maxMembers || 0),
        };
    }, [pod, userId]);

    // Fix 2: Declare isGoalCompleted in render scope
    const isGoalCompleted = normalized.isGoalCompleted;

    /* ============================================================
       ACTIONS
    ============================================================ */

    const handleJoin = () => {
        if (!token) return;
        dispatch(joinPod({ podId, token })).then(() => {
            // refresh to reflect membership
            refreshPod();
        });
    };

    const handleContribute = () => {
        if (!token) return;
        if (normalized.progress >= 100) return; // 🔒 hard stop

        dispatch(createContributionCheckout({ podId, token }));
    };

    /* ============================================================
       SETTINGS SIDEBAR ANIMATION
    ============================================================ */

    const openSettings = () => {
        setShowSettings(true);
        Animated.timing(slideX, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
        }).start();
    };

    const closeSettings = () => {
        Animated.timing(slideX, {
            toValue: 360,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setShowSettings(false));
    };

    /* ============================================================
       SETTINGS LOCAL STATE (UI ONLY)
       - You can wire these to an update endpoint later.
    ============================================================ */

    const [draft, setDraft] = useState(() => ({
        privacy: normalized.settings?.privacy || "invite-only",
        maxMembers: String(normalized.settings?.maxMembers ?? 20),
        allowWithdrawals: !!normalized.settings?.allowWithdrawals,
        requireApproval: !!normalized.settings?.requireApproval,
        frequency: normalized.cs?.frequency || "monthly",
        contributionAmount: String(normalized.cs?.amount ?? 0),
        autoDeduct: !!normalized.cs?.autoDeduct,
        status: normalized.status || "active",
        category: normalized.category || "group",
    }));

    // keep draft synced when pod changes
    useEffect(() => {
        setDraft({
            privacy: normalized.settings?.privacy || "invite-only",
            maxMembers: String(normalized.settings?.maxMembers ?? 20),
            allowWithdrawals: !!normalized.settings?.allowWithdrawals,
            requireApproval: !!normalized.settings?.requireApproval,
            frequency: normalized.cs?.frequency || "monthly",
            contributionAmount: String(normalized.cs?.amount ?? 0),
            autoDeduct: !!normalized.cs?.autoDeduct,
            status: normalized.status || "active",
            category: normalized.category || "group",
        });
    }, [normalized]);

    const openSelect = (key, title, options, value) => {
        setSelectState({ open: true, title, options, value, key });
    };

    const applySelect = (val) => {
        const key = selectState.key;
        if (!key) return;
        setDraft((p) => ({ ...p, [key]: val }));
    };

    /* ============================================================
       RENDER HELPERS (MEMBERS / USERS)
    ============================================================ */

    const renderUserRow = (u, subtitle, right) => {
        const name = getProfileName(u);
        const avatar = getAvatarUrl(u);
        return (
            <View style={tw`flex-row items-center justify-between py-3`}>
                <View style={tw`flex-row items-center flex-1 pr-3`}>
                    <Avatar uri={avatar} nameFallback={name} size={42} />
                    <View style={tw`ml-3 flex-1`}>
                        <Text
                            numberOfLines={1}
                            style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}
                        >
                            {name}
                        </Text>
                        {subtitle ? (
                            <Text
                                numberOfLines={1}
                                style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}
                            >
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>
                </View>
                {right ? right : null}
            </View>
        );
    };

    const creatorName = getProfileName(normalized.creator);
    const creatorAvatar = getAvatarUrl(normalized.creator);

    /* ============================================================
       CONTRIBUTIONS & WITHDRAWALS LISTS
    ============================================================ */

    const contributionItems = useMemo(() => {
        const arr = normalized.contributions.slice().reverse();
        return arr.map((c) => {
            const memberObj = c.member && typeof c.member === "object" ? c.member : null;

            // if not populated, try match from members
            const memberId = getId(c.member);
            const memberFromMembers =
                normalized.members.find((m) => getId(m.user) === memberId)?.user || null;

            const u = memberObj || memberFromMembers || null;

            const statusOpt = findOption(CONTRIBUTION_STATUS_OPTIONS, c.status);
            const methodOpt = findOption(METHOD_OPTIONS, c.method);

            return {
                _id: c._id || `${memberId}-${c.date}-${c.amount}`,
                user: u,
                amount: safeMoney(c.amount),
                date: c.date,
                status: c.status,
                method: c.method,
                statusLabel: statusOpt?.label || String(c.status || "completed"),
                methodLabel: methodOpt?.label || String(c.method || "mpesa"),
            };
        });
    }, [normalized.contributions, normalized.members]);

    // Derived filtered contributions based on time filter
    const filteredContributions = useMemo(() => {
        return filterByTime(contributionItems, timeFilter);
    }, [contributionItems, timeFilter]);

    // Visible contributions (10 items by default, or all if showAllContributions is true)
    const visibleContributions = useMemo(() => {
        if (showAllContributions) return filteredContributions;
        return filteredContributions.slice(0, 10);
    }, [filteredContributions, showAllContributions]);

    const withdrawalItems = useMemo(() => {
        const arr = normalized.withdrawals.slice().reverse();
        return arr.map((w) => {
            const memberObj = w.member && typeof w.member === "object" ? w.member : null;
            const memberId = getId(w.member);
            const memberFromMembers =
                normalized.members.find((m) => getId(m.user) === memberId)?.user || null;

            const approvedObj = w.approvedBy && typeof w.approvedBy === "object" ? w.approvedBy : null;

            const statusOpt = findOption(WITHDRAWAL_STATUS_OPTIONS, w.status);

            return {
                _id: w._id || `${memberId}-${w.date}-${w.amount}`,
                user: memberObj || memberFromMembers || null,
                approvedBy: approvedObj || null,
                amount: safeMoney(w.amount),
                date: w.date,
                purpose: w.purpose || "",
                status: w.status,
                statusLabel: statusOpt?.label || String(w.status || "pending"),
            };
        });
    }, [normalized.withdrawals, normalized.members]);

    /* ============================================================
       LOADING / ERROR GUARDS
    ============================================================ */

    if (loading || !activePod?.pod) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`}>
                <View style={tw`px-6 pt-16`}>
                    <FeedShimmer />
                </View>
            </SafeAreaView>
        );
    }

    /* ============================================================
       UI
    ============================================================ */

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* ================= SETTINGS SIDEBAR MODAL ================= */}
            <Modal visible={showSettings} transparent animationType="none">
                <Pressable style={tw`flex-1 bg-black/40`} onPress={closeSettings}>
                    <Pressable style={tw`flex-1`} onPress={() => { }}>
                        <Animated.View
                            style={[
                                tw`absolute top-0 right-0 bottom-0 w-11/12 bg-white`,
                                {
                                    transform: [{ translateX: slideX }],
                                    borderTopLeftRadius: 24,
                                    borderBottomLeftRadius: 24,
                                },
                            ]}
                        >
                            <SafeAreaView style={tw`flex-1`}>
                                {/* Sidebar header */}
                                <View style={tw`px-5 pt-4 pb-4 border-b border-gray-100`}>
                                    <View style={tw`flex-row items-center justify-between`}>
                                        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold" }]}>
                                            Pod Settings
                                        </Text>
                                        <TouchableOpacity onPress={closeSettings} style={tw`p-2`}>
                                            <Ionicons name="close" size={22} color="#111827" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[tw`text-gray-500 mt-1`, { fontFamily: "Poppins-Regular" }]}>
                                        These controls are UI-ready. Wire them to an update endpoint later.
                                    </Text>
                                </View>

                                <ScrollView
                                    style={tw`flex-1`}
                                    contentContainerStyle={tw`px-5 pb-10`}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {/* ================= POD SETTINGS ================= */}
                                    <TouchableOpacity
                                        onPress={() =>
                                            setSettingsCollapse((p) => ({ ...p, podSettings: !p.podSettings }))
                                        }
                                        style={tw`flex-row items-center justify-between mt-6`}
                                    >
                                        <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold" }]}>
                                            Settings
                                        </Text>
                                        <Ionicons
                                            name={settingsCollapse.podSettings ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#6B7280"
                                        />
                                    </TouchableOpacity>

                                    {settingsCollapse.podSettings && (
                                        <View style={tw`mt-4 bg-gray-50 rounded-2xl p-4`}>
                                            {/* Privacy */}
                                            <RowSelect
                                                label="Privacy"
                                                valueLabel={findOption(PRIVACY_OPTIONS, draft.privacy)?.label || draft.privacy}
                                                icon="lock-closed"
                                                onPress={() =>
                                                    openSelect("privacy", "Privacy", PRIVACY_OPTIONS, draft.privacy)
                                                }
                                            />

                                            <Divider />

                                            {/* Max members */}
                                            <RowInput
                                                label="Max Members"
                                                icon="people"
                                                value={draft.maxMembers}
                                                keyboardType="number-pad"
                                                onChangeText={(t) => setDraft((p) => ({ ...p, maxMembers: t }))}
                                            />

                                            <Divider />

                                            {/* Allow withdrawals */}
                                            <RowToggle
                                                label="Allow Withdrawals"
                                                icon="cash"
                                                value={draft.allowWithdrawals}
                                                onToggle={() =>
                                                    setDraft((p) => ({ ...p, allowWithdrawals: !p.allowWithdrawals }))
                                                }
                                            />

                                            <Divider />

                                            {/* Require approval */}
                                            <RowToggle
                                                label="Require Approval"
                                                icon="checkmark-done"
                                                value={draft.requireApproval}
                                                onToggle={() =>
                                                    setDraft((p) => ({ ...p, requireApproval: !p.requireApproval }))
                                                }
                                            />

                                            <Divider />

                                            {/* Category */}
                                            <RowSelect
                                                label="Category"
                                                valueLabel={
                                                    findOption(CATEGORY_OPTIONS, draft.category)?.label || draft.category
                                                }
                                                icon="pricetag"
                                                onPress={() =>
                                                    openSelect("category", "Category", CATEGORY_OPTIONS, draft.category)
                                                }
                                            />

                                            <Divider />

                                            {/* Status */}
                                            <RowSelect
                                                label="Status"
                                                valueLabel={
                                                    findOption(POD_STATUS_OPTIONS, draft.status)?.label || draft.status
                                                }
                                                icon="pulse"
                                                onPress={() =>
                                                    openSelect("status", "Status", POD_STATUS_OPTIONS, draft.status)
                                                }
                                            />
                                        </View>
                                    )}

                                    {/* ================= CONTRIBUTION SETTINGS ================= */}
                                    <TouchableOpacity
                                        onPress={() =>
                                            setSettingsCollapse((p) => ({
                                                ...p,
                                                contributionSettings: !p.contributionSettings,
                                            }))
                                        }
                                        style={tw`flex-row items-center justify-between mt-7`}
                                    >
                                        <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold" }]}>
                                            Contribution Settings
                                        </Text>
                                        <Ionicons
                                            name={settingsCollapse.contributionSettings ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#6B7280"
                                        />
                                    </TouchableOpacity>

                                    {settingsCollapse.contributionSettings && (
                                        <View style={tw`mt-4 bg-gray-50 rounded-2xl p-4`}>
                                            <RowSelect
                                                label="Frequency"
                                                valueLabel={
                                                    findOption(FREQUENCY_OPTIONS, draft.frequency)?.label || draft.frequency
                                                }
                                                icon="calendar"
                                                onPress={() =>
                                                    openSelect("frequency", "Frequency", FREQUENCY_OPTIONS, draft.frequency)
                                                }
                                            />

                                            <Divider />

                                            <RowInput
                                                label="Amount"
                                                icon="cash"
                                                value={draft.contributionAmount}
                                                keyboardType="number-pad"
                                                onChangeText={(t) =>
                                                    setDraft((p) => ({ ...p, contributionAmount: t }))
                                                }
                                            />

                                            <Divider />

                                            <RowToggle
                                                label="Auto Deduct"
                                                icon="flash"
                                                value={draft.autoDeduct}
                                                onToggle={() => setDraft((p) => ({ ...p, autoDeduct: !p.autoDeduct }))}
                                            />
                                        </View>
                                    )}

                                    {/* ================= META ================= */}
                                    <TouchableOpacity
                                        onPress={() => setSettingsCollapse((p) => ({ ...p, meta: !p.meta }))}
                                        style={tw`flex-row items-center justify-between mt-7`}
                                    >
                                        <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold" }]}>
                                            Meta
                                        </Text>
                                        <Ionicons
                                            name={settingsCollapse.meta ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#6B7280"
                                        />
                                    </TouchableOpacity>

                                    {settingsCollapse.meta && (
                                        <View style={tw`mt-4 bg-gray-50 rounded-2xl p-4`}>
                                            <MetaRow label="Pod ID" value={String(pod._id)} />
                                            <MetaRow label="Created At" value={fmtDateTime(normalized.createdAt)} />
                                            <MetaRow label="Updated At" value={fmtDateTime(normalized.updatedAt)} />
                                            <MetaRow
                                                label="Active Members"
                                                value={String(normalized.stats?.activeMembers ?? normalized.members.length)}
                                            />
                                        </View>
                                    )}

                                    <View style={tw`mt-10`}>
                                        <TouchableOpacity
                                            onPress={closeSettings}
                                            style={tw`bg-purple-700 py-4 rounded-2xl`}
                                            activeOpacity={0.85}
                                        >
                                            <Text
                                                style={[
                                                    tw`text-white text-center`,
                                                    { fontFamily: "Poppins-SemiBold" },
                                                ]}
                                            >
                                                Done
                                            </Text>
                                        </TouchableOpacity>

                                        <Text
                                            style={[
                                                tw`text-gray-400 text-xs text-center mt-3`,
                                                { fontFamily: "Poppins-Regular" },
                                            ]}
                                        >
                                            Saving these settings requires an update endpoint. UI is ready.
                                        </Text>
                                    </View>
                                </ScrollView>
                            </SafeAreaView>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ================= SELECT MODAL ================= */}
            <SelectModal
                visible={selectState.open}
                title={selectState.title}
                options={selectState.options}
                value={selectState.value}
                onClose={() => setSelectState((p) => ({ ...p, open: false }))}
                onSelect={(v) => applySelect(v)}
            />

            {/* ================= CHECKOUT MODAL ================= */}
            {showCheckout && checkout?.redirectUrl && (
                <Modal visible animationType="slide">
                    <SafeAreaView style={tw`flex-1 bg-white`}>
                        {/* Fix 3: Simplified web redirect handling */}
                        {Platform.OS !== "web" && (
                            <WebView
                                source={{ uri: checkout.redirectUrl }}
                                startInLoadingState
                                renderLoading={() => (
                                    <View style={tw`flex-1 items-center justify-center`}>
                                        <FeedShimmer />
                                    </View>
                                )}
                                onNavigationStateChange={(nav) => {
                                    if (
                                        nav.url?.includes("payment-complete") ||
                                        nav.url?.toLowerCase().includes("success")
                                    ) {
                                        handleCheckoutClose();
                                    }
                                }}
                            />
                        )}
                    </SafeAreaView>
                </Modal>
            )}

            {/* ================= MAIN SCROLL ================= */}
            <Animated.ScrollView style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
                {/* ================= HEADER ================= */}
                <LinearGradient
                    colors={["#6A1B9A", "#6A1B9A"]}
                    style={tw`px-6 pt-16 pb-10 rounded-b-3xl`}
                >
                    <View style={tw`flex-row items-center justify-between`}>
                        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={openSettings} style={tw`p-2 -mr-2`}>
                            <Ionicons name="settings-outline" size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text
                        style={[tw`text-white text-2xl mt-4`, { fontFamily: "Poppins-Bold" }]}
                    >
                        {normalized.podName}
                    </Text>

                    <Text
                        style={[
                            tw`text-white opacity-90 mt-1`,
                            { fontFamily: "Poppins-Regular" },
                        ]}
                    >
                        {normalized.podDescription}
                    </Text>

                    <View style={tw`flex-row items-center mt-4 flex-wrap`}>
                        <Chip
                            icon={findOption(CATEGORY_OPTIONS, normalized.category)?.icon || "pricetag"}
                            text={findOption(CATEGORY_OPTIONS, normalized.category)?.label || normalized.category}
                            bg="bg-white/20"
                            color="#FFFFFF"
                        />
                        <View style={tw`w-2`} />
                        <Chip
                            icon={findOption(POD_STATUS_OPTIONS, normalized.status)?.icon || "pulse"}
                            text={findOption(POD_STATUS_OPTIONS, normalized.status)?.label || normalized.status}
                            bg="bg-white/20"
                            color="#FFFFFF"
                        />
                        <View style={tw`w-2`} />
                        <Chip
                            icon={findOption(PRIVACY_OPTIONS, normalized.settings?.privacy)?.icon || "lock-closed"}
                            text={
                                findOption(PRIVACY_OPTIONS, normalized.settings?.privacy)?.label ||
                                normalized.settings?.privacy ||
                                "invite-only"
                            }
                            bg="bg-white/20"
                            color="#FFFFFF"
                        />
                    </View>
                </LinearGradient>

                {/* ================= SUMMARY CARD ================= */}
                <View style={tw`px-6 -mt-6`}>
                    <View style={tw`bg-white rounded-2xl p-6 shadow-sm`}>
                        <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                            Total Saved
                        </Text>
                        <Text style={[tw`text-3xl`, { color: "#6A1B9A", fontFamily: "Poppins-Bold" }]}>
                            {fmtKES(normalized.currentBalance, normalized.currency)}
                        </Text>

                        {/* Progress */}
                        <View style={tw`mt-4`}>
                            <View style={tw`h-3 bg-gray-200 rounded-full overflow-hidden`}>
                                <View
                                    style={{
                                        width: `${normalized.progress}%`,
                                        height: "100%",
                                        backgroundColor: "#6A1B9A",
                                    }}
                                />
                            </View>

                            <View style={tw`flex-row items-center justify-between mt-2`}>
                                <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                                    {normalized.progress}% of {fmtKES(normalized.targetAmount, normalized.currency)}
                                </Text>
                                <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                                    Remaining: {fmtKES(normalized.remaining, normalized.currency)}
                                </Text>
                            </View>
                        </View>

                        {/* mini stats */}
                        <View style={tw`flex-row justify-between mt-6`}>
                            <Stat label="Members" value={String(normalized.members.length)} />
                            <Stat label="My Contribution" value={fmtKES(normalized.myContribution, normalized.currency)} />
                            <Stat label="Deadline" value={fmtDate(normalized.deadline)} />
                        </View>

                        {/* goal description */}
                        {!!normalized.goalDescription && (
                            <>
                                <Divider />
                                <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
                                    Goal
                                </Text>
                                <Text
                                    style={[
                                        tw`text-gray-600 mt-1`,
                                        { fontFamily: "Poppins-Regular" },
                                    ]}
                                >
                                    {normalized.goalDescription}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* ================= CREATOR ================= */}
                <View style={tw`px-6 mt-8`}>
                    <SectionTitle
                        title="Creator"
                        right={
                            <View style={tw`flex-row items-center`}>
                                <Ionicons name="person-circle-outline" size={18} color="#6B7280" />
                            </View>
                        }
                    />
                    <View style={tw`bg-white rounded-2xl p-4 shadow-sm`}>
                        {renderUserRow(
                            normalized.creator,
                            `User ID: ${maskId(getId(normalized.creator))}`,
                            <Chip icon="sparkles" text="Owner" bg="bg-purple-100" color="#6A1B9A" />
                        )}
                    </View>
                </View>

                {/* ================= MEMBERS (COLLAPSIBLE) ================= */}
                <View style={tw`px-6 mt-8`}>
                    <SectionTitle
                        title={`Members (${normalized.members.length}/${normalized.maxMembers || 20})`}
                        right={
                            <TouchableOpacity
                                onPress={() => setMembersOpen((p) => !p)}
                                style={tw`flex-row items-center`}
                            >
                                <Text style={[tw`text-gray-500 mr-2`, { fontFamily: "Poppins-Medium" }]}>
                                    {membersOpen ? "Hide" : "Show"}
                                </Text>
                                <Ionicons
                                    name={membersOpen ? "chevron-up" : "chevron-down"}
                                    size={18}
                                    color="#6B7280"
                                />
                            </TouchableOpacity>
                        }
                    />

                    <View style={tw`bg-white rounded-2xl p-4 shadow-sm`}>
                        {/* always show count summary */}
                        <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[tw`text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
                                Active Members
                            </Text>
                            <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
                                {String(normalized.stats?.activeMembers ?? normalized.members.length)}
                            </Text>
                        </View>

                        {membersOpen && (
                            <>
                                <Divider />
                                {normalized.members
                                    .filter((m) => m?.isActive !== false)
                                    .map((m, idx) => {
                                        const u = m.user && typeof m.user === "object" ? m.user : null;
                                        const role = m.role || "member";
                                        const joinedAt = m.joinedAt ? fmtDate(m.joinedAt) : "--";
                                        const badge =
                                            role === "admin"
                                                ? <Chip icon="shield-checkmark" text="Admin" bg="bg-purple-100" color="#6A1B9A" />
                                                : <Chip icon="person" text="Member" bg="bg-gray-100" color="#111827" />;

                                        return (
                                            <View key={m._id || idx}>
                                                {renderUserRow(u, `Joined: ${joinedAt}`, badge)}
                                                {idx !== normalized.members.length - 1 ? (
                                                    <View style={tw`h-px bg-gray-100`} />
                                                ) : null}
                                            </View>
                                        );
                                    })}
                            </>
                        )}
                    </View>
                </View>

                {/* ================= PRIMARY ACTIONS ================= */}
                <View style={tw`px-6 mt-8`}>
                    {error ? (
                        <View style={tw`bg-red-50 border border-red-100 rounded-2xl p-4 mb-4`}>
                            <Text style={[tw`text-red-700`, { fontFamily: "Poppins-Medium" }]}>
                                {String(error)}
                            </Text>
                        </View>
                    ) : null}

                    {!isMember ? (
                        <TouchableOpacity
                            onPress={handleJoin}
                            style={tw`bg-gray-900 py-4 rounded-2xl`}
                            activeOpacity={0.85}
                        >
                            <Text style={[tw`text-white text-center`, { fontFamily: "Poppins-SemiBold" }]}>
                                Join Pod
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            <View style={tw`flex-row`}>
                                <TouchableOpacity
                                    onPress={handleContribute}
                                    disabled={isGoalCompleted}
                                    activeOpacity={isGoalCompleted ? 1 : 0.85}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: isGoalCompleted }}
                                    style={[
                                        tw`flex-1 py-4 rounded-2xl`,
                                        isGoalCompleted ? tw`bg-gray-300` : tw`bg-green-600`,
                                    ]}
                                >
                                    <Text
                                        style={{
                                            fontFamily: "Poppins-SemiBold",
                                            color: isGoalCompleted ? "#6B7280" : "#FFFFFF",
                                            textAlign: "center",
                                        }}
                                    >
                                        {isGoalCompleted ? "Goal Reached" : "Contribute"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Fix 4: Move goal reached text outside the flex row */}
                            {isGoalCompleted && (
                                <Text
                                    style={[
                                        tw`text-xs text-center mt-3`,
                                        { fontFamily: "Poppins-Regular", color: "#9CA3AF" },
                                    ]}
                                >
                                    This savings goal has been fully funded
                                </Text>
                            )}
                        </View>
                    )}

                    {isMember && (
                        <Text
                            style={[
                                tw`text-gray-400 text-xs mt-3 text-center`,
                                { fontFamily: "Poppins-Regular" },
                            ]}
                        >
                            Payments open the checkout page. You'll return here when complete.
                        </Text>
                    )}
                </View>

                {/* ================= HISTORY TOGGLE ================= */}
                <View style={tw`px-6 mt-10`}>
                    <ToggleTabs
                        left="Contributions"
                        right="Withdrawals"
                        active={historyTab}
                        onChange={setHistoryTab}
                    />
                </View>

                {/* ================= CONTRIBUTIONS / WITHDRAWALS LIST ================= */}
                <View style={tw`px-6 mt-6 pb-14`}>
                    {historyTab === "left" ? (
                        <>
                            <SectionTitle title="Contribution History" />
                            
                            {/* ================= CONTRIBUTION FILTERS ================= */}
                            <View style={tw`flex-row items-center justify-between mb-4`}>
                                <View style={tw`flex-row flex-wrap`}>
                                    {[
                                        { label: "Today", value: "today" },
                                        { label: "Week", value: "week" },
                                        { label: "Month", value: "month" },
                                        { label: "All time", value: "all" },
                                    ].map((f) => (
                                        <TouchableOpacity
                                            key={f.value}
                                            onPress={() => {
                                                setTimeFilter(f.value);
                                                setShowAllContributions(false);
                                            }}
                                            style={[
                                                tw`px-3 py-1 rounded-full mr-2 mb-2`,
                                                timeFilter === f.value
                                                    ? tw`bg-purple-600`
                                                    : tw`bg-gray-100`,
                                            ]}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: "Poppins-Medium",
                                                    fontSize: 12,
                                                    color: timeFilter === f.value ? "#FFFFFF" : "#374151",
                                                }}
                                            >
                                                {f.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {visibleContributions.length === 0 ? (
                                <EmptyState
                                    title="No contributions yet"
                                    subtitle="Contributions will appear here once members start saving."
                                />
                            ) : (
                                <>
                                    {visibleContributions.map((txn) => (
                                        <HistoryCard
                                            key={txn._id}
                                            title={fmtKES(txn.amount, normalized.currency)}
                                            subtitle={fmtDateTime(txn.date)}
                                            leftUser={txn.user}
                                            chips={[
                                                { icon: findOption(METHOD_OPTIONS, txn.method)?.icon || "phone-portrait", text: txn.methodLabel },
                                                { icon: findOption(CONTRIBUTION_STATUS_OPTIONS, txn.status)?.icon || "checkmark-circle", text: txn.statusLabel },
                                            ]}
                                        />
                                    ))}
                                    
                                    {/* Show All / Hide toggle */}
                                    {filteredContributions.length > 10 && (
                                        <TouchableOpacity
                                            onPress={() => setShowAllContributions((p) => !p)}
                                            style={tw`mt-4 items-center`}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: "Poppins-SemiBold",
                                                    color: "#6A1B9A",
                                                }}
                                            >
                                                {showAllContributions ? "Hide" : `Show all (${filteredContributions.length})`}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <SectionTitle title="Withdrawals" />
                            {withdrawalItems.length === 0 ? (
                                <EmptyState
                                    title="No withdrawals yet"
                                    subtitle="If withdrawals happen, they'll show here."
                                />
                            ) : (
                                withdrawalItems.map((w) => (
                                    <HistoryCard
                                        key={w._id}
                                        title={fmtKES(w.amount, normalized.currency)}
                                        subtitle={fmtDateTime(w.date)}
                                        leftUser={w.user}
                                        chips={[
                                            { icon: findOption(WITHDRAWAL_STATUS_OPTIONS, w.status)?.icon || "time", text: w.statusLabel },
                                            ...(w.purpose ? [{ icon: "document-text", text: "Purpose" }] : []),
                                        ]}
                                        extra={w.purpose ? (
                                            <Text style={[tw`text-gray-600 mt-2`, { fontFamily: "Poppins-Regular" }]}>
                                                {w.purpose}
                                            </Text>
                                        ) : null}
                                    />
                                ))
                            )}
                        </>
                    )}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

/* ============================================================
   SUBCOMPONENTS (FOR READABILITY + LOTS OF UI)
============================================================ */

const RowSelect = ({ label, valueLabel, icon, onPress }) => (
    <TouchableOpacity onPress={onPress} style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
            <View style={tw`w-9 h-9 rounded-xl bg-white items-center justify-center`}>
                <Ionicons name={icon || "options"} size={18} color="#6A1B9A" />
            </View>
            <View style={tw`ml-3`}>
                <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
                    {label}
                </Text>
                <Text style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                    {valueLabel}
                </Text>
            </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
);

const RowInput = ({ label, icon, value, onChangeText, keyboardType }) => (
    <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
            <View style={tw`w-9 h-9 rounded-xl bg-white items-center justify-center`}>
                <Ionicons name={icon || "create-outline"} size={18} color="#6A1B9A" />
            </View>
            <View style={tw`ml-3`}>
                <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
                    {label}
                </Text>
                <Text style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                    Tap to edit
                </Text>
            </View>
        </View>

        <TextInput
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType || "default"}
            style={[
                tw`px-3 py-2 rounded-xl bg-white text-gray-900`,
                { fontFamily: "Poppins-SemiBold", minWidth: 90, textAlign: "right" },
            ]}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
        />
    </View>
);

const RowToggle = ({ label, icon, value, onToggle }) => (
    <TouchableOpacity onPress={onToggle} style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
            <View style={tw`w-9 h-9 rounded-xl bg-white items-center justify-center`}>
                <Ionicons name={icon || "toggle"} size={18} color="#6A1B9A" />
            </View>
            <View style={tw`ml-3`}>
                <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}>
                    {label}
                </Text>
                <Text style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                    {value ? "Enabled" : "Disabled"}
                </Text>
            </View>
        </View>

        <View
            style={[
                tw`w-12 h-7 rounded-full p-1`,
                { backgroundColor: value ? "#6A1B9A" : "#E5E7EB" },
            ]}
        >
            <View
                style={[
                    tw`w-5 h-5 rounded-full bg-white`,
                    { alignSelf: value ? "flex-end" : "flex-start" },
                ]}
            />
        </View>
    </TouchableOpacity>
);

const MetaRow = ({ label, value }) => (
    <View style={tw`py-2`}>
        <Text style={[tw`text-gray-400 text-xs`, { fontFamily: "Poppins-Regular" }]}>
            {label}
        </Text>
        <Text style={[tw`text-gray-900 mt-1`, { fontFamily: "Poppins-SemiBold" }]}>
            {value || "--"}
        </Text>
    </View>
);

const EmptyState = ({ title, subtitle }) => (
    <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
        <LottieLoader type="savings" size={120} loop={false} />
        <Text style={[tw`text-gray-600 mt-4`, { fontFamily: "Poppins-SemiBold" }]}>
            {title}
        </Text>
        <Text
            style={[
                tw`text-gray-400 mt-2 text-center`,
                { fontFamily: "Poppins-Regular" },
            ]}
        >
            {subtitle}
        </Text>
    </View>
);

const HistoryCard = ({ title, subtitle, leftUser, chips = [], extra }) => {
    const name = getProfileName(leftUser);
    const avatar = getAvatarUrl(leftUser);

    return (
        <View style={tw`bg-white rounded-2xl p-4 mb-3 shadow-sm`}>
            <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center flex-1 pr-3`}>
                    <Avatar
                        uri={avatar}
                        nameFallback={name}
                        size={40}
                    />

                    <View style={tw`ml-3 flex-1`}>
                        <Text
                            numberOfLines={1}
                            style={[tw`text-gray-900`, { fontFamily: "Poppins-SemiBold" }]}
                        >
                            {name}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}
                        >
                            {subtitle}
                        </Text>
                    </View>
                </View>

                <View style={tw`items-end`}>
                    <Text style={[tw`text-gray-900`, { fontFamily: "Poppins-Bold" }]}>
                        {title}
                    </Text>
                </View>
            </View>

            {chips.length > 0 && (
                <View style={tw`flex-row flex-wrap mt-3`}>
                    {chips.map((c, idx) => (
                        <View key={`${c.text}-${idx}`} style={tw`mr-2 mb-2`}>
                            <Chip icon={c.icon || "options"} text={c.text} bg="bg-gray-100" color="#111827" />
                        </View>
                    ))}
                </View>
            )}

            {extra ? extra : null}
        </View>
    );
};