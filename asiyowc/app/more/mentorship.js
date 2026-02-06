import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import { fetchMentors, fetchMentorStories } from '../../store/slices/mentorshipSlice';
import { useRouter } from 'expo-router';

import {
  Search,
  Star,
  Calendar,
  Award,
  TrendingUp,
  MessageCircle,
  Plus,
  ChevronLeft,
} from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import tw from "../../utils/tw";

/* ================= IMPORT NEW COMPONENTS ================= */
import FullStoryScreen from "../../components/mentorship/FullStoryModal";
import BecomeMentorModal from "../../components/mentorship/BecomeMentorModal";
import ShareStoryModal from "../../components/mentorship/ShareStoryModal";

/* ============================================================
   TAB BUTTON COMPONENT
============================================================ */
const TabButton = React.memo(({ label, value, activeTab, onPress }) => {
  const isActive = activeTab === value;

  return (
    <TouchableOpacity
      style={[
        tw`flex-1 px-4 py-3 rounded-full`,
        isActive ? tw`bg-white shadow-sm` : tw`bg-transparent`,
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
      accessibilityLabel={`${label} tab`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[
        tw`text-center text-sm`,
        { fontFamily: 'Poppins-Medium' },
        isActive ? tw`text-purple-800` : tw`text-gray-600`
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

/* ============================================================
   MENTOR CARD COMPONENT
============================================================ */
const MentorCard = React.memo(({ mentor, onPress }) => {
  const avatar = mentor.user?.profile?.avatar?.url || mentor.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
  const name = mentor.user?.profile?.fullName || mentor.name || 'Mentor Name';
  const title = mentor.title || 'Expert Mentor';
  const specialty = mentor.specialty || 'General';
  const experience = mentor.experience || '5+ years';
  const mentees = mentor.mentees || 0;
  const rating = mentor.rating || 4.5;
  const sessions = mentor.sessions || 0;
  const isVerified = mentor.verified || false;

  return (
    <Animated.View
      entering={FadeInDown}
      style={tw`bg-white rounded-2xl shadow-sm mb-4 border border-gray-100 overflow-hidden`}
    >
      <TouchableOpacity
        onPress={() => onPress?.(mentor)}
        activeOpacity={0.9}
        accessibilityLabel={`View ${name}'s profile`}
        accessibilityRole="button"
      >
        <View style={tw`p-5`}>
          {/* Mentor Header */}
          <View style={tw`flex-row items-start mb-5`}>
            <View style={tw`relative`}>
              <View style={tw`w-20 h-20 rounded-2xl overflow-hidden bg-purple-50 border-2 border-purple-100`}>
                <Image 
                  source={{ uri: avatar }} 
                  style={tw`w-full h-full`}
                  resizeMode="cover"
                />
              </View>
              {isVerified && (
                <View style={tw`absolute -bottom-1 -right-1 w-7 h-7 bg-purple-700 rounded-full items-center justify-center border-2 border-white shadow-sm`}>
                  <Award size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={tw`ml-4 flex-1 min-w-0`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={[tw`text-gray-900 text-lg mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
                  {name}
                </Text>
                <View style={tw`flex-row items-center`}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={[tw`text-amber-700 ml-1 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
                {title}
              </Text>

              <View style={tw`bg-purple-50 self-start px-3 py-1.5 rounded-full border border-purple-100`}>
                <Text style={[tw`text-purple-800 text-xs`, { fontFamily: 'Poppins-Medium' }]}>
                  {specialty}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ============================================================
   STORY CARD COMPONENT
============================================================ */
const SpotlightCard = React.memo(({ story, onPress }) => {
  const title = story.title || 'Success Story';
  const content = story.content || 'An inspiring journey of growth and achievement...';
  const author = story.author?.name || 'Anonymous';
  const views = story.views || 0;
  const image = story.image || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400';

  return (
    <Animated.View 
      entering={FadeInDown}
      style={tw`bg-white rounded-2xl overflow-hidden shadow-sm mb-4 border border-gray-100`}
    >
      <TouchableOpacity
        onPress={() => onPress?.(story)}
        activeOpacity={0.9}
        accessibilityLabel={`Read ${title} story`}
        accessibilityRole="button"
      >
        {/* Story Image */}
        <View style={tw`h-48 relative`}>
          <Image 
            source={{ uri: image }} 
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
          <LinearGradient 
            colors={['rgba(106,27,154,0.8)', 'transparent', 'rgba(106,27,154,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={tw`absolute inset-0`}
          />
          
          {/* Story Badge */}
          <View style={tw`absolute top-4 left-4`}>
            <View style={tw`bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30`}>
              <Text style={[tw`text-white text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
                Success Story
              </Text>
            </View>
          </View>
          
          {/* Story Title Overlay */}
          <View style={tw`absolute bottom-4 left-4 right-4`}>
            <Text style={[tw`text-white text-xl mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              {title}
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              by {author}
            </Text>
          </View>
        </View>

        {/* Story Content */}
        <View style={tw`p-5`}>
          <Text 
            numberOfLines={3} 
            style={[tw`text-gray-700 mb-4 leading-6`, { fontFamily: 'Poppins-Regular' }]}
          >
            {content}
          </Text>

          {/* Story Footer */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`flex-row items-center mr-4`}>
                <Star size={16} color="#6B7280" />
                <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
                  {views.toLocaleString()} views
                </Text>
              </View>
              
              <View style={tw`flex-row items-center`}>
                <TrendingUp size={16} color="#6B7280" />
                <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
                  Featured
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={tw`border border-purple-200 rounded-full px-4 py-2 bg-purple-50`}
              activeOpacity={0.7}
              accessibilityLabel="Read full story"
              accessibilityRole="button"
            >
              <Text style={[tw`text-purple-800 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                Read Story →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ============================================================
   MAIN SCREEN
============================================================ */
export default function MentorshipScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { mentors, stories, loading } = useSelector(s => s.mentorship);

  const [activeTab, setActiveTab] = useState('mentors');
  const [searchText, setSearchText] = useState('');
  const [showBecomeModal, setShowBecomeModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    dispatch(fetchMentors());
  }, []);

  useEffect(() => {
    if (activeTab === "spotlight" && mentors?.length) {
      dispatch(fetchMentorStories(mentors[0]._id));
    }
  }, [activeTab, mentors]);

  /* ================= SEARCH FILTER ================= */
  const filteredMentors = useMemo(() => {
    if (!searchText) return mentors;

    return mentors.filter(m =>
      `${m.user?.profile?.fullName} ${m.specialty} ${m.title}`
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );
  }, [searchText, mentors]);

  /* ================= HANDLERS ================= */
  const handleBack = () => {
    router.back();
  };

  const handleMentorPress = (mentor) => {
    router.push({
      pathname: "/mentorship/mentor-details",
      params: { mentorId: mentor._id }
    });
  };

  const handleStoryPress = (story) => {
    router.push({
      pathname: "/mentorship/full-story",
      params: { storyId: story._id }
    });
  };

  /* ================= RENDER TABS ================= */
  const renderMentorsTab = () => {
    if (loading) {
      return (
        <View style={tw`py-10 items-center`}>
          <ActivityIndicator size="large" color="#6A1B9A" />
          <Text style={[tw`text-gray-600 mt-4`, { fontFamily: 'Poppins-Regular' }]}>
            Loading mentors...
          </Text>
        </View>
      );
    }

    if (!filteredMentors?.length) {
      return (
        <View style={tw`py-10 items-center`}>
          <View style={tw`w-20 h-20 bg-purple-50 rounded-full items-center justify-center mb-4 border border-purple-100`}>
            <Search size={32} color="#6A1B9A" />
          </View>
          <Text style={[tw`text-gray-900 text-lg mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
            No mentors found
          </Text>
          <Text style={[tw`text-gray-600 text-center px-8`, { fontFamily: 'Poppins-Regular' }]}>
            {searchText ? 'Try a different search term' : 'No mentors available at the moment'}
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Mentor Stats Header */}
        <LinearGradient 
          colors={['#6A1B9A', '#4A148C']} 
          style={tw`rounded-2xl p-5 mb-6 shadow-lg border border-purple-200`}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <Text style={[tw`text-white text-lg mb-1`, { fontFamily: 'Poppins-Bold' }]}>
                {filteredMentors.length} Verified Mentors
              </Text>
              <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
                Connect with industry experts
              </Text>
            </View>
            <Award size={28} color="#FFFFFF" />
          </View>
        </LinearGradient>

        {/* Mentors List */}
        <View>
          {filteredMentors.map((mentor) => (
            <MentorCard 
              key={mentor._id} 
              mentor={mentor} 
              onPress={handleMentorPress}
            />
          ))}
        </View>
      </>
    );
  };

  const renderSpotlightTab = () => {
    if (loading) {
      return (
        <View style={tw`py-10 items-center`}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={[tw`text-gray-600 mt-4`, { fontFamily: 'Poppins-Regular' }]}>
            Loading stories...
          </Text>
        </View>
      );
    }

    if (!stories?.length) {
      return (
        <View style={tw`py-10 items-center`}>
          <View style={tw`w-20 h-20 bg-amber-100 rounded-full items-center justify-center mb-4 border border-amber-200`}>
            <TrendingUp size={32} color="#F59E0B" />
          </View>
          <Text style={[tw`text-gray-900 text-lg mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
            No stories yet
          </Text>
          <Text style={[tw`text-gray-600 text-center px-8 mb-6`, { fontFamily: 'Poppins-Regular' }]}>
            Be the first to share your success story!
          </Text>
          
          <TouchableOpacity 
            style={tw`rounded-full overflow-hidden shadow-sm border border-purple-200`}
            onPress={() => setShowStoryModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={['#6A1B9A', '#4A148C']}
              style={tw`py-3.5 px-8`}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                Share Your Story
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* Spotlight Header */}
        <LinearGradient 
          colors={['#F59E0B', '#D97706']} 
          style={tw`rounded-2xl p-5 mb-6 shadow-lg border border-amber-200`}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={tw`flex-row items-center`}>
            <TrendingUp size={32} color="#FFFFFF" />
            <View style={tw`ml-4`}>
              <Text style={[tw`text-white text-lg mb-1`, { fontFamily: 'Poppins-Bold' }]}>
                Weekly Spotlight
              </Text>
              <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
                Inspiring success stories from our community
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stories List */}
        <View>
          {stories.map((story) => (
            <SpotlightCard 
              key={story._id} 
              story={story} 
              onPress={handleStoryPress}
            />
          ))}
        </View>

        {/* Submit Story CTA */}
        <View style={tw`border-2 border-dashed border-purple-200 rounded-2xl p-6 mt-6 bg-purple-50`}>
          <View style={tw`items-center`}>
            <View style={tw`w-14 h-14 bg-purple-100 rounded-full items-center justify-center mb-4 border border-purple-200`}>
              <Plus size={24} color="#6A1B9A" />
            </View>
            <Text style={[tw`text-gray-900 text-lg mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
              Share Your Journey
            </Text>
            <Text style={[tw`text-gray-600 text-sm text-center mb-5`, { fontFamily: 'Poppins-Regular' }]}>
              Inspire others with your success story and connect with aspiring mentees
            </Text>
            
            <TouchableOpacity 
              style={tw`rounded-full overflow-hidden shadow-sm border border-purple-200`}
              onPress={() => setShowStoryModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Submit your success story"
              accessibilityRole="button"
            >
              <LinearGradient 
                colors={['#6A1B9A', '#4A148C']}
                style={tw`py-3.5 px-8`}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                  Submit Your Story
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  return (
    <LinearGradient
      colors={['#F5F3FF', '#FFFFFF']}
      style={tw`flex-1`}
    >
      {/* Header with Back Button */}
      <LinearGradient
        colors={['#4A148C', '#6A1B9A']}
        style={tw`pt-12 pb-6 px-5 rounded-b-[40px] shadow-xl`}
      >
        <View style={tw`flex-row items-center justify-between mb-5`}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/20`}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title */}
          <View style={tw`items-center`}>
            <Text style={[tw`text-white text-2xl`, { fontFamily: 'Poppins-Bold' }]}>
              Mentorship
            </Text>
            <Text style={[tw`text-white/80 text-sm mt-1`, { fontFamily: 'Poppins-Regular' }]}>
              Learn from industry experts
            </Text>
          </View>

          {/* Become Mentor Button */}
          <TouchableOpacity
            onPress={() => setShowBecomeModal(true)}
            style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/20`}
            activeOpacity={0.7}
            accessibilityLabel="Become a mentor"
            accessibilityRole="button"
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={tw`relative`}>
          <Search 
            style={tw`absolute left-4 top-1/2 z-10 transform -translate-y-1/2`} 
            size={20} 
            color="#9CA3AF" 
          />
          <TextInput
            style={[
              tw`bg-white rounded-full pl-12 pr-4 py-3.5 text-gray-900 text-base border border-purple-100`,
              { fontFamily: 'Poppins-Regular' }
            ]}
            placeholder="Search mentors or topics..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search mentors and topics"
          />
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={tw`mx-5 -mt-3 z-10`}>
        <LinearGradient 
          colors={['#F5F3FF', '#FFFFFF']}
          style={tw`rounded-full p-1.5 shadow-lg border border-purple-100`}
        >
          <View style={tw`flex-row`}>
            <TabButton 
              label="Find Mentors" 
              value="mentors" 
              activeTab={activeTab} 
              onPress={setActiveTab} 
            />
            <TabButton 
              label="Success Stories" 
              value="spotlight" 
              activeTab={activeTab} 
              onPress={setActiveTab} 
            />
          </View>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-8 pt-2`}
      >
        <View style={tw`px-5 pt-4`}>
          {activeTab === 'mentors' && renderMentorsTab()}
          {activeTab === 'spotlight' && renderSpotlightTab()}
        </View>
      </ScrollView>

      {/* Modals */}
      <BecomeMentorModal
        visible={showBecomeModal}
        onClose={() => setShowBecomeModal(false)}
      />

      <ShareStoryModal
        visible={showStoryModal}
        onClose={() => setShowStoryModal(false)}
      />
    </LinearGradient>
  );
}