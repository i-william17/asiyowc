// more/safetyhub
import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Shield,
  AlertCircle,
  MessageCircle,
  Phone,
  Lock,
  Flag,
  Heart,
  Headphones,
  FileText,
  ChevronRight,
  ChevronLeft
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";
import * as Linking from "expo-linking";
import { useSelector } from "react-redux";

import AnonymousSupportChatModal from "../../components/safety/AnonymousSupportChatModal";
import TriangulationModal from "../../components/safety/TriangulationModal";
import GBVForum from "../../components/safety/GBVForum";
import LegalResourcesModal from "../../components/safety/LegalResourcesModal";

import ConfirmModal from "../../components/community/ConfirmModal";

export default function SafetyHubScreen() {
  const user = useSelector((state) => state.auth.user);
  const [showTriangulation, setShowTriangulation] = useState(false);
  const [showAnonymousChat, setShowAnonymousChat] = useState(false);
  const [showGBVConfirm, setShowGBVConfirm] = useState(false);
  const [openGBVForum, setOpenGBVForum] = useState(false);
  const [showLegalResources, setShowLegalResources] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [pendingCall, setPendingCall] = useState(null);

  const router = useRouter();
  const onBackPress = () => {
    router.push("/modals/moreMenu");
  }

  /* ================= INLINE SNACKBAR ================= */
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info", // success | error | info
  });

  const showSnackbar = (message, type = "info") => {
    setSnackbar({ visible: true, message, type });

    setTimeout(() => {
      setSnackbar({ visible: false, message: "", type: "info" });
    }, 3000);
  };

  const resources = [
    {
      id: 1,
      title: "24/7 Crisis Helpline",
      description: "Speak with trained counselors anytime",
      icon: Phone,
      color: "bg-red-100",
      textColor: "text-red-600",
      urgent: true,
    },
    {
      id: 2,
      title: "Anonymous Support Chat",
      description: "Chat in a safe, private, anonymous space",
      icon: MessageCircle,
      color: "bg-purple-100",
      textColor: "text-purple-600",
      urgent: false,
      action: "anonymous-chat",
    },
    {
      id: 3,
      title: "GBV Survivor Forum",
      description: "Safe space for survivors to connect",
      icon: Heart,
      color: "bg-pink-100",
      textColor: "text-pink-600",
      urgent: false,
      action: "gbv-forum",
    },
    {
      id: 4,
      title: "Legal Resources",
      description: "Access to legal aid and information",
      icon: FileText,
      color: "bg-blue-100",
      textColor: "text-blue-600",
      urgent: false,
      action: "legal-resources",
    },

    // ✅ NEW
    {
      id: 5,
      title: "Find Nearest Help",
      description: "Locate nearby police stations, hospitals, and safe spaces",
      icon: Shield,
      color: "bg-amber-100",
      textColor: "text-amber-700",
      urgent: false,
      action: "find-help",
    },
  ];

  const emergencyContacts =
    user?.safety?.emergencyContacts?.map((c, index) => ({
      id: index + 1,
      name: c.name,
      number: c.phone,
      relationship: c.relationship,
    })) || [];

  /* ================= HANDLERS ================= */
  const handleSOS = () => {
    const contacts = user?.safety?.emergencyContacts;

    if (!contacts || contacts.length === 0) {
      showSnackbar(
        "No emergency contact found. Please add one in your profile.",
        "error"
      );
      return;
    }

    const primary = contacts[0];

    if (!primary?.phone) {
      showSnackbar("Invalid emergency contact number.", "error");
      return;
    }

    setPendingCall({
      name: primary.name,
      phone: primary.phone,
    });

    setShowCallConfirm(true);
  };


  const handleResourcePress = (resource) => {
    switch (resource.action) {
      case "anonymous-chat":
        setShowAnonymousChat(true);
        break;

      case "find-help":
        setShowTriangulation(true);
        break;

      case "gbv-forum":
        setShowGBVConfirm(true);
        break;

      case "legal-resources":
        setShowLegalResources(true);
        break;

      default:
        showSnackbar(resource.title, "info");
    }
  };

  /* ================= RENDER ================= */

  return openGBVForum ? (
    <GBVForum onExit={() => setOpenGBVForum(false)} />
  ) : (
    <>
      <ScrollView style={tw`min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50`}>

        {/* HEADER */}
        <View
          style={{
            backgroundColor: "#6A1B9A",
            paddingTop: 56,
            paddingBottom: 32,
            paddingHorizontal: 16,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={onBackPress}
            activeOpacity={0.7}
            style={{
              position: "absolute",
              top: 56,
              left: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={12}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <Shield size={26} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 24,
                fontFamily: "Poppins-SemiBold",
              }}
            >
              Safety & Support Hub
            </Text>
          </View>

          <Text
            style={{
              color: "#F3E5F5",
              fontSize: 14,
              textAlign: "center",
              fontFamily: "Poppins-Regular",
            }}
          >
            You are not alone. We're here to help.
          </Text>
        </View>

        <View style={tw`px-4 pb-6`}>
          {/* SOS */}
          <View style={tw`mt-4 p-6 rounded-2xl bg-red-600 items-center`}>
            <AlertCircle size={48} color="#fff" />
            <Text style={[tw`text-white text-2xl mt-3`, { fontFamily: "Poppins-SemiBold" }]}>
              Emergency SOS
            </Text>
            <Text style={[tw`text-white/90 mt-2 mb-4`, { fontFamily: "Poppins-Regular" }]}>
              Press for immediate assistance
            </Text>

            <TouchableOpacity
              onPress={handleSOS}
              style={tw`w-full h-16 bg-white rounded-full items-center justify-center flex-row`}
            >
              <Phone size={24} color="#dc2626" />
              <Text style={[tw`text-red-600 text-lg ml-2`, { fontFamily: "Poppins-Medium" }]}>
                CALL FOR HELP
              </Text>
            </TouchableOpacity>
          </View>

          {/* PRIVACY NOTICE */}
          <View style={tw`mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 flex-row gap-2`}>
            <Lock size={16} color="#7c3aed" />
            <Text style={[tw`text-sm text-gray-700 flex-1`, { fontFamily: "Poppins-Regular" }]}>
              All conversations are confidential and encrypted. Your safety and
              privacy are our priority.
            </Text>
          </View>

          {/* RESOURCES */}
          <Text style={[tw`text-purple-900 text-xl mt-6 mb-4`, { fontFamily: "Poppins-SemiBold" }]}>
            Support Resources
          </Text>

          {resources.map((r) => (
            <View
              key={r.id}
              style={tw`p-4 mb-3 rounded-xl bg-white ${r.urgent ? 'border-2 border-red-200' : 'border border-gray-100'}`}
            >
              <TouchableOpacity
                onPress={() => handleResourcePress(r)}
                style={tw`flex-row items-center gap-3`}
              >
                <View
                  style={tw`w-12 h-12 rounded-full items-center justify-center ${r.color}`}
                >
                  <r.icon size={24} />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Text style={[tw`text-purple-900`, { fontFamily: "Poppins-Medium" }]}>
                      {r.title}
                    </Text>

                    {r.urgent && (
                      <View style={tw`px-2 py-0.5 rounded-full bg-red-100`}>
                        <Text style={[tw`text-xs text-red-700`, { fontFamily: "Poppins-Medium" }]}>
                          24/7
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[tw`text-sm text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
                    {r.description}
                  </Text>
                </View>

                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ))}

          {/* EMERGENCY CONTACTS */}
          <Text style={[tw`text-purple-900 text-xl mt-6 mb-4`, { fontFamily: "Poppins-SemiBold" }]}>
            Emergency Contacts
          </Text>

          {emergencyContacts.map((c) => (
            <View
              key={c.id}
              style={tw`p-4 mb-2 bg-white rounded-xl border border-gray-100 flex-row justify-between items-center`}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <View>
                  <Text style={[tw`text-purple-900`, { fontFamily: "Poppins-Medium" }]}>
                    {c.name}
                  </Text>
                  <Text style={[tw`text-sm text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
                    {c.number}
                  </Text>
                  <Text style={[tw`text-sm text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
                    {c.relationship}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setPendingCall({
                    name: c.name,
                    phone: c.number,
                  });
                  setShowCallConfirm(true);
                }}
                style={tw`bg-green-600 px-4 py-2 rounded-full flex-row items-center`}
              >
                <Phone size={16} color="#fff" />
                <Text style={[tw`text-white ml-1`, { fontFamily: "Poppins-Medium" }]}>
                  Call
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* REPORT */}
          {/* <View style={tw`mt-6 p-4 rounded-xl bg-gray-50 flex-row gap-3`}>
            <Flag size={20} color="#6b7280" />
            <View style={tw`flex-1`}>
              <Text style={[tw`text-purple-900 mb-2`, { fontFamily: "Poppins-Medium" }]}>
                Report Inappropriate Content
              </Text>
              <Text style={[tw`text-sm text-gray-600 mb-3`, { fontFamily: "Poppins-Regular" }]}>
                Help us keep this community safe.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Report", "Report submitted");
                  showSnackbar("Report submitted", "success");
                }}
                style={tw`border border-purple-300 px-4 py-2 rounded-full self-start`}
              >
                <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-Medium" }]}>
                  Report an Issue
                </Text>
              </TouchableOpacity>
            </View>
          </View> */}

          {/* MENTAL HEALTH */}
          <View style={tw`mt-4 p-6 rounded-2xl bg-purple-600`}>
            <View style={tw`flex-row items-center gap-3 mb-4`}>
              <Headphones size={32} color="#fff" />
              <View>
                <Text style={[tw`text-lg text-white`, { fontFamily: "Poppins-SemiBold" }]}>
                  Mental Health Support
                </Text>
                <Text style={[tw`text-sm text-white/90`, { fontFamily: "Poppins-Regular" }]}>
                  Professional counseling available
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert("Counselor", "Connecting you to a counselor");
                showSnackbar("Connecting to counselor", "info");
              }}
              style={tw`bg-white py-3 rounded-full items-center`}
            >
              <Text style={[tw`text-purple-600`, { fontFamily: "Poppins-Medium" }]}>
                Connect with a Counselor
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={tw`mt-6 p-4 bg-purple-50 rounded-xl`}>
            <Text style={[tw`text-sm text-gray-700 text-center`, { fontFamily: "Poppins-Regular" }]}>
              <Text style={[tw`text-purple-900`, { fontFamily: "Poppins-SemiBold" }]}>
                Remember:
              </Text>{" "}
              Your wellbeing matters. Reaching out for help is a sign of strength, not weakness. The Asiyo sisterhood is here for you.
            </Text>
          </View>
        </View>
      </ScrollView>

      <TriangulationModal
        visible={showTriangulation}
        onClose={() => setShowTriangulation(false)}
      />

      {showAnonymousChat && (
        <AnonymousSupportChatModal
          onClose={() => setShowAnonymousChat(false)}
        />
      )}

      <LegalResourcesModal
        visible={showLegalResources}
        onClose={() => setShowLegalResources(false)}
      />

      <ConfirmModal
        visible={showGBVConfirm}
        title="Join GBV Support Forum"
        message="This is a private and confidential space for survivors. Are you sure you want to continue?"
        confirmText="Continue"
        cancelText="Cancel"
        onCancel={() => setShowGBVConfirm(false)}
        onConfirm={() => {
          setShowGBVConfirm(false);
          setOpenGBVForum(true);
        }}
      />

      <ConfirmModal
        visible={showCallConfirm}
        title="Confirm Emergency Call"
        message={
          pendingCall
            ? `You are about to call ${pendingCall.name}. Do you want to continue?`
            : ""
        }
        confirmText="Call Now"
        cancelText="Cancel"
        onCancel={() => {
          setShowCallConfirm(false);
          setPendingCall(null);
        }}
        onConfirm={async () => {
          if (!pendingCall?.phone) return;

          const telUrl = `tel:${pendingCall.phone}`;
          const supported = await Linking.canOpenURL(telUrl);

          if (!supported) {
            showSnackbar("Calling is not supported on this device.", "error");
            return;
          }

          setShowCallConfirm(false);
          Linking.openURL(telUrl);
          setPendingCall(null);
        }}
      />

      {/* SNACKBAR */}
      {snackbar.visible && (
        <View
          style={tw`absolute bottom-6 left-4 right-4 px-4 py-3 rounded-xl ${snackbar.type === "success"
            ? "bg-green-600"
            : snackbar.type === "error"
              ? "bg-red-600"
              : "bg-purple-600"
            }`}
        >
          <Text style={[tw`text-white text-center`, { fontFamily: "Poppins-Medium" }]}>
            {snackbar.message}
          </Text>
        </View>
      )}
    </>
  );
}