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
  useWindowDimensions,
  Platform,
  FlatList,
} from "react-native";

import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import FeedShimmer from "../../components/ui/ShimmerLoader";
import ProgramCard from "../../components/programs/ProgramCard";
import { programService } from "../../services/program";
import tw from "../../utils/tw";
import { useSelector, useDispatch } from "react-redux";
import { fetchPublicPrograms, clearPrograms } from "../../store/slices/programsSlice";
import { fetchGamification } from "../../store/slices/authSlice";

const ProgramsScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  
  // Redux state for programs
  const {
    publicPrograms,
    pagination,
    loading: programsLoading,
  } = useSelector((state) => state.programs);

  const xp = user?.gamification?.xp ?? 0;
  const level = user?.gamification?.level ?? 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeTab, setActiveTab] = useState("all");

  const [myPrograms, setMyPrograms] = useState([]);
  const [completedPrograms, setCompletedPrograms] = useState([]);

  // 🔎 Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { width } = useWindowDimensions();

  const webCols =
    Platform.OS === "web"
      ? width >= 1200
        ? 4
        : 2
      : 1;

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
      FETCH MY & COMPLETED PROGRAMS (keep existing functionality)
  ----------------------------------------------------------------- */
  const fetchUserPrograms = async () => {
    try {
      const [myRes, completedRes] = await Promise.all([
        programService.getMyPrograms(),
        programService.getCompletedPrograms(),
      ]);

      setMyPrograms(extractPrograms(myRes));
      setCompletedPrograms(extractPrograms(completedRes));
    } catch (err) {
      console.log("❌ Fetch user programs error:", err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchGamification());
    }, [dispatch])
  );

  // Load first page of public programs on mount
  useEffect(() => {
    dispatch(
      fetchPublicPrograms({
        page: 1,
        limit: 12,
        replace: true,
      })
    );
    
    fetchUserPrograms();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();

    // Cleanup on unmount
    return () => {
      dispatch(clearPrograms());
    };
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(
        fetchPublicPrograms({
          page: 1,
          limit: 12,
          replace: true,
        })
      ),
      fetchUserPrograms(),
      dispatch(fetchGamification()),
    ]);
    setRefreshing(false);
  };

  /* -----------------------------------------------------------------
      LOAD MORE HANDLER
  ----------------------------------------------------------------- */
  const loadMore = () => {
    if (!pagination?.hasNextPage || programsLoading || loadingMore) return;

    setLoadingMore(true);
    dispatch(
      fetchPublicPrograms({
        page: pagination.currentPage + 1,
        limit: 12,
        replace: false,
      })
    ).finally(() => {
      setLoadingMore(false);
    });
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

  let dataToRender = [];
  if (activeTab === "all") dataToRender = publicPrograms;
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
      RENDER FOOTER (Load More button)
  ----------------------------------------------------------------- */
  const renderFooter = () => {
    if (activeTab !== "all" || !pagination?.hasNextPage) return null;
    
    return (
      <View style={tw`mt-6 items-center`}>
        <TouchableOpacity
          onPress={loadMore}
          disabled={programsLoading || loadingMore}
          style={[
            tw`py-3 px-8 rounded-xl items-center`,
            { 
              backgroundColor: "#6A1B9A",
              opacity: programsLoading || loadingMore ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: "Poppins-SemiBold",
              fontSize: 14,
            }}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Text>
        </TouchableOpacity>
        
        {pagination && (
          <Text
            style={{
              color: "#9CA3AF",
              fontFamily: "Poppins-Regular",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Showing {publicPrograms.length} of {pagination.totalDocs || publicPrograms.length} programs
          </Text>
        )}
      </View>
    );
  };

  /* -----------------------------------------------------------------
      RENDER PROGRAM GRID (Web)
  ----------------------------------------------------------------- */
  const renderWebGrid = () => (
    <View
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${webCols}, minmax(0, 1fr))`,
        gap: 16,
      }}
    >
      {dataToRender.map((program) => (
        <ProgramCard key={program._id} program={program} />
      ))}
    </View>
  );

  /* -----------------------------------------------------------------
      RENDER PROGRAM LIST (Native)
  ----------------------------------------------------------------- */
  const renderNativeList = () => (
    <FlatList
      data={dataToRender}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <ProgramCard program={item} />}
      scrollEnabled={false}
      ListFooterComponent={renderFooter}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );

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
          colors={["#6A1B9A", "#6A1B9A"]}
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

            <View style={tw`flex-row items-center`}>
              {/* ⭐ XP + Level Pill - Minimal Premium */}
              <View
                style={[
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 100,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,215,0,0.15)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                    backdropFilter: 'blur(8px)',
                  }
                ]}
              >
                {/* Level - Subtle Gold */}
                <Text
                  style={{
                    color: '#FBBF24',
                    fontFamily: 'Poppins-Bold',
                    fontSize: 13,
                    marginRight: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  Lv.{level}
                </Text>

                {/* XP - Clean White */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontFamily: 'Poppins-SemiBold',
                      fontSize: 14,
                      marginRight: 4,
                    }}
                  >
                    {xp}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'Poppins-Regular',
                      fontSize: 12,
                    }}
                  >
                    XP
                  </Text>
                </View>
              </View>
            </View>
            {/* 🔔 Notifications */}
            {/* <TouchableOpacity
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
            </TouchableOpacity> */}
          </View>
        </LinearGradient>

        {/* --------------------------------------------------------------
            TABS
        -------------------------------------------------------------- */}
        <View style={tw`px-4 -mt-4 mb-4`}>
          <View style={tw`bg-white rounded-2xl p-2 shadow-sm`}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                tw`flex-row`,
                Platform.OS === "web" && {
                  justifyContent: "center",
                  flexGrow: 1,
                },
              ]}
              style={[
                Platform.OS === "web" && {
                  alignSelf: "center",
                  width: "100%",
                  maxWidth: 1100,
                },
              ]}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    tw`px-5 py-3 mr-2 rounded-xl flex-row items-center justify-center`,
                    {
                      backgroundColor:
                        activeTab === tab.id ? "#6A1B9A" : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins-Medium",
                      fontSize: 14,
                      color: activeTab === tab.id ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* --------------------------------------------------------------
            SEARCH BAR
        -------------------------------------------------------------- */}
        <View
          style={[
            tw`px-6 mb-6`,
            Platform.OS === "web" && {
              alignSelf: "center",
              width: "100%",
              maxWidth: 1100,
            },
          ]}
        >
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
        <View
          style={[
            tw`px-6 pb-10`,
            Platform.OS === "web" && {
              alignSelf: "center",
              width: "100%",
              maxWidth: 1100,
            },
          ]}
        >
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

          {programsLoading && activeTab === "all" && dataToRender.length === 0 ? (
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
          ) : Platform.OS === "web" ? (
            <>
              {renderWebGrid()}
              {renderFooter()}
            </>
          ) : (
            renderNativeList()
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default ProgramsScreen;