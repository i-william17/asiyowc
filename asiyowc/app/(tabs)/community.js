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
import { fetchGroups } from '../../store/slices/communitySlice';
import GroupCard from '../../components/community/GroupCard';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import { FeedShimmer } from '../../components/ui/ShimmerLoader';
import tw from '../../utils/tw';

const CommunityScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { groups, conversations, loading } = useSelector(state => state.community);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const tabs = [
    { id: 'groups', name: 'Groups', icon: 'people' },
    { id: 'chats', name: 'Messages', icon: 'chatbubbles' },
    { id: 'voice', name: 'Voice Rooms', icon: 'mic' },
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
    await dispatch(fetchGroups());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return renderGroups();
      case 'chats':
        return renderChats();
      case 'voice':
        return renderVoiceRooms();
      default:
        return renderGroups();
    }
  };

  const renderGroups = () => {
    if (loading) {
      return <FeedShimmer />;
    }

    if (groups.length === 0) {
      return (
        <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
          <LottieLoader type="connection" size={120} loop={false} />
          <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
            No groups yet
          </Text>
          <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
            Join groups to connect with like-minded women
          </Text>
          <AnimatedButton
            title="Explore Groups"
            onPress={() => {}}
            variant="primary"
          />
        </View>
      );
    }

    return (
      <View style={tw`space-y-4`}>
        {groups.map((group, index) => (
          <GroupCard 
            key={group.id} 
            group={group}
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
    );
  };

  const renderChats = () => {
    return (
      <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
        <LottieLoader type="mentorship" size={120} loop={false} />
        <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
          Direct Messages
        </Text>
        <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
          Connect one-on-one with community members
        </Text>
        <AnimatedButton
          title="Start a Conversation"
          onPress={() => {}}
          variant="primary"
        />
      </View>
    );
  };

  const renderVoiceRooms = () => {
    return (
      <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
        <LottieLoader type="empowerment" size={120} loop={false} />
        <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
          Voice Rooms
        </Text>
        <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
          Join live audio conversations with the community
        </Text>
        <AnimatedButton
          title="Explore Voice Rooms"
          onPress={() => {}}
          variant="gold"
        />
      </View>
    );
  };

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
                Community
              </Text>
              <Text style={tw`text-white opacity-90 mt-1`}>
                Connect with women worldwide
              </Text>
            </View>
            <TouchableOpacity
              style={tw`bg-white bg-opacity-20 p-3 rounded-2xl`}
              onPress={() => router.push('/modals/create-post')}
            >
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={tw`px-6 -mt-4 mb-6`}>
          <View style={tw`bg-white rounded-2xl p-2 shadow-corporate`}>
            <View style={tw`flex-row`}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    tw`flex-1 flex-row items-center justify-center py-3 rounded-xl`,
                    activeTab === tab.id 
                      ? tw`bg-purple-500` 
                      : tw`bg-transparent`
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons 
                    name={tab.icon} 
                    size={20} 
                    color={activeTab === tab.id ? 'white' : '#6B7280'} 
                  />
                  <Text 
                    style={[
                      tw`ml-2 font-medium`,
                      activeTab === tab.id ? tw`text-white` : tw`text-gray-600`
                    ]}
                  >
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={tw`px-6 pb-8`}>
          {renderContent()}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default CommunityScreen;