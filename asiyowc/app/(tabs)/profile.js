import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

import {
  fetchUserProfile,
  fetchEnrolledPrograms,
  fetchCompletedPrograms,
  updatePassword,
} from "../../store/slices/userSlice";

import { logoutUser } from "../../store/slices/authSlice";

/* ============================================================
   PROFILE SCREEN — CORPORATE / PROFESSIONAL
============================================================ */
export default function ProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    user,
    stats,
    enrolledPrograms,
    completedPrograms,
    loading,
  } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("overview");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /* ================= SNACKBAR ================= */
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

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(fetchUserProfile());
    dispatch(fetchEnrolledPrograms());
    dispatch(fetchCompletedPrograms());
  }, []);

  if (!user && loading) {
    return (
      <View style={tw`flex-1 bg-gray-50 items-center justify-center`}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  const avatar = user?.profile?.avatar?.url;
  const coverPhoto = user?.profile?.coverPhoto?.url;

  /* ================= HANDLERS ================= */

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar("All fields are required", "error");
      return;
    }

    if (newPassword.length < 8) {
      showSnackbar("Password must be at least 8 characters", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    try {
      await dispatch(updatePassword({ currentPassword, newPassword })).unwrap();
      showSnackbar("Password updated successfully", "success");
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
    try {
      await dispatch(logoutUser()).unwrap();
      router.replace("/(auth)/login");
    } catch {
      showSnackbar("Failed to log out", "error");
    }
  };

  /* ================= RENDER ================= */
  return (
    <>
      <ScrollView style={tw`flex-1 bg-gray-50`} showsVerticalScrollIndicator={false}>
        {/* ================= HEADER WITH COVER ================= */}
        <View style={tw`relative`}>
          <View style={tw`h-48 bg-purple-700`}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={tw`w-full h-full`} />
            ) : (
              <View style={tw`flex-1 items-center justify-center`}>
                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.7)" />
                <Text style={{ fontFamily: "Poppins-Regular", color: "#fff", marginTop: 6 }}>
                  No cover photo
                </Text>
              </View>
            )}
            <View style={tw`absolute inset-0 bg-black/10`} />
          </View>

          <View style={tw`px-5 -mt-16`}>
            <View style={tw`bg-white rounded-2xl border border-gray-200 p-6 items-center shadow-sm`}>
              <View style={tw`-mt-16 mb-2`}>
                <View style={tw`w-28 h-28 rounded-full bg-gray-100 border-4 border-white overflow-hidden items-center justify-center shadow`}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={tw`w-full h-full`} />
                  ) : (
                    <Ionicons name="person" size={46} color="#9CA3AF" />
                  )}
                </View>
              </View>

              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 18 }}>
                {user.profile.fullName}
              </Text>

              <Text style={{ fontFamily: "Poppins-Medium", fontSize: 13, color: "#6B7280" }}>
                {user.profile.role}
              </Text>

              {user.profile.bio && (
                <Text style={{ fontFamily: "Poppins-Regular", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                  {user.profile.bio}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => router.push("/profile/edit")}
                style={tw`mt-4 px-6 py-2.5 rounded-xl border border-purple-700`}
              >
                <Text style={{ fontFamily: "Poppins-Medium", color: "#6A1B9A" }}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ================= STATS ================= */}
        <View style={tw`flex-row justify-between mt-6 px-5`}>
          <Stat label="Posts" value={stats?.postsCount || 0} />
          <Stat label="Programs" value={stats?.enrolledProgramsCount || 0} />
          <Stat label="Completed" value={stats?.completedProgramsCount || 0} />
        </View>

        {/* ================= TABS ================= */}
        <View style={tw`mx-5 mt-7 bg-gray-100 rounded-xl p-1 flex-row`}>
          <Tab label="Overview" active={activeTab === "overview"} onPress={() => setActiveTab("overview")} />
          <Tab label="Programs" active={activeTab === "programs"} onPress={() => setActiveTab("programs")} />
          <Tab label="Settings" active={activeTab === "settings"} onPress={() => setActiveTab("settings")} />
        </View>

        {/* ================= TAB CONTENT ================= */}
        {activeTab === "overview" && (
          <View style={tw`mx-5 mt-6 space-y-4`}>
            <InfoRow icon="mail-outline" text={user.email} />
            <InfoRow icon="call-outline" text={user.phone} />
            <InfoRow icon="calendar-outline" text={`Joined ${new Date(user.createdAt).toDateString()}`} />
          </View>
        )}

        {activeTab === "settings" && (
          <View style={tw`mx-5 mt-6`}>
            <SettingsItem label="Change Password" onPress={() => setShowPasswordModal(true)} />
            <SettingsItem label="Safety & SOS" onPress={() => router.push("/profile/safety")} />

            <TouchableOpacity
              onPress={() => setShowLogoutModal(true)}
              style={tw`mt-6 border border-red-300 py-3 rounded-xl items-center`}
            >
              <Text style={{ fontFamily: "Poppins-Medium", color: "#DC2626" }}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`h-12`} />
      </ScrollView>

      {/* ================= PASSWORD MODAL ================= */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/40 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-6`}>
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, marginBottom: 16 }}>
              Change Password
            </Text>

            {["currentPassword", "newPassword", "confirmPassword"].map((field) => (
              <TextInput
                key={field}
                secureTextEntry
                placeholder={field.replace(/([A-Z])/g, " $1")}
                style={tw`border border-gray-300 rounded-xl px-4 py-3 mb-3`}
                value={passwordForm[field]}
                onChangeText={(t) => setPasswordForm({ ...passwordForm, [field]: t })}
              />
            ))}

            <View style={tw`flex-row gap-3`}>
              <Button label="Cancel" onPress={() => setShowPasswordModal(false)} />
              <Button label="Update" primary onPress={handleChangePassword} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= LOGOUT MODAL ================= */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/40 justify-center items-center`}>
          <View style={tw`bg-white rounded-2xl p-6 w-4/5`}>
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16 }}>
              Log out?
            </Text>

            <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280", marginVertical: 16 }}>
              Are you sure you want to log out?
            </Text>

            <View style={tw`flex-row gap-3`}>
              <Button label="Cancel" onPress={() => setShowLogoutModal(false)} />
              <Button label="Log Out" danger onPress={handleLogout} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= INLINE SNACKBAR ================= */}
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
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                color: "#fff",
                marginLeft: 10,
                fontSize: 14,
                flex: 1,
              }}
            >
              {snackbar.message}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

