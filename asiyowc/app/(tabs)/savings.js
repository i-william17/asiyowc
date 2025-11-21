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
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSavingsPods } from '../../store/slices/savingsSlice';
import SavingsPod from '../../components/savings/SavingsPod';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { FeedShimmer } from '../../components/ui/ShimmerLoader';
import tw from '../../utils/tw';

const SavingsScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { pods, contributions, loading } = useSelector(state => state.savings);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('myPods');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const tabs = [
    { id: 'myPods', name: 'My Pods' },
    { id: 'discover', name: 'Discover' },
    { id: 'contributions', name: 'Contributions' },
  ];

  useEffect(() => {
    loadData();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const loadData = async () => {
    await dispatch(fetchSavingsPods());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredPods = () => {
    switch (activeTab) {
      case 'myPods':
        return pods.filter(pod => pod.isMember);
      case 'discover':
        return pods.filter(pod => !pod.isMember);
      case 'contributions':
        return pods; // This would show contribution history
      default:
        return pods;
    }
  };

  const filteredPods = getFilteredPods();

  const totalSavings = pods.reduce((total, pod) => {
    return total + (pod.myContribution || 0);
  }, 0);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6A1B9A']}
            tintColor="#6A1B9A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
        >
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <View>
              <Text style={tw`text-2xl font-bold text-white`}>
                Savings
              </Text>
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

          {/* Savings Overview */}
          <View style={tw`bg-white bg-opacity-20 rounded-2xl p-6`}>
            <Text style={tw`text-white text-lg font-medium mb-2`}>
              Total Savings
            </Text>
            <Text style={tw`text-white text-3xl font-bold mb-2`}>
              KES {totalSavings.toLocaleString()}
            </Text>
            <Text style={tw`text-white text-opacity-80`}>
              Across {pods.filter(p => p.isMember).length} savings pods
            </Text>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={tw`px-6 -mt-4 mb-6`}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`pb-1`}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  tw`px-6 py-3 rounded-2xl mr-3`,
                  activeTab === tab.id 
                    ? tw`bg-purple-500 shadow-lg` 
                    : tw`bg-white border border-gray-200 shadow-sm`
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[
                  tw`font-medium`,
                  activeTab === tab.id 
                    ? tw`text-white` 
                    : tw`text-gray-700`
                ]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Savings Content */}
        <View style={tw`px-6 pb-8`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              {activeTab === 'myPods' ? 'My Savings Pods' : 
               activeTab === 'discover' ? 'Discover Pods' : 'Contribution History'}
            </Text>
            <Text style={tw`text-gray-500 text-sm`}>
              {filteredPods.length} {activeTab === 'contributions' ? 'records' : 'pods'}
            </Text>
          </View>
          
          {loading ? (
            <FeedShimmer />
          ) : filteredPods.length === 0 ? (
            <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
              <LottieLoader 
                type="savings" 
                size={120} 
                loop={false}
              />
              <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
                {activeTab === 'myPods' ? 'No savings pods yet' :
                 activeTab === 'discover' ? 'No pods available' :
                 'No contribution history'}
              </Text>
              <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
                {activeTab === 'myPods' ? 'Join or create a savings pod to start saving' :
                 activeTab === 'discover' ? 'Check back later for new savings pods' :
                 'Your contribution history will appear here'}
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
              {filteredPods.map((pod, index) => (
                <SavingsPod 
                  key={pod.id} 
                  pod={pod}
                  style={{
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50 * (index + 1), 0],
                      }),
                    }],
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Create Pod FAB */}
      {(activeTab === 'myPods' || activeTab === 'discover') && (
        <TouchableOpacity
          style={tw`absolute bottom-6 right-6 bg-gold-500 w-14 h-14 rounded-full items-center justify-center shadow-lg border-2 border-white`}
          onPress={() => router.push('/modals/create-pod')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default SavingsScreen;