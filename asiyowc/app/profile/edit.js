/* ============================================================
   EDIT PROFILE SCREEN
   Enhanced Professional Styling • Award-winning Design
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
   MAIN COMPONENT
============================================================ */

export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  // ⭐ FIX: selecting from the CORRECT SLICE ROOT
  const { user } = useSelector((s) => s.user);

  /* ================= LOCAL STATE ================= */

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

  // ⭐ FIX: track object correctly
  const [password, setPassword] = useState({ current: "", new: "" });

  const [emergency, setEmergency] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  // ⭐ FIX: relationship stored in STATE only
  const [userLocalEmergency, setUserLocalEmergency] = useState([]);

  const [relationshipModal, setRelationshipModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);

  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const initialRef = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const [passwordError, setPasswordError] = useState("");

  /* ================= ANIMATIONS ================= */

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 80],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

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
    setInterests(
      user.interests || user.profile?.interests || []
    );
    setLocation(
      user.profile?.location || {
        country: "",
        countryCode: "",
        city: "",
      }
    );

    // ⭐ FIX: initialize from correct root
    setUserLocalEmergency(
      user.profile?.emergencyContacts || user.profile?.safety?.emergencyContacts || []
    );

    initialRef.current = {
      fullName: user.profile?.fullName || "",
      email: user.email || "",
      bio: user.profile?.bio || "",
      role: user.profile?.role || "",
      interests: user.interests || user.profile?.interests || [],
      location: user.profile?.location || {},
      emergencyContacts: user.profile?.emergencyContacts || user.profile?.safety?.emergencyContacts || [],
    };
  }, [user]);

  /* ================= CHANGE TRACKING ================= */

  useEffect(() => {
    if (!initialRef.current) return;

    const changed =
      initialRef.current.fullName !== fullName ||
      initialRef.current.email !== email ||
      initialRef.current.bio !== bio ||
      initialRef.current.role !== role ||
      JSON.stringify(initialRef.current.interests) !== JSON.stringify(interests) ||
      JSON.stringify(initialRef.current.location) !== JSON.stringify(location) ||
      JSON.stringify(initialRef.current.emergencyContacts) !== JSON.stringify(userLocalEmergency);

    setHasChanges(changed);
  }, [fullName, email, bio, role, interests, location, userLocalEmergency]);

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

  const pickImage = async (type) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "avatar" ? [1, 1] : [16, 9],
      quality: 0.9,
    });

    if (res.canceled) return;

    const file = res.assets[0];
    const fd = new FormData();

    // ----- WORKS FOR BOTH WEB & ANDROID -----
    const response = await fetch(file.uri);
    const blob = await response.blob();

    fd.append(
      type === "avatar" ? "avatar" : "cover",
      blob,
      `${type}.jpg`
    );

    try {
      type === "avatar"
        ? await dispatch(updateAvatar(fd)).unwrap()
        : await dispatch(updateCoverPhoto(fd)).unwrap();

      showSnackbar(`${type === "avatar" ? "Profile" : "Cover"} photo updated`);
    } catch {
      showSnackbar("Upload failed", "error");
    }
  };

  /* ================= EMERGENCY STAGING FIX ================= */

  const handleAddEmergencyContact = () => {
    // ⭐ FIX: never call server here — stage only
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

    setHasChanges(true);
    showSnackbar("Staged locally — click SAVE to persist", "success");
  };

  const removeStagedContact = (index) => {
    // ⭐ FIX DEPENDENCY: update changes on same state
    setUserLocalEmergency((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setHasChanges(true);
  };

  /* ================= SAVE FUNCTION — FIX AUTO SAVE ISSUE ================= */

  const saveProfile = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const payload = {
        fullName,
        email,
        bio,
        role,
        interests,
        location: {
          country: location.country || "",
          countryCode: location.countryCode || "",
          city: location.city || "",
        },

        // ⭐ ONLY STAGED ARRAY
        safety: {
          emergencyContacts: userLocalEmergency,
        },
      };

      console.log("Profile updated with payload:", payload);

      await dispatch(updateProfile(payload)).unwrap();

      // refresh redux
      dispatch(fetchUserProfile());

      showSnackbar("Profile saved successfully", "success");

      setTimeout(() => router.back(), 1200);
    } catch (err) {
      showSnackbar(err?.message || "Update failed", "error");

      // restore from server
      dispatch(fetchUserProfile());
    } finally {
      setSaving(false);
    }
  };


  const handlePasswordUpdate = async () => {
    if (!password.current || !password.new) {
      setPasswordError("Both fields are required");
      return;
    }

    if (password.new.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    try {
      await dispatch(updatePassword({
        currentPassword: password.current,
        newPassword: password.new
      })).unwrap();

      setPassword({ current: "", new: "" });
      setPasswordError("");
      showSnackbar("Password updated successfully");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password");
    }
  };

  if (!user) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  /* ================= RENDER — NO OTHER PART TOUCHED ================= */

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-50`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* FLOATING HEADER */}
      <Animated.View
        style={[
          tw`absolute top-0 left-0 right-0 bg-white border-b border-gray-200 z-10`,
          {
            height: headerHeight,
            opacity: headerOpacity
          }
        ]}
      />

      {/* FIXED ACTION BAR */}
      <View style={tw`absolute top-0 left-0 right-0 z-20 pt-8 px-6`}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={() =>
              hasChanges
                ? showSnackbar("You have unsaved changes", "error")
                : router.back()
            }
            style={tw`w-10 h-10 bg-white/90 backdrop-blur-lg rounded-full items-center justify-center shadow-sm`}
          >
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>

          <Animated.Text
            style={[
              tw`text-xl font-['Poppins-Bold'] text-gray-900`,
              {
                opacity: scrollY.interpolate({
                  inputRange: [50, 100],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              }
            ]}
          >
            Edit Profile
          </Animated.Text>

          <TouchableOpacity
            onPress={saveProfile}
            disabled={!hasChanges || saving}
            style={[
              tw`px-4 py-2 rounded-full items-center justify-center shadow-sm`,
              hasChanges ? tw`bg-purple-600` : tw`bg-gray-300`
            ]}
          >
            <Text style={tw`font-['Poppins-SemiBold'] ${hasChanges ? 'text-white' : 'text-gray-500'}`}>
              {saving ? "Saving..." : "Save"}
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
        <View style={tw`pt-24 pb-8 px-6`}>
          <Text style={tw`font-['Poppins-Bold'] text-3xl text-gray-900 mb-2`}>
            Edit Profile
          </Text>
          <Text style={tw`font-['Poppins-Regular'] text-gray-600`}>
            Update your personal and professional information
          </Text>
        </View>

        {/* PROFILE MEDIA */}
        <Section title="Profile Media" icon="image">
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
        </Section>

        {/* PERSONAL INFORMATION */}
        <Section title="Personal Information" icon="person">
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
        </Section>

        {/* PROFESSIONAL ROLE */}
        <Section title="Professional Role" icon="briefcase">
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
        </Section>

        {/* INTERESTS */}
        <Section title="Interests" icon="heart">
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
        </Section>

        {/* LOCATION */}
        <Section title="Location" icon="location">
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
        </Section>

        {/* PASSWORD UPDATE */}
        <Section title="Change Password" icon="lock-closed">
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

          {password.current || password.new ? (
            <TouchableOpacity
              onPress={handlePasswordUpdate}
              style={tw`mt-4 bg-blue-600 py-3 rounded-xl items-center`}
              activeOpacity={0.85}
            >
              <Text style={tw`font-['Poppins-SemiBold'] text-white`}>
                Update Password
              </Text>
            </TouchableOpacity>
          ) : null}
        </Section>

        {/* EMERGENCY CONTACT */}
        <Section title="Emergency Contact" icon="shield-checkmark">
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

          {/* ---- RELATIONSHIP DROPDOWN ---- */}
          <Field label="Relationship" required>
            <Picker
              selectedValue={emergency.relationship}
              onValueChange={(value) => {
                setEmergency((prev) => ({ ...prev, relationship: value }));
                setHasChanges(true);
              }}
            >
              <Picker.Item label="Select relationship" value="" />
              {RELATIONSHIP_OPTIONS.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>

            <TouchableOpacity
              onPress={handleAddEmergencyContact}
              style={tw`mt-3 bg-purple-600 py-3 rounded-xl items-center`}
            >
              <Text style={tw`text-white font-['Poppins-SemiBold']`}>
                Stage Contact
              </Text>
            </TouchableOpacity>

          </Field>

        </Section>

        {/* SAVE BUTTON */}
        <View style={tw`px-6 mt-10 mb-10`}>
          <TouchableOpacity
            onPress={saveProfile}
            disabled={!hasChanges || saving}
            style={[
              tw`py-4 rounded-2xl items-center shadow-lg`,
              hasChanges
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
                <Text style={tw`font-['Poppins-SemiBold'] text-lg ${hasChanges ? 'text-white' : 'text-gray-500'}`}>
                  Save All Changes
                </Text>
                {hasChanges && (
                  <Text style={tw`font-['Poppins-Regular'] text-white/80 text-sm mt-1`}>
                    Your profile will be updated immediately
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
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

      {/* Relationship Modal Sheet KEPT AS REQUESTED */}
      <Modal visible={relationshipModal} animationType="slide" presentationStyle="pageSheet">
        <View style={tw`flex-1 bg-white pt-12`}>
          <View style={tw`px-6 pb-4 border-b border-gray-200`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={tw`text-2xl font-['Poppins-Bold'] mb-4`}>
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

          {/* ⭐ FIX: Dropdown picker INSIDE MODAL */}
          <View style={tw`px-6 pt-6`}>
            <Picker
              selectedValue={emergency.relationship}
              onValueChange={(value) =>
                setEmergency((prev) => ({ ...prev, relationship: value }))
              }
              style={tw`mb-6`}
            >
              <Picker.Item label="Select relationship" value="" />
              {RELATIONSHIP_OPTIONS.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>

            <TouchableOpacity
              onPress={() => setRelationshipModal(false)}
              style={tw`mt-6 bg-purple-600 py-3 rounded-xl items-center`}
            >
              <Text style={tw`text-white font-['Poppins-Medium']`}>
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
            <Text style={tw`font-['Poppins-Medium'] text-white ml-3 flex-1`}>
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

const Section = ({ title, children, icon }) => (
  <View style={tw`mb-8 mx-6`}>
    <View style={tw`flex-row items-center mb-6`}>
      <View style={tw`w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-4`}>
        <Ionicons name={icon} size={20} color="#7C3AED" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`font-['Poppins-Bold'] text-xl text-gray-900`}>
          {title}
        </Text>
      </View>
    </View>
    <View style={tw`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm`}>
      {children}
    </View>
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
          <Text style={tw`font-['Poppins-Bold'] text-2xl text-gray-900`}>
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
            style={tw`flex-1 ml-3 font-['Poppins-Regular'] text-gray-900`}
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
              <Text style={tw`font-['Poppins-Medium'] text-gray-900`}>
                {x.name}
              </Text>
            </TouchableOpacity>
          ))}

        {data.length === 0 && (
          <View style={tw`px-6 py-12 items-center`}>
            <Ionicons name="globe-outline" size={48} color="#D1D5DB" />
            <Text style={tw`font-['Poppins-Medium'] text-gray-500 mt-4`}>
              No results found
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
          <Text style={tw`font-['Poppins-Medium'] text-gray-700`}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);