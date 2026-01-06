import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import tw from "../../utils/tw";
import LottieView from "lottie-react-native";
import Svg, { Circle } from "react-native-svg";
import BadgeGallery from "../../components/profile/BadgeGallery";

/* ================= REDUX ================= */
import {
  fetchUserProfile,
  fetchEnrolledPrograms,
  fetchCompletedPrograms,
  updatePassword,
} from "../../store/slices/userSlice";
import { logoutUser } from "../../store/slices/authSlice";

const { width } = Dimensions.get("window");

/* ============================================================
   BADGE META (ICON + RARITY)
============================================================ */
const BADGE_META = {
  mentor: { icon: "ribbon-outline", tier: "gold" },
  entrepreneur: { icon: "briefcase-outline", tier: "gold" },
  changemaker: { icon: "flash-outline", tier: "silver" },
  learner: { icon: "school-outline", tier: "bronze" },
  advocate: { icon: "megaphone-outline", tier: "bronze" },
  professional: { icon: "star-outline", tier: "silver" },
};

const BADGE_COLORS = {
  gold: { bg: "rgba(245, 158, 11, 0.12)", border: "#F59E0B", text: "#92400E", glow: "rgba(245, 158, 11, 0.3)" },
  silver: { bg: "rgba(156, 163, 175, 0.12)", border: "#9CA3AF", text: "#374151", glow: "rgba(156, 163, 175, 0.2)" },
  bronze: { bg: "rgba(217, 119, 6, 0.12)", border: "#D97706", text: "#78350F", glow: "rgba(217, 119, 6, 0.2)" },
};

/* ============================================================
   SETTINGS DRAWER ITEMS
============================================================ */
const SETTINGS_ITEMS = [
  {
    label: "Change Password",
    icon: "key",
    action: "modal",
    modalType: "password"
  },
  {
    label: "Privacy & Security",
    icon: "lock-closed",
    action: "navigate",
    route: "/profile/privacy"
  },
  {
    label: "Notification Settings",
    icon: "notifications",
    action: "navigate",
    route: "/profile/notifications"
  },
  {
    label: "Safety & SOS",
    icon: "shield-checkmark",
    action: "navigate",
    route: "/profile/safety"
  },
  {
    label: "Help & Support",
    icon: "help-circle",
    action: "navigate",
    route: "/profile/support"
  },
  {
    label: "Appearance",
    icon: "color-palette",
    action: "navigate",
    route: "/profile/appearance"
  },
  {
    label: "Language",
    icon: "language",
    action: "navigate",
    route: "/profile/language"
  },
  {
    label: "About App",
    icon: "information-circle",
    action: "navigate",
    route: "/profile/about"
  }
];