/* ================= SUB COMPONENTS ================= */

const Stat = ({ label, value }) => (
  <View style={tw`flex-1 bg-white border border-gray-200 rounded-xl py-4 mx-1 items-center`}>
    <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18 }}>{value}</Text>
    <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280" }}>{label}</Text>
  </View>
);

const Tab = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={tw`flex-1 py-3 rounded-xl items-center ${active ? "bg-white shadow-sm" : ""}`}
  >
    <Text style={{ fontFamily: "Poppins-Medium", color: active ? "#6A1B9A" : "#6B7280" }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const InfoRow = ({ icon, text }) => (
  <View style={tw`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-4`}>
    <Ionicons name={icon} size={18} color="#6B7280" />
    <Text style={{ fontFamily: "Poppins-Regular", marginLeft: 12 }}>{text}</Text>
  </View>
);

const SettingsItem = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-4 mb-4 flex-row justify-between items-center`}
  >
    <Text style={{ fontFamily: "Poppins-Medium" }}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

const Button = ({ label, onPress, primary, danger }) => (
  <TouchableOpacity
    onPress={onPress}
    style={tw`flex-1 py-3 rounded-xl items-center ${
      primary ? "bg-purple-700" : danger ? "bg-red-600" : "border border-gray-300"
    }`}
  >
    <Text style={{ fontFamily: "Poppins-Medium", color: primary || danger ? "#fff" : "#374151" }}>
      {label}
    </Text>
  </TouchableOpacity>
);
