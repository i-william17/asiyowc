/* ============================================================
   EDIT PROFILE SCREEN
   Enhanced Professional Styling • Award-winning Design
   Updated: Simplified Architecture with Single Source of Truth
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

  // SINGLE FORM STATE OBJECT - replaces 7+ individual states
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    bio: "",
    role: "professional",
    interests: [],
    location: {
      country: "",
      countryCode: "",
      city: "",
    },
    password: {
      current: "",
      new: "",
    },
    emergencyContacts: [],
  });

  // Temporary emergency contact form (not saved until staged)
  const [emergencyForm, setEmergencyForm] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  // Store initial values for change detection
  const initialRef = useRef(null);
  const isMediaUpdatingRef = useRef(false);
  const isSavingRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [baselineVersion, setBaselineVersion] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const [passwordError, setPasswordError] = useState("");

  // Modal states
  const [relationshipModal, setRelationshipModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  /* ================= DATA ================= */

  const countries = useMemo(() => Country.getAllCountries(), []);
  const cities = useMemo(() => {
    if (!form.location.countryCode) return [];
    return City.getCitiesOfCountry(form.location.countryCode) || [];
  }, [form.location.countryCode]);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!user) return;

    const baseline = {
      fullName: user.profile?.fullName || "",
      email: user.email || "",
      bio: user.profile?.bio || "",
      role: user.profile?.role || "professional",
      interests: user.profile?.interests || user.interests || [],
      location: user.profile?.location || {
        country: "",
        countryCode: "",
        city: "",
      },
      password: { current: "", new: "" },
      emergencyContacts:
        user.safety?.emergencyContacts ||
        user.profile?.safety?.emergencyContacts ||
        [],
    };

    initialRef.current = JSON.parse(JSON.stringify(baseline));
    setForm(JSON.parse(JSON.stringify(baseline)));

    // ⭐ Force change detection refresh
    setBaselineVersion((v) => v + 1);

  }, [user]);

  /* ================= FORM UPDATE HELPERS ================= */

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateLocation = (key, value) => {
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [key]: value
      }
    }));
  };

  const updatePasswordField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      password: {
        ...prev.password,
        [key]: value
      }
    }));
  };

  const updateEmergencyContacts = (contacts) => {
    setForm((prev) => ({
      ...prev,
      emergencyContacts: contacts
    }));
  };

  /* ================= CHANGE DETECTION ================= */
  const deepEqual = (a, b) => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  const hasChanges = useMemo(() => {
    if (!initialRef.current) return false;

    const { password, ...formRest } = form;
    const { password: _, ...baselineRest } = initialRef.current;

    const formChanged = !deepEqual(formRest, baselineRest);
    const passwordChanged =
      form.password.current.length > 0 || form.password.new.length > 0;

    return formChanged || passwordChanged;

  }, [form, baselineVersion]);

  // Section-specific change detection
  const sectionChanges = useMemo(() => {
    if (!initialRef.current) return {};

    return {
      [SECTIONS.PERSONAL_INFO]:
        initialRef.current.fullName !== form.fullName ||
        initialRef.current.email !== form.email ||
        initialRef.current.bio !== form.bio,

      [SECTIONS.PROFESSIONAL_ROLE]:
        initialRef.current.role !== form.role,

      [SECTIONS.INTERESTS]:
        JSON.stringify(initialRef.current.interests) !==
        JSON.stringify(form.interests),

      [SECTIONS.LOCATION]:
        JSON.stringify(initialRef.current.location) !==
        JSON.stringify(form.location),

      [SECTIONS.PASSWORD]:
        form.password.current.length > 0 || form.password.new.length > 0,

      [SECTIONS.EMERGENCY_CONTACT]:
        JSON.stringify(initialRef.current.emergencyContacts) !==
        JSON.stringify(form.emergencyContacts),
    };

  }, [form, baselineVersion]);

  /* ================= HELPERS ================= */

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() =>
      setSnackbar(prev => ({ ...prev, visible: false })),
      3000);
  };

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((x) => x !== interest)
        : [...prev.interests, interest]
    }));
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

  /* ================= EMERGENCY CONTACT HANDLING ================= */

  const handleAddEmergencyContact = () => {
    if (!emergencyForm.name || !emergencyForm.phone || !emergencyForm.relationship) {
      showSnackbar("Name, phone & relationship required", "error");
      return;
    }

    updateEmergencyContacts([
      ...form.emergencyContacts,
      {
        name: emergencyForm.name,
        phone: emergencyForm.phone,
        relationship: emergencyForm.relationship,
      }
    ]);

    setEmergencyForm({ name: "", phone: "", relationship: "" });
    showSnackbar("Staged locally — click SAVE to persist", "success");
  };

  const removeStagedContact = (index) => {
    updateEmergencyContacts(
      form.emergencyContacts.filter((_, i) => i !== index)
    );
  };

  /* ================= SAVE FUNCTIONS ================= */
  const saveAllChanges = async () => {
    if (saving || isSavingRef.current) return;

    if (!hasChanges) {
      showSnackbar("No changes to save", "info");
      return;
    }

    setSaving(true);
    isSavingRef.current = true;

    try {
      const profilePayload = {};
      const profileData = {};
      const baseline = initialRef.current;

      /* ================= PROFILE FIELDS ================= */

      if (baseline.fullName !== form.fullName)
        profilePayload.fullName = form.fullName;

      if (baseline.email !== form.email)
        profilePayload.email = form.email;

      if (baseline.bio !== form.bio)
        profilePayload.bio = form.bio;

      if (baseline.role !== form.role)
        profilePayload.role = form.role;

      /* ================= INTERESTS ================= */

      if (
        JSON.stringify(baseline.interests) !==
        JSON.stringify(form.interests)
      ) {
        profileData.interests = form.interests;
      }

      /* ================= EMERGENCY CONTACT ================= */

      if (
        JSON.stringify(baseline.emergencyContacts) !==
        JSON.stringify(form.emergencyContacts)
      ) {
        profileData.safety = {
          emergencyContacts: form.emergencyContacts,
        };
      }

      /* ================= LOCATION ================= */

      if (
        JSON.stringify(baseline.location) !==
        JSON.stringify(form.location)
      ) {
        profileData.location = form.location;
      }

      /* ================= NEST PROFILE ================= */

      if (Object.keys(profileData).length > 0) {
        profilePayload.profile = profileData;
      }

      /* ================= UPDATE PROFILE ================= */

      if (Object.keys(profilePayload).length > 0) {
        await dispatch(updateProfile(profilePayload)).unwrap();
      }
      // let updatedUser = user;

      // if (Object.keys(profilePayload).length > 0) {
      //   const res = await dispatch(updateProfile(profilePayload)).unwrap();
      //   updatedUser = res.user;
      // }

      /* ================= PASSWORD ================= */

      if (form.password.current && form.password.new) {
        if (form.password.new.length < 6) {
          setPasswordError("New password must be at least 6 characters");
          setSaving(false);
          isSavingRef.current = false;
          return;
        }

        await dispatch(
          updatePassword({
            currentPassword: form.password.current,
            newPassword: form.password.new,
          })
        ).unwrap();

        setForm((prev) => ({
          ...prev,
          password: { current: "", new: "" },
        }));

        setPasswordError("");
      }

      /* ================= REFRESH USER ================= */

      // const updatedUser = user;

      /* ================= RESET BASELINE ================= */

      // const newBaseline = {
      //   fullName: updatedUser.profile?.fullName || "",
      //   email: updatedUser.email || "",
      //   bio: updatedUser.profile?.bio || "",
      //   role: updatedUser.profile?.role || "professional",
      //   interests: updatedUser.profile?.interests || [],
      //   location: updatedUser.profile?.location || {
      //     country: "",
      //     countryCode: "",
      //     city: "",
      //   },
      //   password: { current: "", new: "" },
      //   emergencyContacts:
      //     updatedUser.profile?.safety?.emergencyContacts || [],
      // };
      // ✅ Use the saved form as the canonical state
      const committedBaseline = {
        fullName: form.fullName,
        email: form.email,
        bio: form.bio,
        role: form.role,
        interests: form.interests,
        location: form.location,
        password: { current: "", new: "" },
        emergencyContacts: form.emergencyContacts,
      };

      initialRef.current = JSON.parse(JSON.stringify(committedBaseline));
      setForm(JSON.parse(JSON.stringify(committedBaseline)));

      /* ================= RESET CHANGE DETECTION ================= */

      setBaselineVersion((v) => v + 1);

      showSnackbar("All changes saved successfully", "success");

    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");
    } finally {
      isSavingRef.current = false;
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
      {/* FIXED PURPLE HEADER */}
      <View
        style={[
          tw`absolute top-0 left-0 right-0 z-50`,
          {
            backgroundColor: "#6A1B9A", // Purple-600
            height: 140,
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
              if (hasChanges) {
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
              fontSize: 20,
              color: "#FFFFFF",
            }}
          >
            Edit Profile
          </Text>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            onPress={saveAllChanges}
            disabled={!hasChanges || saving}
            style={[
              tw`px-4 py-2 rounded-full`,
              hasChanges
                ? tw`bg-white`
                : tw`bg-white/40`,
            ]}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 14,
                color: hasChanges
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
          <Text style={[tw`text-xl text-gray-900 mb-2`, { fontFamily: "Poppins-Bold" }]}>
            Edit Profile
          </Text>
          <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280" }}>
            Update your personal and professional information
          </Text>
        </View>

        {/* PROFILE MEDIA SECTION */}
        <CollapsibleSection
          title="Profile Media"
          icon="image"
          isExpanded={expandedSections[SECTIONS.PROFILE_MEDIA]}
          onToggle={() => toggleSection(SECTIONS.PROFILE_MEDIA)}
          hasChanges={false}
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
                <Text style={[tw`text-center text-gray-900 mb-1`, { fontFamily: "Poppins-SemiBold" }]}>
                  Profile Photo
                </Text>
                <Text style={[tw`text-xs text-center text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
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
                <Text style={[tw`text-center text-gray-900 mb-1`, { fontFamily: "Poppins-SemiBold" }]}>
                  Cover Photo
                </Text>
                <Text style={[tw`text-xs text-center text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
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
        >
          {expandedSections[SECTIONS.PERSONAL_INFO] && (
            <>
              <Field label="Full Name" required>
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="person-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={form.fullName}
                    onChangeText={(t) => updateField("fullName", t)}
                    placeholder="Enter your full name"
                    style={[tw`flex-1 ml-3 text-gray-900`, { fontFamily: "Poppins-Regular" }]}
                  />
                </View>
              </Field>

              <Field label="Email Address" required>
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={form.email}
                    onChangeText={(t) => updateField("email", t)}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[tw`flex-1 ml-3 text-gray-900`, { fontFamily: "Poppins-Regular" }]}
                  />
                </View>
              </Field>

              <Field label="Bio">
                <View style={tw`bg-white border border-gray-300 rounded-xl px-4 py-3 min-h-[100px]`}>
                  <TextInput
                    value={form.bio}
                    onChangeText={(t) => updateField("bio", t)}
                    placeholder="Tell us about yourself..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[tw`text-gray-900 min-h-[80px]`, { fontFamily: "Poppins-Regular" }]}
                    maxLength={500}
                  />
                  <View style={tw`flex-row justify-between mt-2`}>
                    <Text style={[tw`text-xs text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                      {form.bio.length}/500 characters
                    </Text>
                    <Text style={[
                      tw`text-xs ${form.bio.length > 20 ? 'text-green-600' : 'text-gray-500'}`,
                      { fontFamily: "Poppins-Medium" }
                    ]}>
                      {form.bio.length > 20 ? '✓ Good length' : 'Add more details'}
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
        >
          {expandedSections[SECTIONS.PROFESSIONAL_ROLE] && (
            <>
              <Text style={[tw`text-gray-600 mb-4`, { fontFamily: "Poppins-Regular" }]}>
                Select your primary role in the community
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {ROLE_OPTIONS.map((r) => {
                  const meta = ROLE_DISPLAY[r];
                  const isActive = form.role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => updateField("role", r)}
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
                        tw`ml-2`,
                        isActive
                          ? { color: meta.color, fontFamily: "Poppins-Medium" }
                          : [tw`text-gray-700`, { fontFamily: "Poppins-Medium" }]
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
        >
          {expandedSections[SECTIONS.INTERESTS] && (
            <>
              <Text style={[tw`text-gray-600 mb-4`, { fontFamily: "Poppins-Regular" }]}>
                Select topics you're passionate about
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {INTEREST_OPTIONS.map((interest) => {
                  const meta = INTEREST_DISPLAY[interest];
                  const isActive = form.interests.includes(interest);
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
                        tw`ml-2 capitalize`,
                        isActive
                          ? { color: meta.color, fontFamily: "Poppins-Medium" }
                          : [tw`text-gray-700`, { fontFamily: "Poppins-Medium" }]
                      ]}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {form.interests.length > 0 && (
                <View style={tw`mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100`}>
                  <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-Medium" }]}>
                    {form.interests.length} interest{form.interests.length !== 1 ? 's' : ''} selected
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
                    <Text style={[
                      tw`ml-3`,
                      form.location.country ? tw`text-gray-900` : tw`text-gray-500`,
                      { fontFamily: "Poppins-Regular" }
                    ]}>
                      {form.location.country || "Select country"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
              </Field>

              <Field label="City">
                <TouchableOpacity
                  onPress={() => form.location.countryCode ? setCityModal(true) : showSnackbar("Select country first", "error")}
                  style={[
                    tw`border rounded-xl px-4 py-3 flex-row items-center justify-between`,
                    form.location.countryCode
                      ? tw`bg-white border-gray-300`
                      : tw`bg-gray-100 border-gray-300`
                  ]}
                  activeOpacity={0.85}
                  disabled={!form.location.countryCode}
                >
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="location-outline" size={18} color={form.location.countryCode ? "#6B7280" : "#9CA3AF"} />
                    <Text style={[
                      tw`ml-3`,
                      form.location.city
                        ? tw`text-gray-900`
                        : form.location.countryCode
                          ? tw`text-gray-500`
                          : tw`text-gray-400`,
                      { fontFamily: "Poppins-Regular" }
                    ]}>
                      {form.location.city || (form.location.countryCode ? "Select city" : "Select country first")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={form.location.countryCode ? "#6B7280" : "#9CA3AF"} />
                </TouchableOpacity>
              </Field>
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
        >
          {expandedSections[SECTIONS.EMERGENCY_CONTACT] && (
            <>
              <Text style={[tw`text-gray-600 mb-4`, { fontFamily: "Poppins-Regular" }]}>
                Add emergency contact for safety purposes
              </Text>

              {/* Display existing/staged contacts */}
              {form.emergencyContacts.length > 0 && (
                <View style={tw`mb-6`}>
                  <Text style={[tw`text-gray-700 mb-3`, { fontFamily: "Poppins-Medium" }]}>
                    Staged Contacts ({form.emergencyContacts.length})
                  </Text>
                  {form.emergencyContacts.map((contact, index) => (
                    <View
                      key={index}
                      style={tw`flex-row items-center justify-between bg-gray-50 rounded-xl p-4 mb-2 border border-gray-200`}
                    >
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center`}>
                          <Ionicons name="person" size={16} color="#7C3AED" />
                          <Text style={[tw`text-gray-900 ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                            {contact.name}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center mt-1`}>
                          <Ionicons name="call" size={14} color="#6B7280" />
                          <Text style={[tw`text-gray-600 ml-2`, { fontFamily: "Poppins-Regular" }]}>
                            {contact.phone}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center mt-1`}>
                          <Ionicons name="people" size={14} color="#6B7280" />
                          <Text style={[tw`text-gray-600 ml-2`, { fontFamily: "Poppins-Regular" }]}>
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
                    value={emergencyForm.name}
                    onChangeText={(t) => setEmergencyForm({ ...emergencyForm, name: t })}
                    placeholder="Enter contact name"
                    style={[tw`flex-1 ml-3 text-gray-900`, { fontFamily: "Poppins-Regular" }]}
                  />
                </View>
              </Field>

              <Field label="Phone Number">
                <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3`}>
                  <Ionicons name="call-outline" size={18} color="#6B7280" />
                  <TextInput
                    value={emergencyForm.phone}
                    onChangeText={(t) => setEmergencyForm({ ...emergencyForm, phone: t })}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    style={[tw`flex-1 ml-3 text-gray-900`, { fontFamily: "Poppins-Regular" }]}
                  />
                </View>
              </Field>

              <Field label="Relationship" required>
                <View style={tw`mb-4`}>
                  <Picker
                    selectedValue={emergencyForm.relationship}
                    onValueChange={(value) => {
                      setEmergencyForm((prev) => ({ ...prev, relationship: value }));
                    }}
                    style={tw`bg-white border border-gray-300 rounded-xl`}
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
                </View>

                <TouchableOpacity
                  onPress={handleAddEmergencyContact}
                  style={tw`bg-purple-600 py-3 rounded-xl items-center`}
                >
                  <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 16, color: "#FFFFFF" }}>
                    Stage Contact
                  </Text>
                </TouchableOpacity>
              </Field>
            </>
          )}
        </CollapsibleSection>
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
          updateLocation("country", country.name);
          updateLocation("countryCode", country.isoCode);
          updateLocation("city", "");
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
          updateLocation("city", city.name);
          setCityModal(false);
          setCitySearch("");
        }}
      />

      {/* SNACKBAR */}
      {snackbar.visible && (
        <View
          style={[
            tw`absolute bottom-6 left-6 right-6 rounded-2xl px-5 py-4`,
            snackbar.type === "success"
              ? tw`bg-green-600`
              : tw`bg-red-600`,
            {
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
          <View style={tw`flex-row items-center`}>
            <Ionicons
              name={
                snackbar.type === "success"
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={24}
              color="#fff"
            />

            <Text
              style={{
                fontFamily: "Poppins-Medium",
                fontSize: 16,
                color: "#FFFFFF",
                marginLeft: 12,
                flex: 1,
              }}
            >
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
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 16,
                letterSpacing: 0.3,
                color: "#111827",
              }}
            >
              {title}
            </Text>
            {hasChanges && (
              <View style={tw`flex-row items-center mt-1`}>
                <View style={tw`w-2 h-2 bg-purple-500 rounded-full mr-1`} />
                <Text style={[tw`text-xs text-purple-600`, { fontFamily: "Poppins-Regular" }]}>
                  Unsaved changes
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="#6B7280"
        />
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
      <Text style={[tw`text-sm text-gray-700`, { fontFamily: "Poppins-Medium" }]}>
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