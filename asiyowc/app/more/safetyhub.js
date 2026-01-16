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
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

import { getUserLocation, getLocationDetails } from "../../utils/location";
import { getEmergencyServices } from "../../utils/emergencyServices";

export default function SafetyHubScreen() {
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
      description: "Chat with mental health volunteers",
      icon: MessageCircle,
      color: "bg-purple-100",
      textColor: "text-purple-600",
      urgent: false,
    },
    {
      id: 3,
      title: "GBV Survivor Forum",
      description: "Safe space for survivors to connect",
      icon: Heart,
      color: "bg-pink-100",
      textColor: "text-pink-600",
      urgent: false,
    },
    {
      id: 4,
      title: "Legal Resources",
      description: "Access to legal aid and information",
      icon: FileText,
      color: "bg-blue-100",
      textColor: "text-blue-600",
      urgent: false,
    },
  ];

  const emergencyContacts = [
    { id: 1, name: "Kenya Police", number: "999", country: "🇰🇪" },
    { id: 2, name: "Gender Violence Helpline", number: "1195", country: "🇰🇪" },
    { id: 3, name: "Mental Health Support", number: "0800-720-820", country: "🇰🇪" },
  ];

  /* ================= HANDLERS ================= */

  const handleSOS = async () => {
    try {
      showSnackbar("Getting your location...", "info");

      const coords = await getUserLocation();
      const location = await getLocationDetails(coords);

      if (!location?.country) {
        throw new Error("Unable to determine location");
      }

      const services = getEmergencyServices(location.country);

      showSnackbar(
        `Emergency services for ${location.country} loaded`,
        "success"
      );

      Alert.alert(
        "Emergency Services",
        services.map(s => `${s.name}: ${s.number}`).join("\n")
      );
    } catch (error) {
      showSnackbar(
        error.message || "Unable to get location. Using global emergency.",
        "error"
      );
      Alert.alert("Emergency", "Call 112 for immediate help");
    }
  };

  const handleCall = (number) => {
    Alert.alert("Calling", `Dialing ${number}`);
    showSnackbar(`Calling ${number}`, "info");
  };

  const handleResourcePress = (title) => {
    Alert.alert("Support Resource", title);
    showSnackbar(title, "info");
  };

  /* ================= RENDER ================= */

  return (
    <>
      <ScrollView style={tw`min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50`}>
        {/* HEADER */}
        <View style={tw`bg-white border-b border-purple-100 px-4 py-4`}>
          <View style={tw`flex-row items-center gap-3 mb-2`}>
            <Shield size={24} color="#7c3aed" />
            <Text style={tw`text-purple-900 text-2xl font-poppins-semibold`}>
              Safety & Support Hub
            </Text>
          </View>
          <Text style={tw`text-sm text-gray-600 font-poppins-regular`}>
            You are not alone. We're here to help.
          </Text>
        </View>

        <View style={tw`px-4 pb-6`}>
          {/* SOS */}
          <View style={tw`mt-4 p-6 rounded-2xl bg-red-600 items-center`}>
            <AlertCircle size={48} color="#fff" />
            <Text style={tw`text-white text-2xl mt-3 font-poppins-semibold`}>
              Emergency SOS
            </Text>
            <Text style={tw`text-white/90 mt-2 mb-4 font-poppins-regular`}>
              Press for immediate assistance
            </Text>

            <TouchableOpacity
              onPress={handleSOS}
              style={tw`w-full h-16 bg-white rounded-full items-center justify-center flex-row`}
            >
              <Phone size={24} color="#dc2626" />
              <Text style={tw`text-red-600 text-lg ml-2 font-poppins-medium`}>
                CALL FOR HELP
              </Text>
            </TouchableOpacity>
          </View>

          {/* PRIVACY NOTICE */}
          <View style={tw`mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 flex-row gap-2`}>
            <Lock size={16} color="#7c3aed" />
            <Text style={tw`text-sm text-gray-700 font-poppins-regular flex-1`}>
              All conversations are confidential and encrypted. Your safety and
              privacy are our priority.
            </Text>
          </View>

          {/* RESOURCES */}
          <Text style={tw`text-purple-900 text-xl mt-6 mb-4 font-poppins-semibold`}>
            Support Resources
          </Text>

          {resources.map((r) => (
            <View
              key={r.id}
              style={tw`p-4 mb-3 rounded-xl bg-white ${r.urgent ? 'border-2 border-red-200' : 'border border-gray-100'}`}
            >
              <TouchableOpacity
                onPress={() => handleResourcePress(r.title)}
                style={tw`flex-row items-center gap-3`}
              >
                <View
                  style={tw`w-12 h-12 rounded-full items-center justify-center ${r.color}`}
                >
                  <r.icon size={24} />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Text style={tw`text-purple-900 font-poppins-medium`}>
                      {r.title}
                    </Text>

                    {r.urgent && (
                      <View style={tw`px-2 py-0.5 rounded-full bg-red-100`}>
                        <Text style={tw`text-xs text-red-700 font-poppins-medium`}>
                          24/7
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={tw`text-sm text-gray-600 font-poppins-regular`}>
                    {r.description}
                  </Text>
                </View>

                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ))}

          {/* EMERGENCY CONTACTS */}
          <Text style={tw`text-purple-900 text-xl mt-6 mb-4 font-poppins-semibold`}>
            Emergency Contacts
          </Text>

          {emergencyContacts.map((c) => (
            <View
              key={c.id}
              style={tw`p-4 mb-2 bg-white rounded-xl border border-gray-100 flex-row justify-between items-center`}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <Text style={tw`text-2xl`}>{c.country}</Text>
                <View>
                  <Text style={tw`text-purple-900 font-poppins-medium`}>
                    {c.name}
                  </Text>
                  <Text style={tw`text-sm text-gray-600 font-poppins-regular`}>
                    {c.number}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleCall(c.number)}
                style={tw`bg-green-600 px-4 py-2 rounded-full flex-row items-center`}
              >
                <Phone size={16} color="#fff" />
                <Text style={tw`text-white ml-1 font-poppins-medium`}>
                  Call
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* REPORT */}
          <View style={tw`mt-6 p-4 rounded-xl bg-gray-50 flex-row gap-3`}>
            <Flag size={20} color="#6b7280" />
            <View style={tw`flex-1`}>
              <Text style={tw`text-purple-900 font-poppins-medium mb-2`}>
                Report Inappropriate Content
              </Text>
              <Text style={tw`text-sm text-gray-600 mb-3 font-poppins-regular`}>
                Help us keep this community safe.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Report", "Report submitted");
                  showSnackbar("Report submitted", "success");
                }}
                style={tw`border border-purple-300 px-4 py-2 rounded-full self-start`}
              >
                <Text style={tw`text-purple-700 font-poppins-medium`}>
                  Report an Issue
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MENTAL HEALTH */}
          <View style={tw`mt-4 p-6 rounded-2xl bg-purple-600`}>
            <View style={tw`flex-row items-center gap-3 mb-4`}>
              <Headphones size={32} color="#fff" />
              <View>
                <Text style={tw`text-lg text-white font-poppins-semibold`}>
                  Mental Health Support
                </Text>
                <Text style={tw`text-sm text-white/90 font-poppins-regular`}>
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
              <Text style={tw`text-purple-600 font-poppins-medium`}>
                Connect with a Counselor
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={tw`mt-6 p-4 bg-purple-50 rounded-xl`}>
            <Text style={tw`text-sm text-gray-700 text-center font-poppins-regular`}>
              <Text style={tw`text-purple-900 font-poppins-semibold`}>
                Remember:
              </Text>{" "}
              Your wellbeing matters. Reaching out for help is a sign of strength, not weakness. The Asiyo sisterhood is here for you.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* SNACKBAR */}
      {snackbar.visible && (
        <View
          style={tw`absolute bottom-6 left-4 right-4 px-4 py-3 rounded-xl ${
            snackbar.type === "success"
              ? "bg-green-600"
              : snackbar.type === "error"
              ? "bg-red-600"
              : "bg-purple-600"
          }`}
        >
          <Text style={tw`text-white text-center font-poppins-medium`}>
            {snackbar.message}
          </Text>
        </View>
      )}
    </>
  );
}