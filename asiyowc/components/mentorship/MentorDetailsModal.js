// components/mentorship/MentorDetailsScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Modal,
  Platform,
  Linking,
  Share,
  Alert,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";

import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Star,
  StarHalf,
  Clock,
  BookOpen,
  Users,
  Video,
  BadgeCheck,
  BadgeX,
  ExternalLink,
  Share2,
  MessageCircle,
  Calendar,
  Info,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  Lightbulb,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  MapPin,
  Globe,
  Phone,
  Mail,
  Timer,
  Eye,
} from "lucide-react-native";

import tw from "../../utils/tw";

// ✅ 1️⃣ IMPORTS (add once at top)
import ConfirmModal from "../../components/community/ConfirmModal";
import { createOrGetDMChat } from "../../store/slices/communitySlice";

/* ============================================================
   CONSTANTS / HELPERS
============================================================ */

const { width: SCREEN_W } = Dimensions.get("window");

const PURPLE = "#6A1B9A";
const DEEP_PURPLE_1 = "#6A1B9A";
const DEEP_PURPLE_2 = "#6A1B9A";
const GOLD = "#FFD700";

const safeNum = (n, fallback = 0) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
};

const formatCount = (n) => {
  const x = safeNum(n, 0);
  try {
    return new Intl.NumberFormat().format(x);
  } catch {
    return String(x);
  }
};

const formatDate = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const isValidHttpUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return /^https?:\/\/.+/i.test(url.trim());
};

const providerLabel = (p) => {
  if (!p) return "Other";
  const x = String(p).toLowerCase();
  if (x === "drive") return "Google Drive";
  if (x === "dropbox") return "Dropbox";
  if (x === "onedrive") return "OneDrive";
  return "Other";
};

const timeSlotLabel = (from, to) => {
  const f = from || "--:--";
  const t = to || "--:--";
  return `${f} - ${t}`;
};

const weekdayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const sortAvailability = (arr = []) => {
  const copy = Array.isArray(arr) ? [...arr] : [];
  copy.sort((a, b) => {
    const ai = weekdayOrder.indexOf(String(a.day || "").toLowerCase());
    const bi = weekdayOrder.indexOf(String(b.day || "").toLowerCase());
    const aa = ai === -1 ? 999 : ai;
    const bb = bi === -1 ? 999 : bi;
    if (aa !== bb) return aa - bb;
    return String(a.from || "").localeCompare(String(b.from || ""));
  });
  return copy;
};

const getStarSegments = (rating) => {
  // returns array of 5 items: "full" | "half" | "empty"
  const r = clamp(safeNum(rating, 0), 0, 5);
  const full = Math.floor(r);
  const frac = r - full;
  const half = frac >= 0.25 && frac < 0.75 ? 1 : 0;
  const extraFull = frac >= 0.75 ? 1 : 0;

  const result = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) result.push("full");
    else if (i === full && extraFull === 1) result.push("full");
    else if (i === full && half === 1) result.push("half");
    else result.push("empty");
  }
  return result;
};

/* ============================================================
   MINI UI HELPERS (NO STYLE CHANGES: reuse tw + gradients)
============================================================ */

const SectionTitle = React.memo(({ icon: Icon, title, subtitle }) => (
  <View style={tw`flex-row items-start justify-between`}>
    <View style={tw`flex-row items-center`}>
      {Icon ? <Icon size={18} color={PURPLE} /> : null}
      <Text style={[tw`ml-2 text-purple-900`, { fontFamily: "Poppins-Bold" }]}>
        {title}
      </Text>
    </View>
    {!!subtitle && (
      <Text style={[tw`text-gray-500 text-xs`, { fontFamily: "Poppins-Regular" }]}>
        {subtitle}
      </Text>
    )}
  </View>
));

const Divider = React.memo(() => <View style={tw`h-[1px] bg-gray-200 my-4`} />);

const Chip = React.memo(({ text, tone = "purple" }) => {
  const base = tw`px-3 py-1 rounded-full mr-2 mb-2`;
  const toneStyle =
    tone === "purple"
      ? tw`bg-purple-100`
      : tone === "gold"
      ? tw`bg-amber-100`
      : tone === "green"
      ? tw`bg-green-100`
      : tw`bg-gray-100`;

  const textStyle =
    tone === "purple"
      ? tw`text-purple-800`
      : tone === "gold"
      ? tw`text-amber-800`
      : tone === "green"
      ? tw`text-green-800`
      : tw`text-gray-700`;

  return (
    <View style={[base, toneStyle]}>
      <Text style={[textStyle, { fontFamily: "Poppins-SemiBold", fontSize: 12 }]}>
        {text}
      </Text>
    </View>
  );
});

