import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

import {
  updateProfile,
  updatePassword,
  updateAvatar,
  updateCoverPhoto,
  addEmergencyContact,
  fetchUserProfile,
} from "../../store/slices/userSlice";

/* ============================================================
   EDIT PROFILE — SINGLE AGGREGATED SCREEN
============================================================ */
export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.user);

  /* ================= LOCAL STATE ================= */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState({ current: "", next: "" });
  const [emergency, setEmergency] = useState({ name: "", phone: "" });

  const initialRef = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);

  /* ================= INLINE SNACKBAR ================= */
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "success", // success | error
  });

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ visible: true, message, type });

    setTimeout(() => {
      setSnackbar({ visible: false, message: "", type });
    }, 3000);
  };

  /* ================= INIT ================= */
  useEffect(() => {
    if (user) {
      setFullName(user.profile?.fullName || "");
      setEmail(user.email || "");

      initialRef.current = {
        fullName: user.profile?.fullName || "",
        email: user.email || "",
      };
    }
  }, [user]);

  /* ================= UNSAVED CHANGES GUARD ================= */
  useEffect(() => {
    if (!initialRef.current) return;

    const changed =
      initialRef.current.fullName !== fullName ||
      initialRef.current.email !== email;

    setHasChanges(changed);
  }, [fullName, email]);

  const handleBack = () => {
    if (!hasChanges) return router.back();
    showSnackbar("You have unsaved changes", "error");
  };

  /* ================= PROFILE COMPLETION ================= */
  const calculateCompletion = () => {
    let completed = 0;
    const total = 6;

    if (user.profile?.fullName) completed++;
    if (user.email) completed++;
    if (user.profile?.avatar?.url) completed++;
    if (user.profile?.coverPhoto?.url) completed++;
    if (user.safety?.emergencyContacts?.length > 0) completed++;
    if (user.profile?.bio?.length > 20) completed++;

    return Math.round((completed / total) * 100);
  };

  const completion = calculateCompletion();

  /* ================= IMAGE PICKER ================= */
  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "avatar" ? [1, 1] : [16, 9],
      quality: 0.9,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      const formData = new FormData();

      formData.append(type === "avatar" ? "avatar" : "cover", {
        uri: file.uri,
        name: `${type}.jpg`,
        type: "image/jpeg",
      });

      try {
        type === "avatar"
          ? await dispatch(updateAvatar(formData)).unwrap()
          : await dispatch(updateCoverPhoto(formData)).unwrap();

        showSnackbar(`${type === "avatar" ? "Avatar" : "Cover photo"} updated`);
      } catch {
        showSnackbar("Image upload failed", "error");
      }
    }
  };

  /* ================= SAVE HANDLERS ================= */

  const saveProfile = async () => {
    if (!fullName.trim()) {
      showSnackbar("Full name is required", "error");
      return;
    }

    try {
      await dispatch(updateProfile({ fullName, email })).unwrap();
      showSnackbar("Profile updated successfully");
      router.back();
    } catch {
      showSnackbar("Failed to update profile", "error");
      dispatch(fetchUserProfile());
    }
  };

  const changePassword = async () => {
    if (!password.current || !password.next) {
      showSnackbar("All password fields are required", "error");
      return;
    }

    try {
      await dispatch(
        updatePassword({
          currentPassword: password.current,
          newPassword: password.next,
        })
      ).unwrap();

      showSnackbar("Password updated");
      setPassword({ current: "", next: "" });
    } catch {
      showSnackbar("Password update failed", "error");
    }
  };

  const saveEmergencyContact = async () => {
    if (!emergency.name || !emergency.phone) {
      showSnackbar("Name and phone are required", "error");
      return;
    }

    try {
      await dispatch(addEmergencyContact(emergency)).unwrap();
      showSnackbar("Emergency contact added");
      setEmergency({ name: "", phone: "" });
    } catch {
      showSnackbar("Failed to save emergency contact", "error");
    }
  };

  if (!user) return null;

  /* ================= RENDER ================= */
  return (
    <>
      <ScrollView style={tw`flex-1 bg-gray-50`} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={tw`px-6 pt-6 pb-4 bg-white border-b border-gray-200`}>
          <TouchableOpacity onPress={handleBack} style={tw`mb-2`}>
            <Ionicons name="arrow-back" size={22} />
          </TouchableOpacity>

          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22 }}>
            Edit Profile
          </Text>
          <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280" }}>
            Update your account information
          </Text>
        </View>

        {/* COMPLETION */}
        <View style={tw`px-6 mt-6`}>
          <View style={tw`bg-white border border-gray-200 rounded-xl p-4`}>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={{ fontFamily: "Poppins-Medium" }}>
                Profile Completion
              </Text>
              <Text style={{ fontFamily: "Poppins-Bold", color: "#6A1B9A" }}>
                {completion}%
              </Text>
            </View>

            <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
              <View
                style={[
                  tw`h-full bg-purple-700`,
                  { width: `${completion}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* MEDIA */}
        <Section title="Profile Media">
          <MediaRow
            label="Avatar"
            image={user.profile?.avatar?.url}
            onPress={() => pickImage("avatar")}
          />
          <MediaRow
            label="Cover Photo"
            image={user.profile?.coverPhoto?.url}
            onPress={() => pickImage("cover")}
          />
        </Section>

        {/* PERSONAL */}
        <Section title="Personal Information">
          <Field label="Full Name">
            <TextInput value={fullName} onChangeText={setFullName} style={input} />
          </Field>
          <Field label="Email">
            <TextInput value={email} onChangeText={setEmail} style={input} />
          </Field>
        </Section>

        {/* SECURITY */}
        <Section title="Security">
          <Field label="Current Password">
            <TextInput secureTextEntry value={password.current}
              onChangeText={(t) => setPassword({ ...password, current: t })}
              style={input} />
          </Field>

          <Field label="New Password">
            <TextInput secureTextEntry value={password.next}
              onChangeText={(t) => setPassword({ ...password, next: t })}
              style={input} />
          </Field>

          <PrimaryButton label="Change Password" onPress={changePassword} />
        </Section>

        {/* SAFETY */}
        <Section title="Emergency Contact">
          <Field label="Contact Name">
            <TextInput value={emergency.name}
              onChangeText={(t) => setEmergency({ ...emergency, name: t })}
              style={input} />
          </Field>

          <Field label="Phone Number">
            <TextInput value={emergency.phone}
              onChangeText={(t) => setEmergency({ ...emergency, phone: t })}
              style={input} />
          </Field>

          <PrimaryButton label="Add Emergency Contact" onPress={saveEmergencyContact} />
        </Section>

        <View style={tw`px-6 mt-8 mb-12`}>
          <PrimaryButton label="Save All Changes" onPress={saveProfile} />
        </View>
      </ScrollView>

      {/* ================= SNACKBAR ================= */}
      {snackbar.visible && (
        <View style={tw`absolute bottom-6 left-5 right-5`}>
          <View
            style={[
              tw`px-4 py-3 rounded-xl flex-row items-center`,
              snackbar.type === "success" ? tw`bg-green-600` : tw`bg-red-600`,
            ]}
          >
            <Ionicons
              name={snackbar.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={20}
              color="#fff"
            />
            <Text style={{
              fontFamily: "Poppins-Medium",
              color: "#fff",
              marginLeft: 10,
              flex: 1,
            }}>
              {snackbar.message}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

/* ================= SUB COMPONENTS ================= */

const Section = ({ title, children }) => (
  <View style={tw`px-6 mt-8`}>
    <Text style={{ fontFamily: "Poppins-SemiBold", marginBottom: 10 }}>
      {title}
    </Text>
    {children}
  </View>
);

const Field = ({ label, children }) => (
  <View style={tw`mb-4`}>
    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, marginBottom: 6 }}>
      {label}
    </Text>
    {children}
  </View>
);

const MediaRow = ({ label, image, onPress }) => (
  <TouchableOpacity onPress={onPress}
    style={tw`flex-row items-center bg-white border border-gray-200 rounded-xl p-4 mb-4`}>
    <View style={tw`w-14 h-14 rounded-lg bg-gray-100 overflow-hidden`}>
      {image && <Image source={{ uri: image }} style={tw`w-full h-full`} />}
    </View>
    <View style={tw`ml-4 flex-1`}>
      <Text style={{ fontFamily: "Poppins-Medium" }}>{label}</Text>
      <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280", fontSize: 12 }}>
        Tap to change
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

const PrimaryButton = ({ label, onPress }) => (
  <TouchableOpacity onPress={onPress}
    style={tw`bg-purple-700 py-3 rounded-xl items-center mt-2`}>
    <Text style={{ fontFamily: "Poppins-Medium", color: "white" }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const input = [
  tw`border border-gray-300 rounded-xl px-4 py-3 bg-white`,
  { fontFamily: "Poppins-Regular" },
];
