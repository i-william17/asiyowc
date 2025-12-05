// app/(tabs)/ProgramsScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  TextInput,
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import FeedShimmer from "../../components/ui/ShimmerLoader";
import ProgramCard from "../../components/programs/ProgramCard";
import { programService } from "../../services/program";
import tw from "../../utils/tw";

const ProgramsScreen = () => {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState("all");

  const [allPrograms, setAllPrograms] = useState([]);
  const [myPrograms, setMyPrograms] = useState([]);
  const [completedPrograms, setCompletedPrograms] = useState([]);

  // 🔎 Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /* -----------------------------------------------------------------
      SAFE EXTRACTOR: handles { programs }, { data }, or arrays
  ----------------------------------------------------------------- */
  const extractPrograms = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.programs) return res.programs;
    if (res.data) return res.data;
    return [];
  };

  /* -----------------------------------------------------------------
      FETCH ALL PROGRAM DATA
  ----------------------------------------------------------------- */
  const fetchAll = async () => {
    try {
      setLoading(true);

      const publicRes = await programService.getPublicPrograms();
      const myRes = await programService.getMyPrograms();
      const completedRes = await programService.getCompletedPrograms();

      console.log("📌 PUBLIC:", publicRes);
      console.log("📌 MY PROGRAMS:", myRes);
      console.log("📌 COMPLETED:", completedRes);

      setAllPrograms(extractPrograms(publicRes));
      setMyPrograms(extractPrograms(myRes));
      setCompletedPrograms(extractPrograms(completedRes));
    } catch (err) {
      console.log("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  /* -----------------------------------------------------------------
      SEARCH DEBOUNCE
  ----------------------------------------------------------------- */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  /* -----------------------------------------------------------------
      TABS
  ----------------------------------------------------------------- */
  const tabs = [
    { id: "all", name: "All Programs" },
    { id: "enrolled", name: "My Programs" },
    { id: "completed", name: "Completed" },
  ];

  let dataToRender = allPrograms;
  if (activeTab === "enrolled") dataToRender = myPrograms;
  if (activeTab === "completed") dataToRender = completedPrograms;

  // 🔎 Apply search filtering (frontend)
  if (debouncedQuery.trim().length > 0) {
    const q = debouncedQuery.toLowerCase();

    dataToRender = dataToRender.filter((p) => {
      return (
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    });
  }

  /* -----------------------------------------------------------------
      RENDER UI
  ----------------------------------------------------------------- */
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6A1B9A"]}
            tintColor="#6A1B9A"
          />
        }
      >
        {/* --------------------------------------------------------------
            HEADER
        -------------------------------------------------------------- */}
        <LinearGradient
          colors={["#6A1B9A", "#8E24AA"]}
          style={tw`px-6 pt-16 pb-10 rounded-b-3xl shadow-lg`}
        >
          <View style={tw`flex-row justify-between items-center`}>
            <View>
              <Text
                style={[
                  tw`text-white`,
                  { fontSize: 28, fontFamily: "Poppins-Bold" },
                ]}
              >
                Programs
              </Text>
              <Text
                style={[
                  tw`mt-1`,
                  {
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "Poppins-Regular",
                    fontSize: 14,
                  },
                ]}
              >
                Learn • Grow • Empower
              </Text>
            </View>

            {/* 🔔 Notifications */}
            <TouchableOpacity
              style={[
                tw`p-3 rounded-2xl`,
                { backgroundColor: "rgba(255,255,255,0.18)" },
              ]}
              onPress={() => router.push("/modals/notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={26}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* --------------------------------------------------------------
            TABS
        -------------------------------------------------------------- */}
        <View style={tw`px-6 -mt-4 mb-4`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  tw`px-6 py-3 mr-3 rounded-2xl`,
                  {
                    backgroundColor:
                      activeTab === tab.id ? "#6A1B9A" : "#FFFFFF",
                    borderWidth: activeTab === tab.id ? 0 : 1,
                    borderColor: "#E5E7EB",
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: activeTab === tab.id ? "#FFFFFF" : "#374151",
                  }}
                >
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --------------------------------------------------------------
            SEARCH BAR
        -------------------------------------------------------------- */}
        <View style={tw`px-6 mb-6`}>
          <View
            style={[
              tw`flex-row items-center rounded-2xl px-4 py-3`,
              {
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
              },
            ]}
          >
            <Ionicons name="search" size={20} color="#6B7280" />

            <TextInput
              placeholder="Search programs..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                marginLeft: 10,
                fontFamily: "Poppins-Regular",
                fontSize: 14,
                color: "#111827",
                flex: 1,
              }}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* --------------------------------------------------------------
            PROGRAM LIST
        -------------------------------------------------------------- */}
        <View style={tw`px-6 pb-10`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
              marginBottom: 12,
            }}
          >
            {activeTab === "all"
              ? "All Programs"
              : activeTab === "enrolled"
              ? "Your Programs"
              : "Completed Programs"}
          </Text>

          {loading ? (
            <FeedShimmer />
          ) : dataToRender.length === 0 ? (
            <View style={tw`items-center mt-10`}>
              <Text
                style={{
                  color: "#6B7280",
                  fontFamily: "Poppins-Medium",
                  fontSize: 15,
                }}
              >
                No programs found.
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Try searching with a different term or pull down to refresh.
              </Text>
            </View>
          ) : (
            dataToRender.map((program) => (
              <ProgramCard key={program._id} program={program} />
            ))
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default ProgramsScreen;
