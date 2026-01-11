/* ============================================================
   EDIT PROFILE SCREEN
   Enhanced Professional Styling • Award-winning Design
   Updated: Collapsible Sections with Section-based Saving
============================================================ */

import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Country, City } from "country-state-city";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

import {
  updateProfile,
  updatePassword,
  updateAvatar,
  updateCoverPhoto,
  fetchUserProfile,
} from "../../store/slices/userSlice";

const { width } = Dimensions.get("window");
import { Picker } from "@react-native-picker/picker";

/* ============================================================
   ENUMS (MATCH BACKEND SCHEMA)
============================================================ */

const ROLE_OPTIONS = [
  "mentor",
  "entrepreneur",
  "advocate",
  "changemaker",
  "professional",
  "learner",
];

const ROLE_DISPLAY = {
  mentor: { label: "Mentor", icon: "ribbon", color: "#8B5CF6" },
  entrepreneur: { label: "Entrepreneur", icon: "briefcase", color: "#10B981" },
  advocate: { label: "Advocate", icon: "megaphone", color: "#F59E0B" },
  changemaker: { label: "Changemaker", icon: "flash", color: "#EF4444" },
  professional: { label: "Professional", icon: "star", color: "#3B82F6" },
  learner: { label: "Learner", icon: "school", color: "#8B5CF6" },
};

const INTEREST_OPTIONS = [
  "leadership",
  "finance",
  "health",
  "advocacy",
  "entrepreneurship",
  "education",
  "technology",
  "arts",
  "mentorship",
  "community",
  "wellness",
];

const INTEREST_DISPLAY = {
  leadership: { icon: "trophy", color: "#8B5CF6" },
  finance: { icon: "cash", color: "#10B981" },
  health: { icon: "medkit", color: "#EF4444" },
  advocacy: { icon: "megaphone", color: "#F59E0B" },
  entrepreneurship: { icon: "rocket", color: "#3B82F6" },
  education: { icon: "school", color: "#8B5CF6" },
  technology: { icon: "laptop", color: "#6366F1" },
  arts: { icon: "brush", color: "#EC4899" },
  mentorship: { icon: "people", color: "#14B8A6" },
  community: { icon: "heart", color: "#F43F5E" },
  wellness: { icon: "leaf", color: "#22C55E" },
};

const RELATIONSHIP_OPTIONS = [
  "Parent",
  "Sibling",
  "Spouse",
  "Friend",
  "Relative",
  "Colleague",
  "Guardian",
  "Other",
];

/* ============================================================
   SECTION CONFIGURATION
============================================================ */

