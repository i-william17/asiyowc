import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { programService } from "../../../services/program";
import { LinearGradient } from "expo-linear-gradient";
import ShimmerLoader from "../../../components/ui/ShimmerLoader";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import tw from "../../../utils/tw";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import axios from "axios";
import { server } from "../../../server";

const CertificateScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const token = useSelector((state) => state.auth.token);

  const [program, setProgram] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Format dates nicely
  const formatDate = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ===========================================
  // LOAD CERTIFICATE DATA
  // ===========================================
  useEffect(() => {
    const load = async () => {
      try {
        const res = await programService.getProgram(id);
        const data = res.data || res;

        setProgram(data.program);
        setUserProgress(data.userProgress);

        // Trigger confetti if user is 100% complete
        if (data.userProgress?.progress === 100) {
          setTimeout(() => setShowConfetti(true), 500);
        }

      } catch (err) {
        console.log("❌ CERTIFICATE LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // ===========================================
  // LOADER
  // ===========================================
  if (loading) return <ShimmerLoader />;

  // ===========================================
  // VALIDATION
  // ===========================================
  if (!program)
    return (
      <View style={tw`flex-1 items-center justify-center p-6`}>
        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22 }}>
          Certificate Error
        </Text>
        <Text style={tw`text-gray-600 mt-2 text-center`}>
          Could not load program information.
        </Text>
      </View>
    );

  if (!userProgress || userProgress.progress < 100)
    return (
      <View style={tw`flex-1 items-center justify-center p-6`}>
        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22 }}>
          Certificate Unavailable
        </Text>
        <Text style={tw`text-gray-600 mt-2 text-center`}>
          Complete the program to unlock your certificate.
        </Text>
      </View>
    );

  const certificate = userProgress.certificate;
  if (!certificate)
    return (
      <View style={tw`flex-1 items-center justify-center p-6`}>
        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22 }}>
          Certificate Not Ready
        </Text>
        <Text style={tw`text-gray-600 mt-2 text-center`}>
          Your progress is 100%, but certificate data is missing.
        </Text>
      </View>
    );

  const participantName =
    userProgress.user?.profile?.fullName ?? "Learner";

  const programTitle = program.title;
  const issueDate = formatDate(certificate.issuedAt);
  const certificateId = certificate.id;

  // ===========================================
  // DOWNLOAD HANDLER
  // ===========================================
  const handleDownload = async () => {
    try {
      console.log("📤 DOWNLOAD CLICKED");

      if (!token) throw new Error("User not authenticated");

      const verificationUrl = `${server}/verify-certificate/${certificateId}`;
      const url = `${server}/programs/${id}/certificate/download`;

      const response = await axios.post(
        url,
        { verificationUrl },
        {
          headers: { Authorization: `Bearer ${token}` },
          // 🔥 CRITICAL CHANGE
          responseType: Platform.OS === "web" ? "blob" : "base64",
          timeout: 60000,
        }
      );

      console.log("✅ BACKEND RESPONSE:", response.status);

      // ===========================
      // 🌐 WEB (unchanged)
      // ===========================
      if (Platform.OS === "web") {
        const blob = new Blob([response.data], { type: "application/pdf" });

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = blobUrl;
        link.download = `certificate-${certificateId}.pdf`;
        link.click();

        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      // ===========================
      // 📱 MOBILE (NO BUFFER)
      // ===========================
      const fileUri =
        FileSystem.documentDirectory + `certificate-${certificateId}.pdf`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        response.data,
        { encoding: "base64" }
      );

      console.log("📱 PDF SAVED:", fileUri);

      await Sharing.shareAsync(fileUri);

    } catch (err) {
      console.error("❌ CERTIFICATE DOWNLOAD FAILED", err);
    }
  };

  // ===========================================
  // MAIN RENDER
  // ===========================================
  return (
    <View style={{ flex: 1 }}>

      {/* 🎉 CONFETTI ABOVE EVERYTHING */}
      {showConfetti && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            elevation: 9999,
            pointerEvents: "none",
          }}
        >
          <ConfettiCannon
            count={180}
            origin={{ x: 180, y: -10 }}
            fadeOut
            autoStart
          />
        </View>
      )}

      <ScrollView style={tw`flex-1 bg-gray-100`}>

        {/* ============================================================
            BEAUTIFUL HEADER
        ============================================================ */}
        <LinearGradient
          colors={["#4c1d95", "#5b21b6", "#6d28d9"]}
          style={tw`py-12 px-6 rounded-b-3xl shadow-lg`}
        >
          {/* Back Button (not overlayed) */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`bg-black/30 p-3 rounded-full w-12 mb-4`}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 32,
              color: "white",
            }}
          >
            Your Certificate
          </Text>

          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 15,
              color: "#E5E7EB",
              marginTop: 4,
              width: "90%",
            }}
          >
            View and download your official Asiyo Women Connect certification.
          </Text>

          {/* Gold Accent Line */}
          <View
            style={{
              width: 90,
              height: 4,
              backgroundColor: "#D4AF37",
              borderRadius: 10,
              marginTop: 14,
            }}
          />
        </LinearGradient>

        {/* ============================================================
            CERTIFICATE CARD
        ============================================================ */}
        <LinearGradient
          colors={["#4c1d95", "#6d28d9", "#4c1d95"]}
          style={tw`mx-4 mt-4 p-1 rounded-3xl shadow-2xl`}
        >
          <View style={tw`bg-white p-6 rounded-3xl`}>

            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 28,
                textAlign: "center",
                color: "#4c1d95",
              }}
            >
              Certificate of Completion
            </Text>

            <View
              style={{
                height: 3,
                backgroundColor: "#D4AF37",
                width: "60%",
                alignSelf: "center",
                marginTop: 10,
                borderRadius: 10,
              }}
            />

            {/* Participant */}
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 16,
                textAlign: "center",
                marginTop: 16,
                color: "#6B7280",
              }}
            >
              This is to certify that
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 30,
                textAlign: "center",
                marginVertical: 12,
                color: "#111827",
              }}
            >
              {participantName}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 16,
                textAlign: "center",
                color: "#6B7280",
              }}
            >
              has successfully completed the program
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 22,
                textAlign: "center",
                marginTop: 12,
                color: "#4c1d95",
              }}
            >
              {programTitle}
            </Text>

            {/* Issue Info */}
            <View style={tw`mt-8`}>
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  textAlign: "center",
                  color: "#374151",
                }}
              >
                Issued on:{" "}
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#4c1d95",
                  }}
                >
                  {issueDate}
                </Text>
              </Text>

              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  textAlign: "center",
                  marginTop: 4,
                  color: "#6B7280",
                }}
              >
                Certificate ID:{" "}
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#374151",
                  }}
                >
                  {certificateId}
                </Text>
              </Text>

              {certificate.verified && (
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                    marginTop: 6,
                    color: "#16a34a",
                  }}
                >
                  ✔ Verified Certificate
                </Text>
              )}
            </View>

            {/* QR Code */}
            {certificate.qrCode && (
              <View style={tw`mt-8 items-center`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#6B7280",
                    marginBottom: 6,
                  }}
                >
                  Scan to verify certificate
                </Text>

                <Image
                  source={{ uri: certificate.qrCode }}
                  style={{ width: 120, height: 120, resizeMode: "contain" }}
                />
              </View>
            )}

            {/* Signature + Seal */}
            <View style={tw`mt-10 flex-row items-center justify-between`}>

              {/* Signature */}
              <View style={tw`items-center flex-1 mr-2`}>
                <Image
                  source={require("../../../assets/images/signature.png")}
                  style={{ width: 150, height: 70, resizeMode: "contain" }}
                />
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 15,
                    color: "#6B7280",
                    marginTop: -10,
                  }}
                >
                  CEO, Asiyo Foundation
                </Text>
              </View>

              {/* Seal */}
              <View style={tw`items-center flex-1 ml-2`}>
                <Image
                  source={require("../../../assets/images/seal.png")}
                  style={{ width: 80, height: 80, resizeMode: "contain" }}
                />
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#6B7280",
                    marginTop: 4,
                  }}
                >
                  Asiyo Women Connect
                </Text>
              </View>
            </View>

            {/* Gold Line */}
            <View
              style={{
                height: 3,
                backgroundColor: "#D4AF37",
                width: "100%",
                marginTop: 20,
                borderRadius: 10,
              }}
            />
          </View>
        </LinearGradient>

        {/* Download Button */}
        <TouchableOpacity onPress={handleDownload} style={tw`mx-4 mt-6 mb-10`}>
          <LinearGradient
            colors={["#6d28d9", "#4c1d95"]}
            style={tw`rounded-xl p-4`}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                textAlign: "center",
                color: "white",
                fontSize: 16,
              }}
            >
              Download Certificate (PDF)
            </Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

export default CertificateScreen;
