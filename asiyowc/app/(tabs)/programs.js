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
import { fetchPrograms } from '../../store/slices/programsSlice';
import ProgramCard from '../../components/programs/ProgramCard';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { FeedShimmer } from '../../components/ui/ShimmerLoader';
import tw from '../../utils/tw';

const ProgramsScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { programs, enrolledPrograms, loading } = useSelector(state => state.programs);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const tabs = [
    { id: 'all', name: 'All Programs' },
    { id: 'enrolled', name: 'My Programs' },
    { id: 'completed', name: 'Completed' },
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
    await dispatch(fetchPrograms());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredPrograms = () => {
    switch (activeTab) {
      case 'enrolled':
        return programs.filter(p => p.isEnrolled);
      case 'completed':
        return programs.filter(p => p.isCompleted);
      default:
        return programs;
    }
  };

  const filteredPrograms = getFilteredPrograms();

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
                Programs
              </Text>
              <Text style={tw`text-white opacity-90 mt-1`}>
                Learn, grow, and empower yourself
              </Text>
            </View>
            <TouchableOpacity
              style={tw`bg-white bg-opacity-20 p-3 rounded-2xl`}
              onPress={() => router.push('/modals/notifications')}
            >
              <Ionicons name="certificate" size={24} color="white" />
            </TouchableOpacity>
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

        {/* Programs List */}
        <View style={tw`px-6 pb-8`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              {activeTab === 'all' ? 'All Programs' : 
               activeTab === 'enrolled' ? 'My Programs' : 'Completed Programs'}
            </Text>
            <Text style={tw`text-gray-500 text-sm`}>
              {filteredPrograms.length} programs
            </Text>
          </View>
          
          {loading ? (
            <FeedShimmer />
          ) : filteredPrograms.length === 0 ? (
            <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
              <LottieLoader 
                type="education" 
                size={120} 
                loop={false}
              />
              <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
                {activeTab === 'all' ? 'No programs available' :
                 activeTab === 'enrolled' ? 'No enrolled programs' :
                 'No completed programs'}
              </Text>
              <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
                {activeTab === 'all' ? 'Check back later for new programs' :
                 activeTab === 'enrolled' ? 'Enroll in programs to start learning' :
                 'Complete programs to see them here'}
              </Text>
              {activeTab === 'all' && (
                <AnimatedButton
                  title="Browse Programs"
                  onPress={() => {}}
                  variant="primary"
                />
              )}
            </View>
          ) : (
            <View style={tw`space-y-4`}>
              {filteredPrograms.map((program, index) => (
                <ProgramCard 
                  key={program.id} 
                  program={program}
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
    </SafeAreaView>
  );
};

export default ProgramsScreen;