/* ============================================================
   PROFILE SCREEN
============================================================ */
export default function ProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { user, stats, loading } = useSelector((s) => s.user);

  /* ================= LOCAL STATE ================= */
  const [activeTab, setActiveTab] = useState("overview");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /* ================= ANIMATIONS ================= */
  const headerScrollAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;
  const snackbarAnim = useRef(new Animated.Value(20)).current;
  const drawerTranslateX = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /* ================= SNACKBAR ================= */
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ visible: true, message, type });
    Animated.timing(snackbarAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      hideSnackbar();
    }, 3000);
  };

  const hideSnackbar = () => {
    Animated.timing(snackbarAnim, {
      toValue: 20,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSnackbar({ visible: false, message: "", type: "success" });
    });
  };

  /* ================= DRAWER ANIMATIONS ================= */
  const openSettingsDrawer = () => {
    setShowSettingsDrawer(true);
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeSettingsDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: width,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSettingsDrawer(false);
    });
  };

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(fetchUserProfile());
    dispatch(fetchEnrolledPrograms());
    dispatch(fetchCompletedPrograms());
  }, []);

  useEffect(() => {
    Animated.timing(cardScaleAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, []);

  if (!user && loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <View style={tw`w-20 h-20 rounded-2xl bg-white shadow-xl items-center justify-center`}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

  if (!user) return null;

  const avatar = user.profile?.avatar?.url;
  const coverPhoto = user.profile?.coverPhoto?.url;

  /* ================= DATA NORMALIZATION ================= */
  const interests = user.interests || user.profile?.interests || [];
  const safeStats = {
    postsCount: stats?.postsCount ?? 0,
    enrolledProgramsCount: stats?.enrolledProgramsCount ?? 0,
    completedProgramsCount: stats?.completedProgramsCount ?? 0,
  };

  /* ============================================================
     PROFILE COMPLETION & CHECKLIST
  ============================================================ */
  const profileCompletion = useMemo(() => {
    const checks = [
      !!user?.profile?.fullName,
      (user?.profile?.bio || "").length > 0,
      !!user?.profile?.avatar?.url,
      !!user?.profile?.coverPhoto?.url,
      interests.length > 0,
      Array.isArray(user?.safety?.emergencyContacts) &&
      user.safety.emergencyContacts.length > 0,
      typeof user?.profile?.location === "object" &&
      !!user.profile.location.countryCode &&
      !!user.profile.location.city,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [user, interests]);

  const checklistItems = useMemo(() => [
    {
      label: "Add full name",
      done: !!user?.profile?.fullName,
    },
    {
      label: "Write a bio",
      done: (user?.profile?.bio || "").length > 0,
    },
    {
      label: "Upload profile photo",
      done: !!user?.profile?.avatar?.url,
    },
    {
      label: "Upload cover photo",
      done: !!user?.profile?.coverPhoto?.url,
    },
    {
      label: "Select interests",
      done: interests.length > 0,
    },
    {
      label: "Add emergency contacts",
      done: Array.isArray(user?.safety?.emergencyContacts) &&
        user.safety.emergencyContacts.length > 0,
    },
    {
      label: "Add location details",
      done: typeof user?.profile?.location === "object" &&
        !!user.profile.location.countryCode &&
        !!user.profile.location.city,
    },
  ], [user, interests]);

  /* ============================================================
     HANDLERS
  ============================================================ */
  const handleSettingsItemPress = (item) => {
    closeSettingsDrawer();

    if (item.action === "modal" && item.modalType === "password") {
      setTimeout(() => {
        setShowPasswordModal(true);
      }, 350);
    } else if (item.action === "navigate") {
      setTimeout(() => {
        router.push(item.route);
      }, 350);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar("All fields are required", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    try {
      await dispatch(updatePassword({ currentPassword, newPassword })).unwrap();
      showSnackbar("Password updated successfully");
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      showSnackbar(err?.message || "Failed to update password", "error");
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await dispatch(logoutUser());
    router.replace("/(auth)/onboarding");
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerScrollAnim } } }],
          { useNativeDriver: false }
        )}
      >

        {/* ======================================================
           HEADER WITH SETTINGS ICON
        ====================================================== */}
        <View style={tw`absolute top-0 left-0 right-0 z-10 pt-12 px-6 flex-row justify-between items-center`}>
          <Animated.View
            style={[
              tw`w-10 h-10 rounded-full items-center justify-center`,
              {
                opacity: headerScrollAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                }),
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm`}
            >
              <Ionicons name="arrow-back" size={20} color="#1F2937" />
            </TouchableOpacity>
          </Animated.View>

          {/* SETTINGS ICON */}
          <TouchableOpacity
            onPress={openSettingsDrawer}
            style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm`}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* ======================================================
           COVER WITH OVERLAY GRADIENT
        ====================================================== */}
        <View
          style={[
            tw`h-48 relative overflow-hidden`,
            {
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            },
          ]}
        >
          {coverPhoto ? (
            <Image
              source={{ uri: coverPhoto }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#7C3AED", "#F59E0B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`w-full h-full`}
            />
          )}

          {/* Blurred status bar area */}
          <Animated.View
            style={[
              tw`absolute top-0 left-0 right-0 h-20 bg-white/90`,
              {
                opacity: headerScrollAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        </View>

        {/* ======================================================
           PROFILE CARD
        ====================================================== */}
        <Animated.View
          style={[
            tw`px-6 -mt-20`,
            {
              transform: [{ scale: cardScaleAnim }],
            }
          ]}
        >
          <View style={tw`bg-white rounded-3xl shadow-2xl border border-gray-100 p-6`}>
            {/* TOP ROW - AVATAR & ACTIONS */}
            <View style={tw`flex-row items-center justify-between mb-4`}>

              {/* AVATAR WITH GOLD GLOW + GOLDEN RING */}
              <View style={tw`relative`}>
                <View
                  style={tw`absolute -inset-2 rounded-full`}
                />
                <View
                  style={[
                    tw`w-24 h-24 rounded-full overflow-hidden`,
                    {
                      borderWidth: 4,
                      borderColor: "#FFD700",
                      backgroundColor: "#FFFFFF",
                    },
                  ]}
                >
                  <Image
                    source={
                      avatar && avatar.trim() !== ""
                        ? { uri: avatar }
                        : require("../../assets/images/image-placeholder.png")
                    }
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                </View>

              </View>

              {/* ACTIONS + ANIMATED RING SIDE BY SIDE */}
              <View style={tw`flex-row items-center justify-end gap-4 mt-2`}>
                {/* Edit button */}
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit")}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#7C3AED", "#F59E0B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={tw`px-3 py-1.5 rounded-full shadow-lg flex-row items-center`}
                  >
                    <Ionicons name="pencil" size={14} color="#FFF" />
                    <Text style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 12,
                      color: "#FFFFFF",
                      marginLeft: 4
                    }}>
                      Edit Profile
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Animated ring */}
                <AnimatedCircularProgress
                  value={profileCompletion}
                />
              </View>
            </View>

            {/* NAME WITH FLOATING LABEL */}
            <View style={tw`mb-3`}>
              <View style={tw`flex-row items-center ml-2`}>
                <Text style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 20,
                  color: "#1F2937",
                  marginLeft: 4
                }}>
                  {user.profile?.fullName || "User"}
                </Text>

                {/* CHECK */}
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#000000"
                  style={tw`ml-2`}
                />
              </View>

              {/* ROLE – WITH BLACK BRIEFCASE ICON */}
              <View style={tw`flex-row items-center ml-4`}>
                <Ionicons name="briefcase" size={16} color="#000000" />

                <Text style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                  color: "#6B7280",
                  marginLeft: 6,
                }}>
                  {user?.profile?.role
                    ? user.profile.role.charAt(0).toUpperCase() + user.profile.role.slice(1)
                    : "Member"}
                </Text>

              </View>

              {/* BIO */}
              <View style={tw` p-4`}>
                <Text style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                  color: "#4B5563",
                  lineHeight: 22
                }}>
                  {user.profile?.bio || "Add a bio to tell your story..."}
                </Text>
              </View>

              {/* ============ LOCATION DISPLAY ============ */}
              <View style={tw`px-3 mb-2`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="location-outline" size={16} />

                  <Text
                    style={[
                      tw`ml-2 text-gray-900 text-[13px]`,
                      {
                        fontFamily: "Poppins-Medium",
                        color: "#111827",
                      },
                    ]}
                  >
                    {user?.profile?.location?.city}, {user?.profile?.location?.country}
                  </Text>
                </View>

              </View>

              {/* JOIN DATE */}
              <View style={tw`flex-row items-center mt-4`}>
                <View style={tw`flex-row items-center px-3 py-1.5 bg-white`}>
                  <Ionicons name="calendar" size={14} color="#000000" />
                  <Text style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 12,
                    color: "#6B7280",
                    marginLeft: 6
                  }}>
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ======================================================
           PROFILE CHECKLIST
        ====================================================== */}
        <View style={tw`mx-6 mt-6`}>
          <View style={tw`bg-purple-50 rounded-2xl border border-purple-100 p-5 shadow-sm`}>
            {checklistItems.map((i, index) => (
              <View key={i.label} style={tw`flex-row items-center mb-3`}>
                <View style={tw`w-6 h-6 rounded-full ${i.done ? 'bg-green-100' : 'bg-gray-100'} items-center justify-center mr-3`}>
                  <Ionicons
                    name={i.done ? "checkmark" : "ellipsis-horizontal"}
                    size={14}
                    color={i.done ? "#1F2937" : "#9CA3AF"}
                  />
                </View>
                <Text style={{
                  fontFamily: i.done ? "Poppins-Medium" : "Poppins-Regular",
                  color: i.done ? "#1F2937" : "#6B7280",
                  textDecorationLine: i.done ? 'line-through' : 'none'
                }}>
                  {i.label}
                </Text>
                {!i.done && (
                  <TouchableOpacity
                    onPress={() => router.push("/profile/edit")}
                    style={tw`ml-auto px-3 py-1 bg-white border border-purple-200 rounded-full`}
                  >
                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#7C3AED" }}>
                      Add
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ======================================================
           STATS CARDS
        ====================================================== */}
        <View style={tw`mx-6 mt-6`}>
          <View style={tw`flex-row justify-between gap-3`}>
            <AnimatedStat
              icon="create"
              label="Posts"
              value={safeStats.postsCount}
              color="#1F2937"
            />
            <AnimatedStat
              icon="school"
              label="Programs"
              value={safeStats.enrolledProgramsCount}
              color="#1F2937"
            />
            <AnimatedStat
              icon="ribbon"
              label="Completed"
              value={safeStats.completedProgramsCount}
              color="#1F2937"
            />
          </View>
        </View>

        {/* ======================================================
           OVERVIEW CONTENT
        ====================================================== */}
        {activeTab === "overview" && (
          <View style={tw`mx-6 mt-14`}>
            <Section title="Contact Information" icon="mail">
              <InfoRow
                icon="mail"
                text={user.email || "Not provided"}
                label="Email"
              />
              <InfoRow
                icon="call"
                text={user.phone || "Not provided"}
                label="Phone"
              />
            </Section>

            <Section title="Interests" icon="pricetag">
              {interests.length > 0 ? (
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {interests.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      style={tw`px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-full flex-row items-center shadow-sm`}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="pricetag" size={14} color="#1F2937" style={tw`mr-2`} />
                      <Text style={{ fontFamily: "Poppins-Medium", color: "#1F2937" }}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={tw`items-center py-6`}>
                  <View style={tw`w-16 h-16 rounded-full items-center justify-center mb-4`}>
                    <Ionicons name="pricetag-outline" size={28} color="#7C3AED" />
                  </View>
                  <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#6B7280", marginBottom: 12 }}>
                    Add interests to personalize your profile
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/profile/edit")}
                    style={tw`px-6 py-3 bg-purple-600 rounded-full shadow-lg`}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontFamily: "Poppins-SemiBold", color: "white" }}>
                      Add Interests
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Section>

            <Section title="Achievements" icon="trophy">
              <BadgeGallery badges={user.badges} />
            </Section>

            <Section title="Safety & Support" icon="shield-checkmark">
              {user.safety?.emergencyContacts?.length > 0 ? (
                user.safety.emergencyContacts.map((c, i) => (
                  <InfoRow
                    key={i}
                    icon="shield-checkmark"
                    text={`${c.name} • ${c.phone}`}
                    label="Emergency Contact"
                  />
                ))
              ) : (
                <View style={tw`items-center py-4`}>
                  <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#6B7280", marginBottom: 8 }}>
                    Add emergency contacts for safety
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/profile/safety")}
                    style={tw`px-4 py-2 bg-white border border-gray-300 rounded-full`}
                  >
                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#374151" }}>
                      Add Contact
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Section>
          </View>
        )}

        {/* ======================================================
           SETTINGS CONTENT
        ====================================================== */}
        {activeTab === "settings" && (
          <View style={tw`mx-6 mt-6 mb-8`}>
            <View style={tw`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm`}>
              <SettingsItem
                label="Change Password"
                onPress={() => setShowPasswordModal(true)}
                icon="key"
              />
              <SettingsItem
                label="Privacy & Security"
                onPress={() => router.push("/profile/privacy")}
                icon="lock-closed"
              />
              <SettingsItem
                label="Notification Settings"
                onPress={() => router.push("/profile/notifications")}
                icon="notifications"
              />
              <SettingsItem
                label="Safety & SOS"
                onPress={() => router.push("/profile/safety")}
                icon="shield-checkmark"
              />
              <SettingsItem
                label="Help & Support"
                onPress={() => router.push("/profile/support")}
                icon="help-circle"
              />
            </View>

            <TouchableOpacity
              onPress={() => setShowLogoutModal(true)}
              style={tw`mt-6 bg-white border border-red-100 py-4 rounded-2xl items-center shadow-sm`}
              activeOpacity={0.8}
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons name="log-out" size={18} color="#DC2626" />
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#DC2626", marginLeft: 8 }}>
                  Log Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`h-20`} />
      </ScrollView>

      {/* ======================================================
         SETTINGS DRAWER OVERLAY
      ====================================================== */}
      {showSettingsDrawer && (
        <>
          <Animated.View
            style={[
              tw`absolute inset-0 bg-black/50`,
              {
                opacity: overlayOpacity,
              }
            ]}
          >
            <TouchableOpacity
              style={tw`flex-1`}
              activeOpacity={1}
              onPress={closeSettingsDrawer}
            />
          </Animated.View>

          <Animated.View
            style={[
              tw`absolute top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl`,
              {
                transform: [{ translateX: drawerTranslateX }],
              }
            ]}
          >
            <ScrollView
              style={tw`flex-1`}
              showsVerticalScrollIndicator={false}
            >
              {/* DRAWER HEADER */}
              <View style={tw`p-6 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between mb-4`}>
                  <Text style={{ fontFamily: "Poppins-Bold", fontSize: 24, color: "#1F2937" }}>
                    Settings
                  </Text>
                  <TouchableOpacity
                    onPress={closeSettingsDrawer}
                    style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
                  >
                    <Ionicons name="close" size={20} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#6B7280" }}>
                  Manage your account and app preferences
                </Text>
              </View>

              {/* DRAWER ITEMS */}
              <View style={tw`p-4`}>
                {SETTINGS_ITEMS.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSettingsItemPress(item)}
                    style={tw`flex-row items-center px-4 py-3.5 rounded-xl mb-2 active:bg-gray-50`}
                    activeOpacity={0.7}
                  >
                    <View style={tw`w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-3`}>
                      <Ionicons name={item.icon} size={18} color="#7C3AED" />
                    </View>
                    <Text style={{
                      fontFamily: "Poppins-Medium",
                      fontSize: 15,
                      color: "#1F2937",
                      flex: 1
                    }}>
                      {item.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}

                {/* DIVIDER */}
                <View style={tw`h-px bg-gray-200 my-4`} />

                {/* LOGOUT IN DRAWER */}
                <TouchableOpacity
                  onPress={() => {
                    closeSettingsDrawer();
                    setTimeout(() => {
                      setShowLogoutModal(true);
                    }, 350);
                  }}
                  style={tw`flex-row items-center px-4 py-3.5 rounded-xl bg-red-50`}
                  activeOpacity={0.7}
                >
                  <View style={tw`w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3`}>
                    <Ionicons name="log-out" size={18} color="#DC2626" />
                  </View>
                  <Text style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 15,
                    color: "#DC2626",
                    flex: 1
                  }}>
                    Log Out
                  </Text>
                </TouchableOpacity>
              </View>

              {/* VERSION INFO */}
              <View style={tw`p-6 mt-4`}>
                <Text style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 12,
                  color: "#9CA3AF",
                  textAlign: "center"
                }}>
                  Version 1.0.0 • Build 2024.01
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* ======================================================
         PASSWORD MODAL
      ====================================================== */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center p-6`}>
          <View style={tw`bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl`}>
            {/* MODAL HEADER */}
            <View style={tw`p-6 border-b border-gray-100`}>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: "#1F2937" }}>
                Change Password
              </Text>
              <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                Update your account password
              </Text>
            </View>

            {/* FORM */}
            <View style={tw`p-6`}>
              {[
                { key: 'currentPassword', label: 'Current Password' },
                { key: 'newPassword', label: 'New Password' },
                { key: 'confirmPassword', label: 'Confirm Password' }
              ].map(({ key, label }) => (
                <View key={key} style={tw`mb-4`}>
                  <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#374151", marginBottom: 6 }}>
                    {label}
                  </Text>
                  <TextInput
                    secureTextEntry
                    placeholder={`Enter ${label.toLowerCase()}`}
                    style={tw`border border-gray-300 rounded-xl px-4 py-3.5 font-['Poppins-Regular']`}
                    value={passwordForm[key]}
                    onChangeText={(t) => setPasswordForm({ ...passwordForm, [key]: t })}
                  />
                </View>
              ))}

              <View style={tw`flex-row gap-3 mt-6`}>
                <TouchableOpacity
                  onPress={() => setShowPasswordModal(false)}
                  style={tw`flex-1 py-3.5 bg-white border border-gray-300 rounded-xl items-center`}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontFamily: "Poppins-SemiBold", color: "#374151" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangePassword}
                  style={tw`flex-1 py-3.5 bg-purple-600 rounded-xl items-center shadow-lg`}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontFamily: "Poppins-SemiBold", color: "white" }}>
                    Update Password
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================
         LOGOUT MODAL
      ====================================================== */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center p-6`}>
          <View style={tw`bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl`}>
            <View style={tw`p-8 items-center`}>
              <View style={tw`w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6`}>
                <Ionicons name="log-out" size={36} color="#DC2626" />
              </View>

              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: "#1F2937", marginBottom: 4 }}>
                Log Out?
              </Text>
              <Text style={{
                fontFamily: "Poppins-Regular",
                fontSize: 14,
                color: "#6B7280",
                textAlign: 'center',
                marginBottom: 12
              }}>
                Are you sure you want to log out of your account?
              </Text>

              <View style={tw`flex-row gap-3 w-full mt-4`}>
                <TouchableOpacity
                  onPress={() => setShowLogoutModal(false)}
                  style={tw`flex-1 py-3.5 bg-white border border-gray-300 rounded-xl items-center`}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontFamily: "Poppins-SemiBold", color: "#374151" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  style={tw`flex-1 py-3.5 bg-red-600 rounded-xl items-center shadow-lg`}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontFamily: "Poppins-SemiBold", color: "white" }}>
                    Log Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================
         SNACKBAR
      ====================================================== */}
      {snackbar.visible && (
        <Animated.View
          style={[
            tw`absolute bottom-8 left-6 right-6`,
            {
              transform: [{ translateY: snackbarAnim }],
            }
          ]}
        >
          <View
            style={[
              tw`px-5 py-4 rounded-2xl flex-row items-center shadow-xl`,
              snackbar.type === "success"
                ? tw`bg-green-600`
                : tw`bg-red-600`,
            ]}
          >
            <Ionicons
              name={snackbar.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={24}
              color="#fff"
            />
            <Text style={{
              fontFamily: "Poppins-Medium",
              color: "#fff",
              marginLeft: 12,
              flex: 1
            }}>
              {snackbar.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}

/* ============================================================
   SUB COMPONENTS
============================================================ */

const AnimatedStat = ({ icon, label, value, color }) => {
  const [displayValue, setDisplayValue] = useState(0);

  const anim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.08,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(anim, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();

    const timer = setInterval(() => {
      setDisplayValue((prev) => {
        const diff = value - prev;
        if (diff === 0) return prev;

        const step = Math.abs(diff) > 10 ? 2 : 1;
        return prev + (diff > 0 ? step : -step);
      });
    }, 20);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <Animated.View style={{
      flex: 1,
      transform: [{ scale }],
      opacity: fade,
    }}>
      <View style={tw`bg-white rounded-3xl border border-gray-200 p-5 shadow-lg items-center`}>

        {/* ICON */}
        <View style={tw`w-12 h-12 rounded-full items-center justify-center mb-3`}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        {/* VALUE */}
        <Text style={{
          fontFamily: "Poppins-Bold",
          fontSize: 20,
          color: "#1F2937",
          textAlign: "center",
          width: "100%",
          marginBottom: 2,
        }}>
          {displayValue}
        </Text>

        {/* LABEL */}
        <Text style={{
          fontFamily: "Poppins-Medium",
          fontSize: 12,
          color: "#1F2937",
          letterSpacing: 0.4,
          textAlign: "center",
          width: "100%",
        }}>
          {label}
        </Text>

        {value === 0 && (
          <Text style={{
            fontFamily: "Poppins-Regular",
            fontSize: 10,
            color: "#9CA3AF",
            marginTop: 4,
            textAlign: "center",
          }}>
            Start by posting or enrolling
          </Text>
        )}

      </View>
    </Animated.View>
  );
};

const Section = ({ title, children, icon }) => (
  <View style={tw`mb-6`}>
    <View style={tw`flex-row items-center mb-4`}>
      <View style={tw`w-10 h-10 rounded-full items-center justify-center mr-3`}>
        <Ionicons name={icon} size={18} color="#1F2937" />
      </View>
      <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: "#1F2937" }}>
        {title}
      </Text>
    </View>
    <View style={tw`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm`}>
      {children}
    </View>
  </View>
);

const InfoRow = ({ icon, text, label }) => (
  <View style={tw`flex-row items-center bg-gray-50 rounded-xl px-4 py-3.5 mb-3`}>
    <View style={tw`w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center mr-3 shadow-sm`}>
      <Ionicons name={icon} size={18} color="#1F2937" />
    </View>
    <View style={tw`flex-1`}>
      {label && (
        <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#6B7280", marginBottom: 2 }}>
          {label}
        </Text>
      )}
      <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#374151" }}>
        {text}
      </Text>
    </View>
  </View>
);

const AnimatedCircularProgress = ({ value }) => {
  const animated = useRef(new Animated.Value(0)).current;

  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  const isFull = value === 100;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const progressColor = isFull ? "#FFD700" : "#7C3AED";

  return (
    <View style={tw`items-center justify-center`}>
      <View style={tw`w-16 h-16 items-center justify-center`}>
        <Svg width={64} height={64} style={tw`absolute inset-0`}>
          <Circle
            cx="32"
            cy="32"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="4"
            fill="none"
          />
          <AnimatedCircle
            cx="32"
            cy="32"
            r={radius}
            strokeWidth="4"
            fill="none"
            stroke={progressColor}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={animated.interpolate({
              inputRange: [0, 100],
              outputRange: [circumference, 0],
              extrapolate: "clamp",
            })}
          />
        </Svg>

        {!isFull && (
          <Text style={{
            fontFamily: "Poppins-Bold",
            fontSize: 12,
            color: "#7C3AED",
          }}>
            {value}%
          </Text>
        )}

        {isFull && (
          <View style={tw`absolute inset-0`}>
            <LottieView
              source={require("../../assets/animations/task.json")}
              autoPlay
              loop={true}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);