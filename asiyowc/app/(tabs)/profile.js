import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logoutUser } from '../../store/slices/authSlice';
import ProfileHeader from '../../components/profile/ProfileHeader';
import BadgeCollection from '../../components/profile/BadgeCollection';
import StatsOverview from '../../components/profile/StatsOverview';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const ProfileScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { posts } = useSelector(state => state.feed);
  const { programs } = useSelector(state => state.programs);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: 'grid' },
    { id: 'posts', name: 'My Posts', icon: 'document-text' },
    { id: 'programs', name: 'Programs', icon: 'school' },
    { id: 'savings', name: 'Savings', icon: 'wallet' },
  ];

  useEffect(() => {
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh user data here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    router.replace('/(auth)/onboarding');
  };

  const myPosts = posts.filter(post => post.isMine);
  const enrolledPrograms = programs.filter(program => program.isEnrolled);
  const completedPrograms = programs.filter(program => program.isCompleted);

  const stats = {
    posts: myPosts.length,
    programs: enrolledPrograms.length,
    completed: completedPrograms.length,
    connections: user?.statistics?.connectionsCount || 0,
    impact: user?.statistics?.impactScore || 0,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={tw`space-y-6`}>
            <StatsOverview stats={stats} />
            <BadgeCollection badges={user?.badges || []} />
            
            {/* Quick Actions */}
            <View style={tw`bg-white rounded-2xl p-6 shadow-sm`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
                Quick Actions
              </Text>
              <View style={tw`flex-row flex-wrap justify-between`}>
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/modals/profile-edit')}
                >
                  <View style={tw`bg-purple-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="create" size={24} color="#6A1B9A" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Edit Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/modals/settings')}
                >
                  <View style={tw`bg-blue-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="settings" size={24} color="#3B82F6" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Settings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/modals/sos-help')}
                >
                  <View style={tw`bg-red-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="heart" size={24} color="#EF4444" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Get Help</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/(tabs)/programs')}
                >
                  <View style={tw`bg-green-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="school" size={24} color="#10B981" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Programs</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/(tabs)/savings')}
                >
                  <View style={tw`bg-yellow-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="wallet" size={24} color="#F59E0B" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Savings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={tw`items-center w-1/3 mb-4`}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <View style={tw`bg-pink-100 p-3 rounded-xl mb-2`}>
                    <Ionicons name="people" size={24} color="#EC4899" />
                  </View>
                  <Text style={tw`text-xs text-gray-700 text-center`}>Community</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      
      case 'posts':
        return (
          <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
            <LottieLoader type="empowerment" size={120} loop={false} />
            <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
              {myPosts.length} Posts
            </Text>
            <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
              Your posts and shared experiences
            </Text>
            <AnimatedButton
              title="Create New Post"
              onPress={() => router.push('/modals/create-post')}
              variant="primary"
            />
          </View>
        );
      
      case 'programs':
        return (
          <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
            <LottieLoader type="education" size={120} loop={false} />
            <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
              {enrolledPrograms.length} Enrolled Programs
            </Text>
            <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
              {completedPrograms.length} programs completed
            </Text>
            <AnimatedButton
              title="Browse Programs"
              onPress={() => router.push('/(tabs)/programs')}
              variant="primary"
            />
          </View>
        );
      
      case 'savings':
        return (
          <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
            <LottieLoader type="savings" size={120} loop={false} />
            <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
              Savings & Investments
            </Text>
            <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
              Manage your savings pods and contributions
            </Text>
            <AnimatedButton
              title="View Savings"
              onPress={() => router.push('/(tabs)/savings')}
              variant="gold"
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
        <LottieLoader type="loading" size={120} />
        <Text style={tw`text-gray-500 mt-4`}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

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
        {/* Profile Header */}
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
        >
          <ProfileHeader user={user} />
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
                  tw`px-4 py-3 rounded-2xl mr-3 flex-row items-center`,
                  activeTab === tab.id 
                    ? tw`bg-purple-500 shadow-lg` 
                    : tw`bg-white border border-gray-200 shadow-sm`
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={16} 
                  color={activeTab === tab.id ? 'white' : '#6B7280'} 
                />
                <Text style={[
                  tw`ml-2 font-medium`,
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

        {/* Profile Content */}
        <View style={tw`px-6 pb-8`}>
          {renderContent()}
        </View>

        {/* Logout Button */}
        <View style={tw`px-6 pb-8`}>
          <AnimatedButton
            title="Logout"
            onPress={handleLogout}
            variant="danger"
            size="md"
            fullWidth
            icon={<Ionicons name="log-out" size={20} color="white" />}
          />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;