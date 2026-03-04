import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";

import SavingsPod from "../../components/savings/SavingsPod";
import CreatePodModal from "../../components/savings/CreatePodModal";
import LottieLoader from "../../components/animations/LottieLoader";
import FeedShimmer from "../../components/ui/ShimmerLoader";
import tw from "../../utils/tw";

import {
  fetchMyPods,
  fetchDiscoverPods,
  fetchMyContributions,
} from "../../store/slices/savingsSlice";

/* ============================================================
   SAVINGS SCREEN (PRODUCTION-READY)
============================================================ */

const SavingsScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  /* ============================================================
     REDUX STATE
  ============================================================ */

  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.user?._id);

  const {
    myPods = [],
    discoverPods = [],
    contributions = [],
    loading = false,
  } = useSelector((state) => state.savings || {});

  /* ============================================================
     LOCAL UI STATE
  ============================================================ */

  const [activeTab, setActiveTab] = useState("myPods");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = latest first

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tabs = [
    { id: "myPods", name: "My Pods" },
    { id: "discover", name: "Discover" },
    { id: "contributions", name: "Contributions" },
  ];

  const months = [
    { id: "all", name: "All" },
    { id: 0, name: "Jan" },
    { id: 1, name: "Feb" },
    { id: 2, name: "Mar" },
    { id: 3, name: "Apr" },
    { id: 4, name: "May" },
    { id: 5, name: "Jun" },
    { id: 6, name: "Jul" },
    { id: 7, name: "Aug" },
    { id: 8, name: "Sep" },
    { id: 9, name: "Oct" },
    { id: 10, name: "Nov" },
    { id: 11, name: "Dec" },
  ];

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    if (!token) return;

    dispatch(fetchMyPods(token));
    dispatch(fetchDiscoverPods({ token, page: 1 }));
    dispatch(fetchMyContributions(token));

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [token]);

  /* ============================================================
     PULL-TO-REFRESH
  ============================================================ */

  const onRefresh = async () => {
    if (!token) return;

    setRefreshing(true);

    await Promise.all([
      dispatch(fetchMyPods(token)),
      dispatch(fetchDiscoverPods({ token, page: 1 })),
      dispatch(fetchMyContributions(token)),
    ]);

    setRefreshing(false);
  };

  /* ============================================================
     NORMALIZATION (CRITICAL)
  ============================================================ */

  const normalizePod = (pod) => {
    const uid = String(userId);

    const myContribution =
      pod.contributions
        ?.filter((c) => String(c.member) === uid)
        ?.reduce((sum, c) => sum + c.amount, 0) || 0;

    const isMember =
      pod.members?.some(
        (m) => String(m.user) === uid && m.isActive
      ) || false;

    return {
      ...pod,
      id: pod._id,

      image:
        "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",

      goalAmount: pod.goal?.targetAmount || 0,
      savedAmount: pod.currentBalance || 0,
      targetDate: pod.goal?.deadline || null,

      membersCount: pod.members?.length || 0,
      myContribution,
      isMember,
    };
  };

  /* ============================================================
     DERIVED DATA
  ============================================================ */
  const filteredContributions = contributions
    .filter((txn) => {
      if (selectedMonth === "all") return true;

      const month = new Date(txn.date).getMonth();
      return month === selectedMonth;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      return sortOrder === "desc"
        ? dateB - dateA
        : dateA - dateB;
    });

  const listData =
    activeTab === "myPods"
      ? myPods
      : activeTab === "discover"
        ? discoverPods
        : filteredContributions;

  const totalSavings = myPods.reduce((sum, pod) => {
    const mine =
      pod.contributions
        ?.filter((c) => String(c.member) === String(userId))
        ?.reduce((s, c) => s + c.amount, 0) || 0;

    return sum + mine;
  }, 0);

  /* ============================================================
     UI
  ============================================================ */

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6A1B9A"
            colors={["#6A1B9A"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER ================= */}
        <LinearGradient
          colors={["#6A1B9A", "#6A1B9A"]}
          style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
        >
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <View>
              <Text
                style={[tw`text-2xl text-white`, { fontFamily: "Poppins-Bold" }]}
              >
                Savings
              </Text>
              <Text
                style={[
                  tw`text-white opacity-90 mt-1`,
                  { fontFamily: "Poppins-Regular" },
                ]}
              >
                Grow together, save together
              </Text>
            </View>

            <TouchableOpacity
              style={tw`bg-white bg-opacity-20 p-3 rounded-2xl`}
              onPress={() => setShowCreate(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* ================= SUMMARY ================= */}
          <View style={tw`relative overflow-hidden`}>
            {/* Decorative elements */}
            <View style={[
              tw`absolute -right-6 -top-6 w-32 h-32 rounded-full`,
              { backgroundColor: 'rgba(255,255,255,0.1)' }
            ]} />
            <View style={[
              tw`absolute -left-4 -bottom-4 w-20 h-20 rounded-full`,
              { backgroundColor: 'rgba(255,255,255,0.08)' }
            ]} />

            {/* Main card */}
            <View style={[
              tw`rounded-3xl p-5`,
              {
                backgroundColor: '#6A1B9A',
                borderCurve: "continuous",
                shadowColor: "#6A1B9A",
                shadowOpacity: 0.25,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 5 },
              }
            ]}>
              {/* Top row with icon and label */}
              <View style={tw`flex-row items-center justify-between`}>
                <Text
                  style={[
                    tw`text-white text-opacity-90 text-sm`,
                    {
                      fontFamily: "Poppins-Medium",
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }
                  ]}
                >
                  Total savings
                </Text>
                <View style={[
                  tw`w-8 h-8 rounded-full items-center justify-center`,
                  { backgroundColor: 'rgba(255,255,255,0.15)' }
                ]}>
                  <Ionicons name="wallet-outline" size={16} color="white" />
                </View>
              </View>

              {/* Amount */}
              <Text
                style={[
                  tw`text-white mt-1`,
                  {
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 32,
                    lineHeight: 40,
                  }
                ]}
              >
                KES {totalSavings.toLocaleString()}
              </Text>

              {/* Footer with pod count and trend */}
              <View style={tw`flex-row items-center justify-between mt-2`}>
                <View style={tw`flex-row items-center`}>
                  <View style={[
                    tw`w-1.5 h-1.5 rounded-full mr-2`,
                    { backgroundColor: 'rgba(255,255,255,0.5)' }
                  ]} />
                  <Text
                    style={[
                      tw`text-white text-opacity-80 text-xs`,
                      { fontFamily: "Poppins-Regular" }
                    ]}
                  >
                    {myPods.length} {myPods.length === 1 ? 'pod' : 'pods'} · Active
                  </Text>
                </View>

              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ================= TABS ================= */}
        <View
          style={[
            tw`px-6 -mt-4 mb-6`,
            Platform.OS === "web" && {
              alignSelf: "center",
              width: "100%",
              maxWidth: 1100,
            },
          ]}
        >
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
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    tw`px-6 py-3 rounded-xl mr-2`,
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

        {/* ================= CONTENT ================= */}
        <View
          style={[
            tw`px-6 pb-8`,
            Platform.OS === "web" && {
              alignSelf: "center",
              width: "100%",
              maxWidth: 1100,
            },
          ]}
        >
          <Text
            style={[tw`text-xl text-gray-900 mb-4`, { fontFamily: "Poppins-Bold" }]}
          >
            {activeTab === "myPods"
              ? "My Savings Pods"
              : activeTab === "discover"
                ? "Discover Pods"
                : "Contribution History"}
          </Text>

          {activeTab === "contributions" && (
            <View style={tw`mb-4`}>

              {/* SORT BUTTON */}
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Text style={{ fontFamily: "Poppins-Medium", color: "#6B7280" }}>
                  Sort
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setSortOrder((prev) =>
                      prev === "desc" ? "asc" : "desc"
                    )
                  }
                  style={tw`flex-row items-center`}
                >
                  <Ionicons
                    name={sortOrder === "desc" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color="#6A1B9A"
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontFamily: "Poppins-Medium",
                      color: "#6A1B9A",
                    }}
                  >
                    {sortOrder === "desc"
                      ? "Latest first"
                      : "Oldest first"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* MONTH FILTER */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {months.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setSelectedMonth(m.id)}
                    style={[
                      tw`px-4 py-2 rounded-xl mr-2`,
                      {
                        backgroundColor:
                          selectedMonth === m.id
                            ? "#6A1B9A"
                            : "#F3F4F6",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        fontSize: 13,
                        color:
                          selectedMonth === m.id
                            ? "#FFFFFF"
                            : "#6B7280",
                      }}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {loading ? (
            <FeedShimmer />
          ) : listData.length === 0 ? (
            <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
              <LottieLoader type="savings" size={120} loop={false} />
              <Text
                style={[tw`text-lg text-gray-500 mt-4`, { fontFamily: "Poppins-Medium" }]}
              >
                No items yet
              </Text>
              <Text
                style={[
                  tw`text-gray-400 mt-2 mb-6`,
                  { fontFamily: "Poppins-Regular" },
                ]}
              >
                Your contributions will appear here
              </Text>
            </View>
          ) : (
            <View
              style={
                Platform.OS === "web"
                  ? {
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }
                  : tw`space-y-4`
              }
            >
              {activeTab === "contributions"
                ? listData.map((txn) => (
                  <View
                    key={txn._id}
                    style={tw`bg-white rounded-xl p-4 shadow-sm`}
                  >
                    <Text
                      style={[
                        tw`text-gray-800`,
                        { fontFamily: "Poppins-Medium" },
                      ]}
                    >
                      DEPOSIT — KES {txn.amount.toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        tw`text-gray-500 text-sm mt-1`,
                        { fontFamily: "Poppins-Regular" },
                      ]}
                    >
                      {new Date(txn.date).toLocaleDateString()}
                    </Text>
                  </View>
                ))
                : listData.map((pod, index) => {
                  const uiPod = normalizePod(pod);

                  return (
                    <SavingsPod
                      key={uiPod.id}
                      pod={uiPod}
                      onPress={() => router.push(`/savings/${uiPod.id}`)}
                      style={[
                        {
                          opacity: fadeAnim,
                          transform: [
                            {
                              translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50 * (index + 1), 0],
                              }),
                            },
                          ],
                        },
                        Platform.OS !== "web" && { marginBottom: 16 },
                      ]}
                    />
                  );
                })}
            </View>
          )}
        </View>

        <CreatePodModal
          visible={showCreate}
          animationType="slide"
          onClose={() => setShowCreate(false)}
          onSubmit={(payload) => {
            dispatch(createPod({ payload, token }));
            console.log(payload);
          }}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default SavingsScreen;
