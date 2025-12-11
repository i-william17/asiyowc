import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SavingsPod from '../../components/savings/SavingsPod';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import FeedShimmer from '../../components/ui/ShimmerLoader';
import tw from '../../utils/tw';

const SavingsScreen = () => {
  const router = useRouter();

  // -------------------------------------------------------------
  // MOCK SAVINGS POD DATA (INLINE)
  // -------------------------------------------------------------
  const mockPods = [
    {
      id: "pod_001",
      name: "EmpowerHer Monthly Savings",
      description: "A savings pod for women focused on business growth & financial empowerment.",
      goalAmount: 50000,
      savedAmount: 17500,
      myContribution: 6500,
      targetDate: "2025-12-30",
      membersCount: 24,
      isMember: true,
      image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
    },
    {
      id: "pod_002",
      name: "SheBuilds Sacco Group",
      description: "Women saving together to finance small business projects.",
      goalAmount: 150000,
      savedAmount: 80000,
      myContribution: 0,
      targetDate: "2026-05-14",
      membersCount: 79,
      isMember: false,
      image: "https://images.pexels.com/photos/3810750/pexels-photo-3810750.jpeg",
    },
    {
      id: "pod_003",
      name: "Mothers Thrive Pod",
      description: "Helping mothers set aside money for long-term financial stability.",
      goalAmount: 30000,
      savedAmount: 14300,
      myContribution: 2300,
      targetDate: "2025-09-01",
      membersCount: 10,
      isMember: true,
      image: "https://images.pexels.com/photos/428333/pexels-photo-428333.jpeg",
    },
    {
      id: "pod_004",
      name: "Young Women Future Fund",
      description: "Helping young women create future financial resilience.",
      goalAmount: 100000,
      savedAmount: 42000,
      myContribution: 0,
      targetDate: "2025-08-15",
      membersCount: 56,
      isMember: false,
      image: "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg",
    }
  ];

  const mockContributions = [
    { id: "txn_001", podId: "pod_001", amount: 2500, date: "2025-02-18", type: "deposit" },
    { id: "txn_002", podId: "pod_003", amount: 1000, date: "2025-01-20", type: "deposit" },
    { id: "txn_003", podId: "pod_001", amount: 3000, date: "2025-03-02", type: "deposit" },
  ];

  // -------------------------------------------------------------
  // STATES
  // -------------------------------------------------------------
  const [pods, setPods] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('myPods');

  const fadeAnim = useState(new Animated.Value(0))[0];

  const tabs = [
    { id: 'myPods', name: 'My Pods' },
    { id: 'discover', name: 'Discover' },
    { id: 'contributions', name: 'Contributions' },
  ];

  // -------------------------------------------------------------
  // LOAD MOCK DATA
  // -------------------------------------------------------------
  useEffect(() => {
    setTimeout(() => {
      setPods(mockPods);
      setContributions(mockContributions);
      setLoading(false);
    }, 700);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setPods(mockPods);
      setContributions(mockContributions);
      setRefreshing(false);
    }, 500);
  };

  // -------------------------------------------------------------
  // FILTERED PODS BASED ON TAB
  // -------------------------------------------------------------
  const filteredPods = (() => {
    switch (activeTab) {
      case 'myPods':
        return pods.filter((p) => p.isMember);
      case 'discover':
        return pods.filter((p) => !p.isMember);
      case 'contributions':
        return contributions;
      default:
        return pods;
    }
  })();

  const totalSavings = pods.reduce((sum, p) => sum + (p.myContribution || 0), 0);

  // -------------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------------
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

        {/* HEADER */}
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
        >
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <View>
              <Text style={tw`text-2xl font-bold text-white`}>Savings</Text>
              <Text style={tw`text-white opacity-90 mt-1`}>
                Grow together, save together
              </Text>
            </View>

            <TouchableOpacity
              style={tw`bg-white bg-opacity-20 p-3 rounded-2xl`}
              onPress={() => router.push('/modals/create-pod')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* SUMMARY */}
          <View style={tw`bg-white bg-opacity-20 rounded-2xl p-6`}>
            <Text style={tw`text-white text-lg font-medium`}>Total Savings</Text>
            <Text style={tw`text-white text-3xl font-bold mt-1`}>
              KES {totalSavings.toLocaleString()}
            </Text>
            <Text style={tw`text-white text-opacity-80 mt-1`}>
              Across {pods.filter(p => p.isMember).length} pods
            </Text>
          </View>
        </LinearGradient>

        {/* TABS */}
        <View style={tw`px-6 -mt-4 mb-6`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  tw`px-6 py-3 rounded-2xl mr-3`,
                  activeTab === tab.id ? tw`bg-purple-500` : tw`bg-white border border-gray-200`,
                ]}
              >
                <Text
                  style={[
                    tw`font-medium`,
                    activeTab === tab.id ? tw`text-white` : tw`text-gray-700`,
                  ]}
                >
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CONTENT */}
        <View style={tw`px-6 pb-8`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
            {activeTab === 'myPods'
              ? 'My Savings Pods'
              : activeTab === 'discover'
              ? 'Discover Pods'
              : 'Contribution History'}
          </Text>

          {loading ? (
            <FeedShimmer />
          ) : filteredPods.length === 0 ? (
            <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
              <LottieLoader type="savings" size={120} loop={false} />

              <Text style={tw`text-lg text-gray-500 mt-4 font-medium`}>
                No items yet
              </Text>

              <Text style={tw`text-gray-400 mt-2 mb-6`}>
                {activeTab === 'myPods'
                  ? 'Join or create a savings pod to start saving'
                  : activeTab === 'discover'
                  ? 'No pods available right now'
                  : 'Your contributions will appear here'}
              </Text>

              {activeTab === 'discover' && (
                <AnimatedButton
                  title="Create a Pod"
                  onPress={() => router.push('/modals/create-pod')}
                  variant="primary"
                />
              )}
            </View>
          ) : (
            <View style={tw`space-y-4`}>
              {activeTab === 'contributions'
                ? filteredPods.map((txn) => (
                    <View key={txn.id} style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                      <Text style={tw`text-gray-800 font-medium`}>
                        {txn.type.toUpperCase()} — KES {txn.amount.toLocaleString()}
                      </Text>
                      <Text style={tw`text-gray-500 text-sm mt-1`}>{txn.date}</Text>
                    </View>
                  ))
                : filteredPods.map((pod, index) => (
                    <SavingsPod
                      key={pod.id}
                      pod={pod}
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [50 * (index + 1), 0],
                            }),
                          },
                        ],
                      }}
                    />
                  ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* FAB CREATE POD */}
      {(activeTab === 'myPods' || activeTab === 'discover') && (
        <TouchableOpacity
          onPress={() => router.push('/modals/create-pod')}
          style={tw`absolute bottom-6 right-6 bg-purple-600 w-14 h-14 rounded-full items-center justify-center shadow-lg`}
        >
          <Ionicons name="add" size={26} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default SavingsScreen;