const StatPill = React.memo(({ label, value, icon: Icon, gradient }) => (
  <LinearGradient
    colors={gradient || ["#F5F3FF", "#FFFFFF"]}
    style={tw`flex-1 rounded-xl p-3 mr-2`}
  >
    <View style={tw`flex-row items-center justify-between`}>
      <View>
        <Text style={[tw`text-gray-600 text-xs`, { fontFamily: "Poppins-Regular" }]}>
          {label}
        </Text>
        <Text style={[tw`text-purple-900 text-lg`, { fontFamily: "Poppins-Bold" }]}>
          {value}
        </Text>
      </View>
      {Icon ? <Icon size={18} color="#6B7280" /> : null}
    </View>
  </LinearGradient>
));

/* ============================================================
   SCREEN
============================================================ */

export default function MentorDetailsScreen() {
  const router = useRouter();
  const { mentorId } = useLocalSearchParams();
  
  // ✅ 2️⃣ STATE (add once inside component)
  const dispatch = useDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const scrollRef = useRef(null);

  const { mentors, loading } = useSelector((s) => s.mentorship || {});
  const { token } = useSelector((s) => s.auth || {});

  const [showDocs, setShowDocs] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [showAllStories, setShowAllStories] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);

  const [openingLink, setOpeningLink] = useState(false);

  // Animated header collapse
  const headerProgress = useSharedValue(0); // 0 = expanded, 1 = collapsed

  const headerAnimStyle = useAnimatedStyle(() => {
    // subtle visual response only; no drastic styling changes
    const opacity = interpolate(headerProgress.value, [0, 1], [1, 0.92], Extrapolate.CLAMP);
    return { opacity };
  }, []);

  const headerAvatarStyle = useAnimatedStyle(() => {
    const scale = interpolate(headerProgress.value, [0, 1], [1, 0.9], Extrapolate.CLAMP);
    return { transform: [{ scale }] };
  }, []);

  const headerTitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(headerProgress.value, [0, 1], [0, -6], Extrapolate.CLAMP);
    return { transform: [{ translateY }] };
  }, []);

  /* ============================================================
     FIND MENTOR
  ============================================================ */

  const mentor = useMemo(() => {
    if (!Array.isArray(mentors) || !mentorId) return null;
    return mentors.find((m) => String(m._id) === String(mentorId));
  }, [mentors, mentorId]);

  const safeMentor = mentor || null;

  /* ============================================================
     DERIVED DATA
  ============================================================ */

  const avatar = useMemo(() => {
    if (!safeMentor) return null;
    return safeMentor.user?.profile?.avatar?.url || safeMentor.avatar || null;
  }, [safeMentor]);

  const name = useMemo(() => {
    if (!safeMentor) return "";
    return safeMentor.user?.profile?.fullName || safeMentor.name || "Mentor";
  }, [safeMentor]);

  const verified = !!safeMentor?.verified;
  const verificationStatus = safeMentor?.verificationStatus || "pending";

  const rating = safeNum(safeMentor?.rating, 0);
  const totalReviews = safeNum(safeMentor?.totalReviews, 0);
  const mentees = safeNum(safeMentor?.mentees, 0);
  const sessions = safeNum(safeMentor?.sessions, 0);

  const specialty = safeMentor?.specialty || "";
  const experience = safeMentor?.experience || "";

  const skills = Array.isArray(safeMentor?.skills) ? safeMentor.skills : [];
  const languages = Array.isArray(safeMentor?.languages) ? safeMentor.languages : [];
  const availability = sortAvailability(Array.isArray(safeMentor?.availability) ? safeMentor.availability : []);
  const stories = Array.isArray(safeMentor?.stories) ? safeMentor.stories : [];
  const docs = Array.isArray(safeMentor?.verificationDocs) ? safeMentor.verificationDocs : [];

  const isActive = safeMentor?.isActive !== false;
  const isSuspended = !!safeMentor?.isSuspended;

  const createdAt = safeMentor?.createdAt;
  const updatedAt = safeMentor?.updatedAt;

  const pricePerSession = safeNum(safeMentor?.pricePerSession, 0);

  const starSegments = useMemo(() => getStarSegments(rating), [rating]);

  const primaryStatusTone = useMemo(() => {
    if (isSuspended) return "red";
    if (!isActive) return "gray";
    return "green";
  }, [isActive, isSuspended]);

  const primaryStatusLabel = useMemo(() => {
    if (isSuspended) return "Suspended";
    if (!isActive) return "Inactive";
    return "Active";
  }, [isActive, isSuspended]);

  const visibleSkills = useMemo(() => (showAllSkills ? skills : skills.slice(0, 8)), [skills, showAllSkills]);
  const visibleLanguages = useMemo(() => (showAllLanguages ? languages : languages.slice(0, 6)), [languages, showAllLanguages]);
  const visibleStories = useMemo(() => (showAllStories ? stories : stories.slice(0, 5)), [stories, showAllStories]);

  /* =====================================================
     ✅ STEP 1 — CHECK IF MENTOR IS AVAILABLE NOW
  ====================================================== */
  const isMentorAvailableNow = useMemo(() => {
    if (!safeMentor?.availability?.length) return false;

    const now = new Date();

    const currentDay = now.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return safeMentor.availability.some((slot) => {
      if (!slot.day) return false;

      if (slot.day.toLowerCase() !== currentDay.toLowerCase()) return false;

      const [fh, fm] = (slot.from || "00:00").split(":").map(Number);
      const [th, tm] = (slot.to || "00:00").split(":").map(Number);

      const fromMin = fh * 60 + fm;
      const toMin = th * 60 + tm;

      return currentMinutes >= fromMin && currentMinutes <= toMin;
    });
  }, [safeMentor]);

  /* ============================================================
     EFFECTS
  ============================================================ */

  useEffect(() => {
    // if mentor isn't loaded yet, keep quiet; parent screen should have fetched mentors
    // you can optionally dispatch fetchMentors here, but user said keep current system.
  }, []);

  /* ============================================================
     HANDLERS
  ============================================================ */

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, []);

  const handleShareProfile = useCallback(async () => {
    try {
      const url = `mentorship/mentor-details?mentorId=${String(mentorId || "")}`;
      await Share.share({
        message: `${name} • ${specialty}\n\nView profile: ${url}`,
      });
    } catch (e) {
      // silent
    }
  }, [mentorId, name, specialty]);

  const handleOpenDoc = useCallback(async (url) => {
    if (!isValidHttpUrl(url)) {
      Alert.alert("Invalid link", "This document link is not valid.");
      return;
    }
    try {
      setOpeningLink(true);
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Cannot open link", "Your device cannot open this link.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Failed to open the link.");
    } finally {
      setOpeningLink(false);
    }
  }, []);

  const handleCopyLink = useCallback(async (url) => {
    // If you use expo-clipboard in your project, wire it here.
    // We'll fallback to a gentle alert for now.
    Alert.alert("Copy link", url);
  }, []);

  const handleOpenStory = useCallback(
    (story) => {
      if (!story?._id) return;
      router.push({
        pathname: "/mentorship/full-story",
        params: { storyId: String(story._id) },
      });
    },
    [router]
  );

  const handleBookSession = useCallback(() => {
    // placeholder: wire to booking flow later
    Alert.alert("Booking", "Booking flow will be added here.");
  }, []);

  // ✅ 4️⃣ Chat button → ONLY opens modal (REPLACED)
  const handleOpenChatModal = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  // ✅ STEP 2 — Use your EXISTING DM chat logic
  const handleMentorChat = async () => {
    try {
      const participantId =
        typeof safeMentor?.user === "string"
          ? safeMentor.user
          : safeMentor?.user?._id;

      const chat = await dispatch(
        createOrGetDMChat({ participantId })
      ).unwrap();

      router.replace(`/community/chat/${chat._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActions = useCallback(() => {
    setShowActionsSheet((v) => !v);
  }, []);

  const onScroll = useCallback((e) => {
    const y = safeNum(e?.nativeEvent?.contentOffset?.y, 0);
    const v = clamp(y / 60, 0, 1);
    headerProgress.value = withTiming(v, { duration: 150 });
  }, []);

  /* ============================================================
     LOADING / EMPTY
  ============================================================ */

  if (loading && !safeMentor) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={[tw`mt-3 text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
          Loading mentor profile...
        </Text>
      </View>
    );
  }

  if (!safeMentor) {
    return (
      <View style={tw`flex-1 bg-white`}>
        <LinearGradient colors={[DEEP_PURPLE_1, DEEP_PURPLE_2]} style={tw`pt-12 pb-5 px-5`}>
          <TouchableOpacity onPress={goBack} style={tw`w-10 h-10 items-center justify-center`}>
            <ArrowLeft color="white" />
          </TouchableOpacity>
          <Text style={[tw`text-white text-xl mt-2`, { fontFamily: "Poppins-Bold" }]}>
            Mentor Profile
          </Text>
        </LinearGradient>

        <View style={tw`flex-1 items-center justify-center px-6`}>
          <AlertTriangle size={36} color="#F59E0B" />
          <Text style={[tw`mt-3 text-purple-900 text-lg`, { fontFamily: "Poppins-Bold" }]}>
            Mentor not found
          </Text>
          <Text style={[tw`mt-2 text-gray-600 text-center`, { fontFamily: "Poppins-Regular" }]}>
            The mentor profile you're trying to view is not available. Please go back and try again.
          </Text>

          <TouchableOpacity
            onPress={goBack}
            style={tw`mt-5 rounded-full overflow-hidden`}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[PURPLE, GOLD]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`px-6 py-3`}
            >
              <Text style={[tw`text-white`, { fontFamily: "Poppins-SemiBold" }]}>
                Go Back
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ============================================================
     MAIN RENDER
  ============================================================ */

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* ======================================================
         TOP HEADER (gradient)
      ====================================================== */}
      <Animated.View style={[tw``, headerAnimStyle]}>
        <LinearGradient
          colors={[DEEP_PURPLE_1, DEEP_PURPLE_2]}
          style={tw`pt-12 pb-6 px-5 rounded-b-[36px]`}
        >
          {/* Top row */}
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              onPress={goBack}
              style={tw`w-10 h-10 items-center justify-center rounded-full`}
              activeOpacity={0.8}
            >
              <ArrowLeft color="white" />
            </TouchableOpacity>

            <View style={tw`flex-row items-center`}>

              <TouchableOpacity
                onPress={handleToggleActions}
                style={tw`w-10 h-10 items-center justify-center rounded-full ml-1`}
                activeOpacity={0.8}
              >
                <Info color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar + Name */}
          <View style={tw`items-center mt-4`}>
            <Animated.View style={[tw``, headerAvatarStyle]}>
              <View style={tw`w-28 h-28 rounded-full overflow-hidden bg-white/20 border-4 border-white`}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={tw`w-full h-full`} />
                ) : (
                  <View style={tw`flex-1 items-center justify-center`}>
                    <Text style={[tw`text-white`, { fontFamily: "Poppins-Bold" }]}>
                      {String(name || "M").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            <Animated.View style={[tw`items-center`, headerTitleStyle]}>
              <View style={tw`flex-row items-center mt-3`}>
                <Text style={[tw`text-white text-xl`, { fontFamily: "Poppins-Bold" }]}>
                  {name}
                </Text>

                {verified && (
                  <View style={tw`ml-2 bg-white/20 px-2 py-1 rounded-full flex-row items-center`}>
                    <ShieldCheck size={14} color={GOLD} />
                    <Text style={[tw`text-yellow-200 ml-1 text-xs`, { fontFamily: "Poppins-SemiBold" }]}>
                      Verified
                    </Text>
                  </View>
                )}
              </View>

              {!!safeMentor.title && (
                <Text style={[tw`text-purple-200 mt-1`, { fontFamily: "Poppins-Regular" }]}>
                  {safeMentor.title}
                </Text>
              )}

              {!!specialty && (
                <View style={tw`mt-2 bg-white/15 px-3 py-1 rounded-full`}>
                  <Text style={[tw`text-white/90 text-xs`, { fontFamily: "Poppins-SemiBold" }]}>
                    {specialty}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Rating row */}
            <View style={tw`flex-row items-center mt-3`}>
              <View style={tw`flex-row items-center`}>
                {starSegments.map((t, idx) => {
                  if (t === "full") return <Star key={idx} size={16} color={GOLD} fill={GOLD} />;
                  if (t === "half") return <StarHalf key={idx} size={16} color={GOLD} fill={GOLD} />;
                  return <Star key={idx} size={16} color="#D1D5DB" />;
                })}
              </View>

              <Text style={[tw`text-white ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                {rating.toFixed(1)}
              </Text>

              <Text style={[tw`text-white/80 ml-2 text-xs`, { fontFamily: "Poppins-Regular" }]}>
                ({formatCount(totalReviews)} reviews)
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ======================================================
         SCROLL BODY
      ====================================================== */}
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-4 pb-28 pt-5`}
      >
        {/* ================= HIGHLIGHT STATS ================= */}
        <Animated.View entering={FadeInDown} style={tw`mb-5`}>
          <View style={tw`flex-row`}>
            <StatPill
              label="Mentees"
              value={formatCount(mentees)}
              icon={Users}
            />
          </View>

          <View style={tw`flex-row mt-2`}>
            <StatPill
              label="Experience"
              value={experience || "—"}
              icon={Clock}
            />
            <StatPill
              label="Status"
              value={primaryStatusLabel}
              icon={primaryStatusTone === "green" ? CheckCircle2 : primaryStatusTone === "red" ? ShieldAlert : BadgeX}
              gradient={
                primaryStatusTone === "green"
                  ? ["#F0FDF4", "#FFFFFF"]
                  : primaryStatusTone === "red"
                  ? ["#FEF2F2", "#FFFFFF"]
                  : ["#F3F4F6", "#FFFFFF"]
              }
            />
          </View>
        </Animated.View>

        {/* ================= ABOUT ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={Lightbulb} title="About" subtitle={verified ? "Trusted mentor" : "Pending verification"} />
          <View style={tw`mt-3`}>
            <Text style={[tw`text-gray-700 leading-6`, { fontFamily: "Poppins-Regular" }]}>
              {safeMentor.bio || "No bio provided yet."}
            </Text>
          </View>

          <View style={tw`mt-4 flex-row flex-wrap`}>
            {!!specialty && <Chip text={specialty} />}
            {!!experience && <Chip text={experience} />}
            {verified && <Chip text="Verified" />}
            {!verified && <Chip text={verificationStatus} />}
          </View>
        </Animated.View>

        {/* ================= SKILLS ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={BookOpen} title="Skills" subtitle={`${skills.length} listed`} />
          <View style={tw`mt-3 flex-row flex-wrap`}>
            {visibleSkills.length ? (
              visibleSkills.map((s, i) => <Chip key={`${s}-${i}`} text={String(s)} tone="purple" />)
            ) : (
              <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>No skills added yet.</Text>
            )}
          </View>

          {skills.length > 8 && (
            <TouchableOpacity
              onPress={() => setShowAllSkills((v) => !v)}
              style={tw`mt-2 flex-row items-center self-start`}
              activeOpacity={0.75}
            >
              <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-SemiBold" }]}>
                {showAllSkills ? "Show less" : "Show all"}
              </Text>
              <ChevronDown size={16} color={PURPLE} style={tw`ml-1`} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ================= LANGUAGES ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={Globe} title="Languages" subtitle={`${languages.length} listed`} />
          <View style={tw`mt-3 flex-row flex-wrap`}>
            {visibleLanguages.length ? (
              visibleLanguages.map((l, i) => <Chip key={`${l}-${i}`} text={String(l)} tone="gold" />)
            ) : (
              <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>No languages added yet.</Text>
            )}
          </View>

          {languages.length > 6 && (
            <TouchableOpacity
              onPress={() => setShowAllLanguages((v) => !v)}
              style={tw`mt-2 flex-row items-center self-start`}
              activeOpacity={0.75}
            >
              <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-SemiBold" }]}>
                {showAllLanguages ? "Show less" : "Show all"}
              </Text>
              <ChevronDown size={16} color={PURPLE} style={tw`ml-1`} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ================= AVAILABILITY ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={Timer} title="Availability" subtitle={availability.length ? "Weekly schedule" : "Not set"} />
          <View style={tw`mt-3`}>
            {availability.length ? (
              availability.map((a, idx) => (
                <View key={`${a.day}-${idx}`} style={tw`flex-row items-center justify-between py-2 border-b border-gray-100`}>
                  <Text style={[tw`text-gray-800`, { fontFamily: "Poppins-SemiBold" }]}>
                    {a.day}
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={[tw`text-gray-600 ml-2`, { fontFamily: "Poppins-Regular" }]}>
                      {timeSlotLabel(a.from, a.to)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                Availability is not set yet.
              </Text>
            )}
          </View>
        </Animated.View>

        {/* ================= PRICING ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={Calendar} title="Pricing" subtitle={pricePerSession === 0 ? "Free" : "Paid"} />
          <View style={tw`mt-3`}>
            <Text style={[tw`text-gray-700`, { fontFamily: "Poppins-Regular" }]}>
              {pricePerSession === 0 ? "This mentor offers free mentorship sessions." : `KES ${formatCount(pricePerSession)} per session.`}
            </Text>
          </View>
        </Animated.View>

        {/* ================= SPOTLIGHT STORIES ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle icon={Lightbulb} title="Spotlight Stories" subtitle={`${stories.length}/10 max`} />

          <View style={tw`mt-3`}>
            {visibleStories.length ? (
              visibleStories.map((story) => (
                <TouchableOpacity
                  key={String(story._id)}
                  activeOpacity={0.9}
                  style={tw`bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-3`}
                >

                  <View style={tw`p-4`}>
                    <Text style={[tw`text-purple-900 mb-1`, { fontFamily: "Poppins-Bold" }]}>
                      {story.title}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[tw`text-gray-600`, { fontFamily: "Poppins-Regular" }]}
                    >
                      {story.content}
                    </Text>

                    <View style={tw`flex-row items-center justify-between mt-3`}>
                      <View style={tw`flex-row items-center`}>
                        <Eye size={14} color="#6B7280" />
                        <Text style={[tw`text-gray-600 ml-2 text-xs`, { fontFamily: "Poppins-Regular" }]}>
                          {formatCount(story.views)} views
                        </Text>

                        <View style={tw`w-4`} />

                        <HeartMini count={Array.isArray(story.likes) ? story.likes.length : 0} />
                      </View>

                    </View>

                    {!!story.createdAt && (
                      <Text style={[tw`text-gray-400 text-xs mt-2`, { fontFamily: "Poppins-Regular" }]}>
                        Posted {formatDate(story.createdAt)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                No stories posted yet.
              </Text>
            )}

            {stories.length > 5 && (
              <TouchableOpacity
                onPress={() => setShowAllStories((v) => !v)}
                style={tw`mt-1 flex-row items-center self-start`}
                activeOpacity={0.75}
              >
                <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-SemiBold" }]}>
                  {showAllStories ? "Show fewer stories" : "Show all stories"}
                </Text>
                <ChevronDown size={16} color={PURPLE} style={tw`ml-1`} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ================= VERIFICATION ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4`}>
          <SectionTitle
            icon={verified ? BadgeCheck : BadgeX}
            title="Verification"
            subtitle={verificationStatus}
          />

          <View style={tw`mt-3`}>
            <View style={tw`flex-row items-center`}>
              {verified ? (
                <>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={[tw`text-green-700 ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                    Approved
                  </Text>
                </>
              ) : (
                <>
                  <PauseCircle size={16} color="#F59E0B" />
                  <Text style={[tw`text-amber-700 ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                    Pending review
                  </Text>
                </>
              )}
            </View>

            <Text style={[tw`text-gray-600 mt-2`, { fontFamily: "Poppins-Regular" }]}>
              Documents help the admin panel verify authenticity. Only verified mentors appear in the public list.
            </Text>

            <TouchableOpacity
              onPress={() => setShowDocs(true)}
              style={tw`mt-4 rounded-full overflow-hidden self-start`}
              activeOpacity={0.85}
            >
              <View
                style={tw`px-5 py-3 flex-row items-center bg-purple-800`}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={[tw`text-white ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                  View Documents ({docs.length})
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ================= META ================= */}
        <Animated.View entering={FadeInUp} style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-2`}>
          <SectionTitle icon={Info} title="Profile Meta" subtitle="System info" />

          <View style={tw`mt-3`}>
            <MetaRow label="Mentor ID" value={String(safeMentor._id)} />
            <MetaRow label="User ID" value={String(safeMentor.user)} />
            <MetaRow label="Created" value={formatDate(createdAt) || "—"} />
            <MetaRow label="Updated" value={formatDate(updatedAt) || "—"} />
            <MetaRow label="Version" value={String(safeMentor.__v ?? 0)} />

            <Divider />

            <MetaRow label="Active" value={isActive ? "Yes" : "No"} />
            <MetaRow label="Suspended" value={isSuspended ? "Yes" : "No"} />
          </View>
        </Animated.View>

        {/* Little padding */}
        <View style={tw`h-10`} />
      </ScrollView>

      {/* ======================================================
         BOTTOM ACTION BAR
      ====================================================== */}
      <View style={tw`absolute bottom-0 left-0 right-0`}>
        <LinearGradient
          colors={["rgba(255,255,255,0.85)", "#FFFFFF"]}
          style={tw`px-4 pt-3 pb-5 border-t border-gray-200`}
        >
          <View style={tw`flex-row`}>
            <View style={tw`w-2`} />

            {/* ✅ STEP 3 — Replace your Bottom Button with dynamic Talk to Mentor button */}
            {safeMentor?.isActive &&
             !safeMentor?.isSuspended &&
             isMentorAvailableNow && (

              <TouchableOpacity
                onPress={() => setConfirmVisible(true)}
                style={tw`flex-1 rounded-full overflow-hidden shadow-sm`}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#7C3AED", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tw`py-3 flex-row items-center justify-center`}
                >
                  <MessageCircle size={16} color="#FFFFFF" />
                  <Text
                    style={[
                      tw`text-white ml-2`,
                      { fontFamily: "Poppins-SemiBold" },
                    ]}
                  >
                    Talk to Mentor
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ✅ STEP 4 — Optional (nice UX): Show disabled state when mentor is offline */}
            {!isMentorAvailableNow && (
              <View style={tw`flex-1 bg-gray-200 rounded-full py-3 items-center`}>
                <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280" }}>
                  Mentor is currently unavailable
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={scrollToTop}
            style={tw`mt-3 self-center flex-row items-center`}
            activeOpacity={0.75}
          >
            <ChevronDown size={16} color="#6B7280" style={{ transform: [{ rotate: "180deg" }] }} />
            <Text style={[tw`text-gray-500 ml-1`, { fontFamily: "Poppins-Regular", fontSize: 12 }]}>
              Back to top
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ✅ 5️⃣ Add ConfirmModal (bottom of JSX) */}
      <ConfirmModal
        visible={confirmVisible}
        title="Start chat?"
        message={`Start a conversation with ${name}?`}
        confirmText="Start Chat"
        cancelText="Cancel"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleMentorChat}
      />

      {/* ======================================================
         DOCUMENTS MODAL
      ====================================================== */}
      <Modal visible={showDocs} animationType="slide" transparent>
        <View style={tw`flex-1 bg-black/40 justify-end`}>
          <LinearGradient
            colors={["#F5F3FF", "#FFFFFF"]}
            style={tw`rounded-t-3xl p-5 max-h-[85%]`}
          >
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={[tw`text-purple-900 text-lg`, { fontFamily: "Poppins-Bold" }]}>
                Verification Documents
              </Text>

              <TouchableOpacity onPress={() => setShowDocs(false)} activeOpacity={0.8}>
                <X />
              </TouchableOpacity>
            </View>

            <Text style={[tw`text-gray-600 mb-4`, { fontFamily: "Poppins-Regular" }]}>
              These are external links (Google Drive, Dropbox, etc). Tap to open.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {docs.length ? (
                docs.map((d, idx) => (
                  <View key={`${d.label}-${idx}`} style={tw`bg-white rounded-2xl p-4 border border-gray-100 mb-3`}>
                    <View style={tw`flex-row items-start justify-between`}>
                      <View style={tw`flex-1 pr-3`}>
                        <Text style={[tw`text-purple-900`, { fontFamily: "Poppins-SemiBold" }]}>
                          {d.label}
                        </Text>
                        <Text style={[tw`text-gray-500 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                          {providerLabel(d.provider)} • Uploaded {formatDate(d.uploadedAt)}
                        </Text>
                        <Text style={[tw`text-gray-600 text-xs mt-2`, { fontFamily: "Poppins-Regular" }]}>
                          {d.url}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleOpenDoc(d.url)}
                        style={tw`w-10 h-10 items-center justify-center`}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={18} color={PURPLE} />
                      </TouchableOpacity>
                    </View>

                    <View style={tw`flex-row mt-3`}>
                      <TouchableOpacity
                        onPress={() => handleCopyLink(d.url)}
                        style={tw`flex-1 bg-gray-100 py-2 rounded-full items-center mr-2`}
                        activeOpacity={0.75}
                      >
                        <View style={tw`flex-row items-center`}>
                          <Copy size={16} color="#6B7280" />
                          <Text style={[tw`text-gray-700 ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                            Copy
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenDoc(d.url)}
                        style={tw`flex-1 rounded-full overflow-hidden`}
                        activeOpacity={0.85}
                      >
                        <View
                          style={tw`py-2 items-center bg-purple-800`}
                        >
                          <Text style={[tw`text-white`, { fontFamily: "Poppins-SemiBold" }]}>
                            Open
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                  No verification documents uploaded.
                </Text>
              )}

              <View style={tw`h-12`} />
            </ScrollView>

            {openingLink && (
              <View style={tw`absolute inset-0 bg-black/20 items-center justify-center`}>
                <View style={tw`bg-white rounded-2xl p-4 flex-row items-center`}>
                  <ActivityIndicator color={PURPLE} />
                  <Text style={[tw`ml-3 text-gray-700`, { fontFamily: "Poppins-Regular" }]}>
                    Opening link...
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>
      </Modal>

      {/* ======================================================
         ACTIONS SHEET (small) - UPDATED to use new chat handler
      ====================================================== */}
      <Modal visible={showActionsSheet} animationType="fade" transparent>
        <Pressable style={tw`flex-1 bg-black/30`} onPress={() => setShowActionsSheet(false)}>
          <Pressable style={tw`absolute bottom-0 left-0 right-0`}>
            <LinearGradient
              colors={["#FFFFFF", "#F5F3FF"]}
              style={tw`rounded-t-3xl p-5`}
            >
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={[tw`text-purple-900 text-lg`, { fontFamily: "Poppins-Bold" }]}>
                  Quick Actions
                </Text>
                <TouchableOpacity onPress={() => setShowActionsSheet(false)} activeOpacity={0.8}>
                  <X />
                </TouchableOpacity>
              </View>

              <View style={tw`mt-4`}>
                <ActionRow
                  icon={Share2}
                  title="Share mentor profile"
                  subtitle="Send this profile to someone"
                  onPress={async () => {
                    setShowActionsSheet(false);
                    await handleShareProfile();
                  }}
                />
                                <ActionRow
                  icon={Star}
                  title="Rate mentor"
                  subtitle="Provide feedback on your experience with this mentor"
                  onPress={() => {
                    setShowActionsSheet(false);
                    Alert.alert("Rate Mentor", "Rating functionality will be added soon.");
                  }}
                />
                <ActionRow
                  icon={Info}
                  title="About verification"
                  subtitle="Only verified mentors appear publicly"
                  onPress={() => {
                    setShowActionsSheet(false);
                    Alert.alert("Verification", "Only verified mentors appear in the public mentor list. Documents help admins verify authenticity.");
                  }}
                />
              </View>

              <View style={tw`h-6`} />
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ============================================================
   EXTRA SMALL COMPONENTS
============================================================ */

const MetaRow = React.memo(({ label, value }) => (
  <View style={tw`flex-row items-start justify-between py-2`}>
    <Text style={[tw`text-gray-500`, { fontFamily: "Poppins-Regular", fontSize: 12 }]}>
      {label}
    </Text>
    <Text
      style={[
        tw`text-gray-700 text-right max-w-[65%]`,
        { fontFamily: "Poppins-SemiBold", fontSize: 12 },
      ]}
      selectable
    >
      {value}
    </Text>
  </View>
));

const HeartMini = React.memo(({ count }) => (
  <View style={tw`flex-row items-center`}>
    {/* heart icon (lucide has no fill default), use subtle */}
    <MessageCircle size={14} color="#6B7280" style={{ opacity: 0.9 }} />
    <Text style={[tw`text-gray-600 ml-2 text-xs`, { fontFamily: "Poppins-Regular" }]}>
      {formatCount(count)} likes
    </Text>
  </View>
));

const ActionRow = React.memo(({ icon: Icon, title, subtitle, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={tw`flex-row items-center bg-white rounded-2xl p-4 border border-gray-100 mb-3`}
  >
    <View style={tw`w-10 h-10 rounded-full bg-purple-100 items-center justify-center`}>
      {Icon ? <Icon size={18} color={PURPLE} /> : null}
    </View>

    <View style={tw`flex-1 ml-3`}>
      <Text style={[tw`text-purple-900`, { fontFamily: "Poppins-SemiBold" }]}>
        {title}
      </Text>
      <Text style={[tw`text-gray-600 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
        {subtitle}
      </Text>
    </View>

    <ChevronRight size={18} color="#9CA3AF" />
  </TouchableOpacity>
));