const SECTIONS = {
  PROFILE_MEDIA: "profileMedia",
  PERSONAL_INFO: "personalInfo",
  PROFESSIONAL_ROLE: "professionalRole",
  INTERESTS: "interests",
  LOCATION: "location",
  PASSWORD: "password",
  EMERGENCY_CONTACT: "emergencyContact",
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  // ⭐ FIX: selecting from the CORRECT SLICE ROOT
  const { user } = useSelector((s) => s.user);

  /* ================= LOCAL STATE ================= */

  // Section collapse states
  const [expandedSections, setExpandedSections] = useState({
    [SECTIONS.PROFILE_MEDIA]: true,
    [SECTIONS.PERSONAL_INFO]: false,
    [SECTIONS.PROFESSIONAL_ROLE]: false,
    [SECTIONS.INTERESTS]: false,
    [SECTIONS.LOCATION]: false,
    [SECTIONS.PASSWORD]: false,
    [SECTIONS.EMERGENCY_CONTACT]: false,
  });

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("professional");
  const [interests, setInterests] = useState([]);

  const [location, setLocation] = useState({
    country: "",
    countryCode: "",
    city: "",
  });

  const [password, setPassword] = useState({ current: "", new: "" });
  const [emergency, setEmergency] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  // Track section changes separately
  const [sectionChanges, setSectionChanges] = useState({
    [SECTIONS.PROFILE_MEDIA]: false,
    [SECTIONS.PERSONAL_INFO]: false,
    [SECTIONS.PROFESSIONAL_ROLE]: false,
    [SECTIONS.INTERESTS]: false,
    [SECTIONS.LOCATION]: false,
    [SECTIONS.PASSWORD]: false,
    [SECTIONS.EMERGENCY_CONTACT]: false,
  });

  const [userLocalEmergency, setUserLocalEmergency] = useState([]);

  const [relationshipModal, setRelationshipModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const isMediaUpdatingRef = useRef(false);

  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  // Store initial values for each section
  const initialRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const [passwordError, setPasswordError] = useState("");

  /* ================= ANIMATIONS ================= */

  // const headerHeight = scrollY.interpolate({
  //   inputRange: [0, 100],
  //   outputRange: [120, 80],
  //   extrapolate: 'clamp',
  // });

  // const headerOpacity = scrollY.interpolate({
  //   inputRange: [0, 50],
  //   outputRange: [1, 0],
  //   extrapolate: 'clamp',
  // });

  /* ================= DATA ================= */

  const countries = useMemo(() => Country.getAllCountries(), []);
  const cities = useMemo(() => {
    if (!location.countryCode) return [];
    return City.getCitiesOfCountry(location.countryCode) || [];
  }, [location.countryCode]);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!user) return;

    setFullName(user.profile?.fullName || "");
    setEmail(user.email || "");
    setBio(user.profile?.bio || "");
    setRole(user.profile?.role || "professional");
    setInterests(user.profile?.interests || user.interests || []);
    setLocation(
      user.profile?.location || {
        country: "",
        countryCode: "",
        city: "",
      }
    );

    setUserLocalEmergency(
      user.safety?.emergencyContacts ||
      user.profile?.safety?.emergencyContacts ||
      []
    );

    // ✅ RESET BASELINE FOR CHANGE DETECTION
    initialRef.current = {
      fullName: user.profile?.fullName || "",
      email: user.email || "",
      bio: user.profile?.bio || "",
      role: user.profile?.role || "",
      interests: user.profile?.interests || user.interests || [],
      location: user.profile?.location || {},
      emergencyContacts:
        user.safety?.emergencyContacts ||
        user.profile?.safety?.emergencyContacts ||
        [],
    };

    // ✅ CLEAR UNSAVED FLAGS (THIS IS THE MISSING PIECE)
    setSectionChanges({
      [SECTIONS.PROFILE_MEDIA]: false,
      [SECTIONS.PERSONAL_INFO]: false,
      [SECTIONS.PROFESSIONAL_ROLE]: false,
      [SECTIONS.INTERESTS]: false,
      [SECTIONS.LOCATION]: false,
      [SECTIONS.PASSWORD]: false,
      [SECTIONS.EMERGENCY_CONTACT]: false,
    });
  }, [user]);

  /* ================= CHANGE DETECTION ================= */

  // Check for changes in each section
  useEffect(() => {
    if (!initialRef.current) return;

    // 🔒 DO NOT mark profile dirty during avatar/cover updates
    if (isMediaUpdatingRef.current) return;

    const changes = {
      [SECTIONS.PERSONAL_INFO]:
        initialRef.current.fullName !== fullName ||
        initialRef.current.email !== email ||
        initialRef.current.bio !== bio,

      [SECTIONS.PROFESSIONAL_ROLE]:
        initialRef.current.role !== role,

      [SECTIONS.INTERESTS]:
        JSON.stringify(initialRef.current.interests) !== JSON.stringify(interests),

      [SECTIONS.LOCATION]:
        JSON.stringify(initialRef.current.location) !== JSON.stringify(location),

      [SECTIONS.PASSWORD]:
        password.current.length > 0 || password.new.length > 0,

      [SECTIONS.EMERGENCY_CONTACT]:
        JSON.stringify(initialRef.current.emergencyContacts) !==
        JSON.stringify(userLocalEmergency),
    };

    setSectionChanges(changes);
  }, [
    fullName,
    email,
    bio,
    role,
    interests,
    location,
    password,
    userLocalEmergency,
  ]);

  /* ================= HELPERS ================= */

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => setSnackbar({ visible: false }), 3000);
  };

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((x) => x !== interest) : [...prev, interest]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const pickImage = async (type) => {
    isMediaUpdatingRef.current = true; // 🔒 lock change detection

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "avatar" ? [1, 1] : [16, 9],
        quality: 0.9,
      });

      if (res.canceled) return;

      const file = res.assets[0];
      const fd = new FormData();

      const response = await fetch(file.uri);
      const blob = await response.blob();

      fd.append(type === "avatar" ? "avatar" : "cover", blob, `${type}.jpg`);

      if (type === "avatar") {
        await dispatch(updateAvatar(fd)).unwrap();
      } else {
        await dispatch(updateCoverPhoto(fd)).unwrap();
      }

      showSnackbar(`${type === "avatar" ? "Profile" : "Cover"} photo updated`);
    } catch {
      showSnackbar("Upload failed", "error");
    } finally {
      // 🔓 unlock AFTER Redux settles
      setTimeout(() => {
        isMediaUpdatingRef.current = false;
      }, 0);
    }
  };

  /* ================= EMERGENCY STAGING ================= */

  const handleAddEmergencyContact = () => {
    if (!emergency.name || !emergency.phone || !emergency.relationship) {
      showSnackbar("Name, phone & relationship required", "error");
      return;
    }

    setUserLocalEmergency((prev) => [
      ...prev,
      {
        name: emergency.name,
        phone: emergency.phone,
        relationship: emergency.relationship,
      },
    ]);

    setEmergency({ name: "", phone: "", relationship: "" });
    showSnackbar("Staged locally — click SAVE to persist", "success");
  };

  const removeStagedContact = (index) => {
    setUserLocalEmergency((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /* ================= SECTION-BASED SAVE FUNCTIONS ================= */

  const savePersonalInfo = async () => {
    if (!sectionChanges[SECTIONS.PERSONAL_INFO]) return;

    setSaving(true);
    try {
      const payload = { fullName, email, bio };
      await dispatch(updateProfile(payload)).unwrap();

      // Update initial ref for this section
      if (initialRef.current) {
        initialRef.current.fullName = fullName;
        initialRef.current.email = email;
        initialRef.current.bio = bio;
      }

      setSectionChanges(prev => ({ ...prev, [SECTIONS.PERSONAL_INFO]: false }));
      showSnackbar("Personal information updated", "success");
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveProfessionalRole = async () => {
    if (!sectionChanges[SECTIONS.PROFESSIONAL_ROLE]) return;

    setSaving(true);
    try {
      const payload = { role };
      await dispatch(updateProfile(payload)).unwrap();

      if (initialRef.current) {
        initialRef.current.role = role;
      }

      setSectionChanges(prev => ({ ...prev, [SECTIONS.PROFESSIONAL_ROLE]: false }));
      showSnackbar("Professional role updated", "success");
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveInterests = async () => {
    if (!sectionChanges[SECTIONS.INTERESTS]) return;

    setSaving(true);
    try {
      const payload = {
        profile: {
          interests: interests,
        },
      };

      console.log("Payload: ", payload);
      await dispatch(updateProfile(payload)).unwrap();

      if (initialRef.current) {
        initialRef.current.interests = [...interests];
      }

      setSectionChanges(prev => ({
        ...prev,
        [SECTIONS.INTERESTS]: false,
      }));

      showSnackbar("Interests updated", "success");
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!sectionChanges[SECTIONS.LOCATION]) return;

    // 🔒 HARD GUARD — NEVER send invalid location
    if (!location.countryCode || location.countryCode.length < 2) {
      showSnackbar("Please select a valid country", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        location: {
          country: location.country,
          countryCode: location.countryCode,
          city: location.city || undefined, // optional
        },
      };

      await dispatch(updateProfile(payload)).unwrap();

      if (initialRef.current) {
        initialRef.current.location = { ...location };
      }

      setSectionChanges((prev) => ({
        ...prev,
        [SECTIONS.LOCATION]: false,
      }));

      showSnackbar("Location updated", "success");
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveEmergencyContacts = async () => {
    if (!sectionChanges[SECTIONS.EMERGENCY_CONTACT]) return;

    setSaving(true);
    try {
      const payload = {
        profile: {
          safety: {
            emergencyContacts: userLocalEmergency,
          },
        },
      };

      await dispatch(updateProfile(payload)).unwrap();

      if (initialRef.current) {
        initialRef.current.emergencyContacts = [...userLocalEmergency];
      }

      setSectionChanges(prev => ({
        ...prev,
        [SECTIONS.EMERGENCY_CONTACT]: false,
      }));

      showSnackbar("Emergency contacts updated", "success");
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!sectionChanges[SECTIONS.PASSWORD]) return;

    if (!password.current || !password.new) {
      setPasswordError("Both fields are required");
      return;
    }

    if (password.new.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await dispatch(updatePassword({
        currentPassword: password.current,
        newPassword: password.new
      })).unwrap();

      setPassword({ current: "", new: "" });
      setPasswordError("");
      setSectionChanges(prev => ({ ...prev, [SECTIONS.PASSWORD]: false }));
      showSnackbar("Password updated successfully");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  // Save all changed sections at once
  const saveAllChanges = async () => {
    const sectionsToSave = Object.entries(sectionChanges)
      .filter(([_, hasChanges]) => hasChanges)
      .map(([section]) => section);

    if (sectionsToSave.length === 0) {
      showSnackbar("No changes to save", "info");
      return;
    }

    setSaving(true);

    // Execute save functions for each changed section
    const saveFunctions = {
      [SECTIONS.PERSONAL_INFO]: savePersonalInfo,
      [SECTIONS.PROFESSIONAL_ROLE]: saveProfessionalRole,
      [SECTIONS.INTERESTS]: saveInterests,
      [SECTIONS.LOCATION]: saveLocation,
      [SECTIONS.PASSWORD]: handlePasswordUpdate,
      [SECTIONS.EMERGENCY_CONTACT]: saveEmergencyContacts,
    };

    try {
      for (const section of sectionsToSave) {
        if (saveFunctions[section]) {
          await saveFunctions[section]();
        }
      }

      showSnackbar("All changes saved successfully", "success");
    } catch (err) {
      showSnackbar("Some updates failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  /* ================= RENDER ================= */

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-50`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* FLOATING HEADER */}
      {/* <Animated.View
        style={[
          tw`absolute top-0 left-0 right-0 bg-white border-b border-gray-200 z-10`,
          {
            height: headerHeight,
            opacity: headerOpacity
          }
        ]}
      /> */}

      {/* FIXED PURPLE HEADER */}
      <View
        style={[
          tw`absolute top-0 left-0 right-0 z-50`,
          {
            backgroundColor: "#6A1B9A", // Purple-600
            height: 140,                // ✅ MATCH HOME HEADER
            paddingTop: Platform.OS === "ios" ? 56 : 32,
            paddingBottom: 24,
            borderBottomLeftRadius: 35,
            borderBottomRightRadius: 35,
          },
        ]}
      >
        <View
          style={tw`px-6 flex-row items-center justify-between flex-1`}
        >
          {/* BACK BUTTON */}
          <TouchableOpacity
            onPress={() => {
              const hasAnyChanges = Object.values(sectionChanges).some(Boolean);
              if (hasAnyChanges) {
                showSnackbar("You have unsaved changes", "error");
              } else {
                router.back();
              }
            }}
            style={tw`w-10 h-10 bg-white/20 rounded-full items-center justify-center`}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* TITLE */}
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 20,   // ⬆️ slightly larger
              color: "#FFFFFF",
            }}
          >
            Edit Profile
          </Text>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            onPress={saveAllChanges}
            disabled={!Object.values(sectionChanges).some(Boolean) || saving}
            style={[
              tw`px-4 py-2 rounded-full`,
              Object.values(sectionChanges).some(Boolean)
                ? tw`bg-white`
                : tw`bg-white/40`,
            ]}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 14,
                color: Object.values(sectionChanges).some(Boolean)
                  ? "#7C3AED"
                  : "#6B7280",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        contentContainerStyle={tw`pb-32`}
      >
        {/* HERO SECTION */}
        <View style={tw`pt-24 pb-8 px-6 mt-20`}>
          <Text style={tw`text-2xl text-gray-900 mb-2`}
            fontFamily="Poppins-Bold">
            Edit Profile
          </Text>
          <Text style={tw`font-['Poppins-Regular'] text-gray-600`}>
            Update your personal and professional information
          </Text>
        </View>

        {/* PROFILE MEDIA SECTION */}
        <CollapsibleSection
          title="Profile Media"
          icon="image"
          isExpanded={expandedSections[SECTIONS.PROFILE_MEDIA]}
          onToggle={() => toggleSection(SECTIONS.PROFILE_MEDIA)}
          hasChanges={false} // Image uploads are handled separately
        >
          {expandedSections[SECTIONS.PROFILE_MEDIA] && (
            <View style={tw`flex-row gap-4`}>
              <TouchableOpacity
                onPress={() => pickImage("avatar")}
                style={tw`flex-1 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm`}
                activeOpacity={0.85}
              >
                <View style={tw`items-center mb-4`}>
                  <View style={tw`w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-amber-50 border-4 border-white shadow-lg overflow-hidden`}>
                    {user.profile?.avatar?.url ? (
                      <Image
                        source={{ uri: user.profile.avatar.url }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={tw`w-full h-full items-center justify-center`}>
                        <Ionicons name="person" size={40} color="#7C3AED" />
                      </View>
                    )}
                  </View>
                </View>
                <Text style={tw`font-['Poppins-SemiBold'] text-center text-gray-900 mb-1`}>
                  Profile Photo
                </Text>
                <Text style={tw`font-['Poppins-Regular'] text-xs text-center text-gray-500`}>
                  Tap to change
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickImage("cover")}
                style={tw`flex-1 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm`}
                activeOpacity={0.85}
              >
                <View style={tw`items-center mb-4`}>
                  <View style={tw`w-full h-16 rounded-lg bg-gradient-to-r from-purple-500 to-amber-400 shadow-sm overflow-hidden`}>
                    {user.profile?.coverPhoto?.url ? (
                      <Image
                        source={{ uri: user.profile.coverPhoto.url }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={tw`w-full h-full items-center justify-center`}>
                        <Ionicons name="image" size={24} color="#FFF" />
                      </View>
                    )}
                  </View>
                </View>
                <Text style={tw`font-['Poppins-SemiBold'] text-center text-gray-900 mb-1`}>
                  Cover Photo
                </Text>
                <Text style={tw`font-['Poppins-Regular'] text-xs text-center text-gray-500`}>
                  Tap to change
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </CollapsibleSection>

        {/* PERSONAL INFORMATION SECTION */}
        <CollapsibleSection
          title="Personal Information"
          icon="person"
          isExpanded={expandedSections[SECTIONS.PERSONAL_INFO]}
          onToggle={() => toggleSection(SECTIONS.PERSONAL_INFO)}
          hasChanges={sectionChanges[SECTIONS.PERSONAL_INFO]}
          onSave={savePersonalInfo}
          saving={saving}
        >
          {expandedSections[SECTIONS.PERSONAL_INFO] && (
            <>
              <Field label="Full Name" required>
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="person-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              <Field label="Email Address" required>
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              <Field label="Bio">
                <View style={tw`bg-white border border-gray-300 rounded-xl px-4 py-3 min-h-[100px]`}>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={tw`font-['Poppins-Regular'] text-gray-900 min-h-[80px]`}
                    maxLength={500}
                  />
                  <View style={tw`flex-row justify-between mt-2`}>
                    <Text style={tw`font-['Poppins-Regular'] text-xs text-gray-500`}>
                      {bio.length}/500 characters
                    </Text>
                    <Text style={tw`font-['Poppins-Medium'] text-xs ${bio.length > 20 ? 'text-green-600' : 'text-gray-500'}`}>
                      {bio.length > 20 ? '✓ Good length' : 'Add more details'}
                    </Text>
                  </View>
                </View>
              </Field>
            </>
          )}
        </CollapsibleSection>

        {/* PROFESSIONAL ROLE SECTION */}
        <CollapsibleSection
          title="Professional Role"
          icon="briefcase"
          isExpanded={expandedSections[SECTIONS.PROFESSIONAL_ROLE]}
          onToggle={() => toggleSection(SECTIONS.PROFESSIONAL_ROLE)}
          hasChanges={sectionChanges[SECTIONS.PROFESSIONAL_ROLE]}
          onSave={saveProfessionalRole}
          saving={saving}
        >
          {expandedSections[SECTIONS.PROFESSIONAL_ROLE] && (
            <>
              <Text style={tw`font-['Poppins-Regular'] text-gray-600 mb-4`}>
                Select your primary role in the community
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {ROLE_OPTIONS.map((r) => {
                  const meta = ROLE_DISPLAY[r];
                  const isActive = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRole(r)}
                      style={[
                        tw`flex-row items-center px-4 py-3 rounded-xl border mb-2`,
                        isActive
                          ? { backgroundColor: `${meta.color}15`, borderColor: meta.color }
                          : tw`bg-white border-gray-300`
                      ]}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={16}
                        color={isActive ? meta.color : "#6B7280"}
                      />
                      <Text style={[
                        tw`ml-2 font-['Poppins-Medium']`,
                        isActive
                          ? { color: meta.color }
                          : tw`text-gray-700`
                      ]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </CollapsibleSection>

        {/* INTERESTS SECTION */}
        <CollapsibleSection
          title="Interests"
          icon="heart"
          isExpanded={expandedSections[SECTIONS.INTERESTS]}
          onToggle={() => toggleSection(SECTIONS.INTERESTS)}
          hasChanges={sectionChanges[SECTIONS.INTERESTS]}
          onSave={saveInterests}
          saving={saving}
        >
          {expandedSections[SECTIONS.INTERESTS] && (
            <>
              <Text style={tw`font-['Poppins-Regular'] text-gray-600 mb-4`}>
                Select topics you're passionate about
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {INTEREST_OPTIONS.map((interest) => {
                  const meta = INTEREST_DISPLAY[interest];
                  const isActive = interests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      onPress={() => toggleInterest(interest)}
                      style={[
                        tw`flex-row items-center px-4 py-2.5 rounded-full border`,
                        isActive
                          ? { backgroundColor: `${meta.color}15`, borderColor: meta.color }
                          : tw`bg-white border-gray-300`
                      ]}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={14}
                        color={isActive ? meta.color : "#6B7280"}
                      />
                      <Text style={[
                        tw`ml-2 font-['Poppins-Medium'] capitalize`,
                        isActive
                          ? { color: meta.color }
                          : tw`text-gray-700`
                      ]}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {interests.length > 0 && (
                <View style={tw`mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100`}>
                  <Text style={tw`font-['Poppins-Medium'] text-purple-700`}>
                    {interests.length} interest{interests.length !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              )}
            </>
          )}
        </CollapsibleSection>

        {/* LOCATION SECTION */}
        <CollapsibleSection
          title="Location"
          icon="location"
          isExpanded={expandedSections[SECTIONS.LOCATION]}
          onToggle={() => toggleSection(SECTIONS.LOCATION)}
          hasChanges={sectionChanges[SECTIONS.LOCATION]}
          onSave={saveLocation}
          saving={saving}
        >
          {expandedSections[SECTIONS.LOCATION] && (
            <>
              <Field label="Country">
                <TouchableOpacity
                  onPress={() => setCountryModal(true)}
                  style={tw`bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between`}
                  activeOpacity={0.85}
                >
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="earth-outline" size={18} color="#6B7280" />
                    <Text style={tw`ml-3 font-['Poppins-Regular'] ${location.country ? 'text-gray-900' : 'text-gray-500'}`}>
                      {location.country || "Select country"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
              </Field>

              <Field label="City">
                <TouchableOpacity
                  onPress={() => location.countryCode ? setCityModal(true) : showSnackbar("Select country first", "error")}
                  style={[
                    tw`border rounded-xl px-4 py-3 flex-row items-center justify-between`,
                    location.countryCode
                      ? tw`bg-white border-gray-300`
                      : tw`bg-gray-100 border-gray-300`
                  ]}
                  activeOpacity={0.85}
                  disabled={!location.countryCode}
                >
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="location-outline" size={18} color={location.countryCode ? "#6B7280" : "#9CA3AF"} />
                    <Text style={[
                      tw`ml-3 font-['Poppins-Regular']`,
                      location.city
                        ? tw`text-gray-900`
                        : location.countryCode
                          ? tw`text-gray-500`
                          : tw`text-gray-400`
                    ]}>
                      {location.city || (location.countryCode ? "Select city" : "Select country first")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={location.countryCode ? "#6B7280" : "#9CA3AF"} />
                </TouchableOpacity>
              </Field>
            </>
          )}
        </CollapsibleSection>

        {/* PASSWORD SECTION */}
        <CollapsibleSection
          title="Change Password"
          icon="lock-closed"
          isExpanded={expandedSections[SECTIONS.PASSWORD]}
          onToggle={() => toggleSection(SECTIONS.PASSWORD)}
          hasChanges={sectionChanges[SECTIONS.PASSWORD]}
          onSave={handlePasswordUpdate}
          saving={saving}
        >
          {expandedSections[SECTIONS.PASSWORD] && (
            <>
              <Field label="Current Password">
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={password.current}
                    onChangeText={(t) => setPassword({ ...password, current: t })}
                    placeholder="Enter current password"
                    secureTextEntry
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              <Field label="New Password">
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={password.new}
                    onChangeText={(t) => setPassword({ ...password, new: t })}
                    placeholder="Enter new password"
                    secureTextEntry
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              {passwordError ? (
                <Text style={tw`text-red-500 text-sm font-['Poppins-Regular'] mt-2`}>
                  {passwordError}
                </Text>
              ) : null}
            </>
          )}
        </CollapsibleSection>

        {/* EMERGENCY CONTACT SECTION */}
        <CollapsibleSection
          title="Emergency Contact"
          icon="shield-checkmark"
          isExpanded={expandedSections[SECTIONS.EMERGENCY_CONTACT]}
          onToggle={() => toggleSection(SECTIONS.EMERGENCY_CONTACT)}
          hasChanges={sectionChanges[SECTIONS.EMERGENCY_CONTACT]}
          onSave={saveEmergencyContacts}
          saving={saving}
        >
          {expandedSections[SECTIONS.EMERGENCY_CONTACT] && (
            <>
              <Text style={tw`font-['Poppins-Regular'] text-gray-600 mb-4`}>
                Add emergency contact for safety purposes
              </Text>

              {/* Display existing/staged contacts */}
              {userLocalEmergency.length > 0 && (
                <View style={tw`mb-6`}>
                  <Text style={tw`font-['Poppins-Medium'] text-gray-700 mb-3`}>
                    Staged Contacts ({userLocalEmergency.length})
                  </Text>
                  {userLocalEmergency.map((contact, index) => (
                    <View
                      key={index}
                      style={tw`flex-row items-center justify-between bg-gray-50 rounded-xl p-4 mb-2 border border-gray-200`}
                    >
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center`}>
                          <Ionicons name="person" size={16} color="#7C3AED" />
                          <Text style={tw`font-['Poppins-SemiBold'] text-gray-900 ml-2`}>
                            {contact.name}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center mt-1`}>
                          <Ionicons name="call" size={14} color="#6B7280" />
                          <Text style={tw`font-['Poppins-Regular'] text-gray-600 ml-2`}>
                            {contact.phone}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center mt-1`}>
                          <Ionicons name="people" size={14} color="#6B7280" />
                          <Text style={tw`font-['Poppins-Regular'] text-gray-600 ml-2`}>
                            {contact.relationship}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeStagedContact(index)}
                        style={tw`ml-2 p-2`}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Field label="Contact Name">
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="person-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={emergency.name}
                    onChangeText={(t) => setEmergency({ ...emergency, name: t })}
                    placeholder="Enter contact name"
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              <Field label="Phone Number">
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="call-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={emergency.phone}
                    onChangeText={(t) => setEmergency({ ...emergency, phone: t })}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
                  />
                </View>
              </Field>

              <Field label="Relationship" required>
                <Picker
                  selectedValue={emergency.relationship}
                  onValueChange={(value) => {
                    setEmergency((prev) => ({ ...prev, relationship: value }));
                  }}
                  style={tw`mb-6`}
                >
                  <Picker.Item
                    label="Select relationship"
                    value=""
                    style={{ fontFamily: 'Poppins-Regular' }}
                  />
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <Picker.Item
                      key={r}
                      label={r}
                      value={r}
                      style={{ fontFamily: 'Poppins-Regular' }}
                    />
                  ))}
                </Picker>

                <TouchableOpacity
                  onPress={handleAddEmergencyContact}
                  style={tw`mt-3 bg-purple-600 py-3 rounded-xl items-center`}
                >
                  <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 16, color: "#FFFFFF" }}>
                    Stage Contact
                  </Text>
                </TouchableOpacity>
              </Field>
            </>
          )}
        </CollapsibleSection>

        {/* SAVE ALL BUTTON */}
        {/* <View style={tw`px-6 mt-10 mb-10`}>
          <TouchableOpacity
            onPress={saveAllChanges}
            disabled={!Object.values(sectionChanges).some(Boolean) || saving}
            style={[
              tw`py-4 rounded-2xl items-center shadow-lg`,
              Object.values(sectionChanges).some(Boolean)
                ? tw`bg-gradient-to-r from-purple-600 to-amber-500`
                : tw`bg-gray-300`
            ]}
            activeOpacity={0.85}
          >
            {saving ? (
              <View style={tw`flex-row items-center`}>
                <ActivityIndicator size="small" color="#FFF" style={tw`mr-2`} />
                <Text style={tw`font-['Poppins-SemiBold'] text-lg text-white`}>
                  Saving Changes...
                </Text>
              </View>
            ) : (
              <>
                <Text style={tw`font-['Poppins-SemiBold'] text-lg ${Object.values(sectionChanges).some(Boolean) ? 'text-white' : 'text-gray-500'}`}>
                  Save All Changes
                </Text>
                {Object.values(sectionChanges).some(Boolean) && (
                  <Text style={tw`font-['Poppins-Regular'] text-white/80 text-sm mt-1`}>
                    Only changed sections will be updated
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      {/* COUNTRY MODAL */}
      <SearchModal
        visible={countryModal}
        title="Select Country"
        data={countries}
        search={countrySearch}
        setSearch={setCountrySearch}
        onClose={() => setCountryModal(false)}
        onSelect={(country) => {
          setLocation({ country: country.name, countryCode: country.isoCode, city: "" });
          setCountryModal(false);
          setCountrySearch("");
        }}
      />

      {/* CITY MODAL */}
      <SearchModal
        visible={cityModal}
        title="Select City"
        data={cities}
        search={citySearch}
        setSearch={setCitySearch}
        onClose={() => setCityModal(false)}
        onSelect={(city) => {
          setLocation({ ...location, city: city.name });
          setCityModal(false);
          setCitySearch("");
        }}
      />

      {/* Relationship Modal Sheet */}
      <Modal visible={relationshipModal} animationType="slide" presentationStyle="pageSheet">
        <View style={tw`flex-1 bg-white pt-12`}>
          <View style={tw`px-6 pb-4 border-b border-gray-200`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 24, color: "#111827" }}>
                Select Relationship
              </Text>
              <TouchableOpacity
                onPress={() => setRelationshipModal(false)}
                style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center`}
              >
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`px-6 pt-6`}>
            <Picker
              selectedValue={emergency.relationship}
              onValueChange={(value) =>
                setEmergency((prev) => ({ ...prev, relationship: value }))
              }
              style={tw`mb-6`}
            >
              <Picker.Item
                label="Select relationship"
                value=""
                style={{ fontFamily: 'Poppins-Regular' }}
              />
              {RELATIONSHIP_OPTIONS.map((r) => (
                <Picker.Item
                  key={r}
                  label={r}
                  value={r}
                  style={{ fontFamily: 'Poppins-Regular' }}
                />
              ))}
            </Picker>

            <TouchableOpacity
              onPress={() => setRelationshipModal(false)}
              style={tw`mt-6 bg-purple-600 py-3 rounded-xl items-center`}
            >
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 16, color: "#FFFFFF" }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SNACKBAR */}
      {snackbar.visible && (
        <View style={[
          tw`absolute bottom-6 left-6 right-6 rounded-2xl px-5 py-4 shadow-2xl`,
          snackbar.type === "success"
            ? tw`bg-gradient-to-r from-green-600 to-green-500`
            : tw`bg-gradient-to-r from-red-600 to-red-500`
        ]}>
          <View style={tw`flex-row items-center`}>
            <Ionicons
              name={snackbar.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={24}
              color="#fff"
            />
            <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 16, color: "#FFFFFF", marginLeft: 12, flex: 1 }}>
              {snackbar.message}
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   SUB COMPONENTS (ENHANCED)
============================================================ */

const CollapsibleSection = ({
  title,
  children,
  icon,
  isExpanded,
  onToggle,
  hasChanges,
  onSave,
  saving
}) => (
  <View style={tw`mb-6 mx-6`}>
    {/* SECTION HEADER */}
    <TouchableOpacity
      onPress={onToggle}
      style={tw`bg-white rounded-2xl border ${hasChanges ? 'border-purple-300' : 'border-gray-200'} p-6 shadow-sm mb-0`}
      activeOpacity={0.85}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View style={tw`w-12 h-12 rounded-full ${hasChanges ? 'bg-purple-100' : 'bg-gray-100'} items-center justify-center mr-4`}>
            <Ionicons name={icon} size={20} color={hasChanges ? "#7C3AED" : "#6B7280"} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`font-['Poppins-Bold'] text-xl text-gray-900`}>
              {title}
            </Text>
            {hasChanges && (
              <View style={tw`flex-row items-center mt-1`}>
                <View style={tw`w-2 h-2 bg-purple-500 rounded-full mr-1`} />
                <Text style={tw`font-['Poppins-Regular'] text-xs text-purple-600`}>
                  Unsaved changes
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={tw`flex-row items-center`}>
          {hasChanges && onSave && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSave();
              }}
              disabled={saving}
              style={tw`bg-purple-500 px-4 py-2 rounded-lg mr-3`}
            >
              <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: "#FFFFFF" }}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          )}

          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#6B7280"
          />
        </View>
      </View>
    </TouchableOpacity>

    {/* SECTION CONTENT (Collapsible) */}
    {isExpanded && (
      <View style={tw`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm -mt-2 pt-8`}>
        {children}
      </View>
    )}
  </View>
);

const Field = ({ label, children, required }) => (
  <View style={tw`mb-5`}>
    <View style={tw`flex-row items-center mb-2`}>
      <Text style={tw`font-['Poppins-Medium'] text-sm text-gray-700`}>
        {label}
      </Text>
      {required && (
        <Text style={tw`text-red-500 ml-1`}>*</Text>
      )}
    </View>
    {children}
  </View>
);

const SearchModal = ({ visible, title, data, search, setSearch, onSelect, onClose }) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    statusBarTranslucent
  >
    <View style={tw`flex-1 bg-white`}>
      {/* MODAL HEADER */}
      <View style={tw`px-6 pt-12 pb-4 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 24, color: "#111827" }}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center`}
          >
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-4 py-3`}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            style={{
              flex: 1,
              marginLeft: 12,
              fontFamily: 'Poppins-Regular',
              fontSize: 16,
              color: "#111827"
            }}
            autoFocus
          />
        </View>
      </View>

      {/* RESULTS */}
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {data
          .filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
          .map((x) => (
            <TouchableOpacity
              key={x.name}
              onPress={() => onSelect(x)}
              style={tw`px-6 py-4 border-b border-gray-100 active:bg-gray-50`}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 16, color: "#111827" }}>
                {x.name}
              </Text>
            </TouchableOpacity>
          ))}

        {data.length === 0 && (
          <View style={tw`px-6 py-12 items-center`}>
            <Ionicons name="globe-outline" size={48} color="#D1D5DB" />
            <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 16, color: "#6B7280", marginTop: 16, textAlign: 'center' }}>
              No results found
            </Text>
            <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: 'center' }}>
              Try a different search term
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CLOSE BUTTON */}
      <View style={tw`px-6 py-4 border-t border-gray-200`}>
        <TouchableOpacity
          onPress={onClose}
          style={tw`bg-gray-100 py-3 rounded-xl items-center`}
          activeOpacity={0.85}
        >
          <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 16, color: "#374151" }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);