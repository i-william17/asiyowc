import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import {
  Search,
  Star,
  Video,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import tw from "../../utils/tw";

// Tab Components
const TabButton = React.memo(({ label, value, activeTab, onPress }) => {
  const isActive = activeTab === value;
  
  return (
    <TouchableOpacity
      style={[
        tw`flex-1 px-4 py-2 rounded-full`,
        isActive && tw`bg-white`,
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        tw`text-center`, 
        { fontFamily: 'Poppins-Regular' },
        isActive ? tw`text-purple-600` : tw`text-gray-600`
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// Mentor Card Component
const MentorCard = React.memo(({ mentor }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl shadow-sm mb-4`}
  >
    <View style={tw`p-4`}>
      <View style={tw`flex-row items-center mb-4`}>
        <View style={tw`relative`}>
          <View style={tw`w-16 h-16 rounded-full overflow-hidden bg-purple-100`}>
            <Image
              source={{ uri: mentor.avatar }}
              style={tw`w-full h-full`}
            />
          </View>
          {mentor.verified && (
            <View style={tw`absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full items-center justify-center border-2 border-white`}>
              <Award size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={tw`ml-3 flex-1 min-w-0`}>
          <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
            {mentor.name}
          </Text>
          <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
            {mentor.title}
          </Text>
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-row items-center mr-2`}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={[tw`text-sm ml-1`, { fontFamily: 'Poppins-SemiBold' }]}>
                {mentor.rating}
              </Text>
            </View>
            <View style={tw`bg-purple-100 px-3 py-1 rounded-full`}>
              <Text style={[tw`text-purple-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
                {mentor.specialty}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={tw`flex-row mb-4`}>
        <View style={tw`flex-1 pr-1`}>
          <LinearGradient
            colors={['#F5F3FF', '#FFFFFF']}
            style={tw`rounded-lg p-2 items-center`}
          >
            <Text style={[tw`text-purple-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              {mentor.experience}
            </Text>
            <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
              Experience
            </Text>
          </LinearGradient>
        </View>
        <View style={tw`flex-1 px-1`}>
          <LinearGradient
            colors={['#FFFBEB', '#FFFFFF']}
            style={tw`rounded-lg p-2 items-center`}
          >
            <Text style={[tw`text-amber-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              {mentor.mentees}
            </Text>
            <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
              Mentees
            </Text>
          </LinearGradient>
        </View>
        <View style={tw`flex-1 pl-1`}>
          <LinearGradient
            colors={['#F0FDF4', '#FFFFFF']}
            style={tw`rounded-lg p-2 items-center`}
          >
            <Text style={[tw`text-green-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              {mentor.sessions}
            </Text>
            <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
              Sessions
            </Text>
          </LinearGradient>
        </View>
      </View>

      <View style={tw`flex-row`}>
        <TouchableOpacity
          style={tw`flex-1 rounded-full overflow-hidden shadow-sm`}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`py-3 flex-row items-center justify-center`}
          >
            <Calendar size={16} color="#FFFFFF" />
            <Text style={[tw`text-white ml-2`, { fontFamily: 'Poppins-SemiBold' }]}>
              Book Session
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={tw`w-2`} />
        
        <TouchableOpacity
          style={tw`w-12 h-12 border border-gray-300 rounded-full items-center justify-center`}
          activeOpacity={0.7}
        >
          <MessageCircle size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>
));

// Spotlight Story Card Component
const SpotlightCard = React.memo(({ story }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl overflow-hidden shadow-sm mb-4`}
  >
    <TouchableOpacity activeOpacity={0.9}>
      <View style={tw`h-48 relative`}>
        <Image
          source={{ uri: story.image }}
          style={tw`w-full h-full`}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={tw`absolute inset-0`}
        />
        <View style={tw`absolute bottom-4 left-4 right-4`}>
          <Text style={[tw`text-white text-xl mb-1`, { fontFamily: 'Poppins-Bold' }]}>
            {story.achievement}
          </Text>
          <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {story.name}
          </Text>
        </View>
      </View>
      <View style={tw`p-4`}>
        <Text style={[tw`text-gray-700 mb-3`, { fontFamily: 'Poppins-Regular' }]}>
          {story.story}
        </Text>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center`}>
            <Star size={16} color="#6B7280" />
            <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
              {story.views.toLocaleString()} views
            </Text>
          </View>
          <TouchableOpacity
            style={tw`border border-gray-300 rounded-full px-4 py-2`}
            activeOpacity={0.7}
          >
            <Text style={[tw`text-gray-700 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
              Read Story
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Animated.View>
));

// Session Card Component
const SessionCard = React.memo(({ session }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm mb-3`}
  >
    <View style={tw`items-start justify-between mb-3`}>
      <View>
        <View style={tw`bg-green-100 px-3 py-1 rounded-full mb-2 self-start`}>
          <Text style={[tw`text-green-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
            Upcoming
          </Text>
        </View>
        <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
          {session.topic}
        </Text>
        <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
          with {session.mentor}
        </Text>
      </View>
    </View>

    <LinearGradient
      colors={['#F5F3FF', '#FFFFFF']}
      style={tw`rounded-xl p-3 mb-3`}
    >
      <View style={tw`flex-row items-center mb-2`}>
        <Calendar size={16} color="#6B7280" />
        <Text style={[tw`text-gray-700 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
          {session.date}
        </Text>
      </View>
      <View style={tw`flex-row items-center`}>
        <BookOpen size={16} color="#6B7280" />
        <Text style={[tw`text-gray-700 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
          {session.attendees} registered
        </Text>
      </View>
    </LinearGradient>

    <TouchableOpacity
      style={tw`rounded-full overflow-hidden shadow-sm`}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#7C3AED', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`py-3 items-center`}
      >
        <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
          Register Now
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  </Animated.View>
));

export default function MentorshipScreen() {
  const [activeTab, setActiveTab] = useState('mentors');
  const [searchText, setSearchText] = useState('');

  const mentors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      title: "CEO & Leadership Coach",
      specialty: "Leadership & Strategy",
      experience: "15+ years",
      mentees: 234,
      rating: 4.9,
      sessions: 1200,
      avatar: "https://images.unsplash.com/flagged/photo-1570562119798-a4b2a542fe3b?w=200",
      verified: true,
      price: "Free"
    },
    {
      id: 2,
      name: "Amina Khalid",
      title: "Tech Entrepreneur",
      specialty: "Entrepreneurship & Tech",
      experience: "10+ years",
      mentees: 156,
      rating: 4.8,
      sessions: 890,
      avatar: "https://images.unsplash.com/photo-1562071707-7249ab429b2a?w=200",
      verified: true,
      price: "Free"
    },
    {
      id: 3,
      name: "Grace Mutua",
      title: "Financial Advisor",
      specialty: "Finance & Investment",
      experience: "12+ years",
      mentees: 198,
      rating: 4.9,
      sessions: 1050,
      avatar: "https://images.unsplash.com/photo-1573496267526-08a69e46a409?w=200",
      verified: true,
      price: "Free"
    }
  ];

  const spotlightStories = [
    {
      id: 1,
      name: "Wanjiru Kamau",
      achievement: "From Zero to Ksh 100M Revenue",
      story: "How mentorship helped me scale my business",
      image: "https://images.unsplash.com/photo-1678082310070-26bdadc06a34?w=400",
      views: 12400
    },
    {
      id: 2,
      name: "Fatima Ahmed",
      achievement: "Breaking Barriers in Tech",
      story: "My journey to becoming a CTO",
      image: "https://images.unsplash.com/photo-1758274539654-23fa349cc090?w=400",
      views: 9800
    }
  ];

  const upcomingSessions = [
    {
      id: 1,
      mentor: "Dr. Sarah Johnson",
      topic: "Leadership in Crisis",
      date: "Tomorrow, 3:00 PM",
      attendees: 45
    }
  ];

  const renderMentorsTab = () => (
    <>
      <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <Text style={[tw`text-white mb-2`, { fontFamily: 'Poppins-Bold' }]}>
          Verified Mentors
        </Text>
        <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          All mentors are verified leaders and experts in their fields
        </Text>
      </LinearGradient>

      <View>
        {mentors.map((mentor, index) => (
          <View key={`mentor-${mentor.id}`} style={index > 0 && tw`mt-4`}>
            <MentorCard mentor={mentor} />
          </View>
        ))}
      </View>
    </>
  );

  const renderSpotlightTab = () => (
    <>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <TrendingUp size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Weekly Spotlight
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Inspiring stories from our community
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {spotlightStories.map((story, index) => (
          <View key={`story-${story.id}`} style={index > 0 && tw`mt-4`}>
            <SpotlightCard story={story} />
          </View>
        ))}
      </View>

      {/* Become a Spotlight */}
      <View style={tw`border-2 border-dashed border-purple-300 rounded-2xl p-6 mt-4 items-center`}>
        <View style={tw`w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-3`}>
          <Star size={24} color="#7C3AED" />
        </View>
        <Text style={[tw`text-purple-900 mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
          Share Your Story
        </Text>
        <Text style={[tw`text-gray-600 text-sm text-center mb-4`, { fontFamily: 'Poppins-Regular' }]}>
          Inspire others with your journey and achievements
        </Text>
        <TouchableOpacity
          style={tw`rounded-full overflow-hidden shadow-sm`}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`py-3 px-6 items-center`}
          >
            <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
              Submit Story
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSessionsTab = () => (
    <>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <Video size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Live Sessions
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Join live mentorship sessions
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {upcomingSessions.map((session, index) => (
          <View key={`session-${session.id}`} style={index > 0 && tw`mt-3`}>
            <SessionCard session={session} />
          </View>
        ))}
      </View>

      {/* My Booked Sessions */}
      <Text style={[tw`text-purple-900 text-lg mt-6 mb-3`, { fontFamily: 'Poppins-Bold' }]}>
        My Booked Sessions
      </Text>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`rounded-2xl p-6 items-center`}
      >
        <Calendar size={48} color="#A78BFA" style={tw`mb-2`} />
        <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          No upcoming sessions
        </Text>
      </LinearGradient>
    </>
  );

  return (
    <LinearGradient
      colors={['#F5F3FF', '#FFFFFF', '#FFFBEB']}
      style={tw`flex-1`}
    >
      {/* Header with curved bottom */}
      <LinearGradient
        colors={['#4C1D95', '#5B21B6']}
        style={tw`pt-12 pb-5 px-4 rounded-b-[40px] shadow-lg`}
      >
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View>
            <Text style={[tw`text-white text-2xl`, { fontFamily: 'Poppins-Bold' }]}>
              Mentorship
            </Text>
            <Text style={[tw`text-purple-200 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Learn from the best
            </Text>
          </View>
          <TouchableOpacity
            style={tw`rounded-full overflow-hidden shadow-lg`}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C3AED', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`px-4 py-2 flex-row items-center`}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={[tw`text-white ml-1 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                Become a Mentor
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={tw`relative`}>
          <Search style={tw`absolute left-3 top-1/2 transform -translate-y-1/2`} size={16} color="#9CA3AF" />
          <TextInput
            style={[
              tw`bg-white rounded-full pl-10 pr-4 py-3 text-gray-800`,
              { fontFamily: 'Poppins-Regular' }
            ]}
            placeholder="Search mentors or topics..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`mx-4 mt-4 rounded-full p-1 shadow-sm`}
      >
        <View style={tw`flex-row`}>
          <TabButton
            label="Find Mentors"
            value="mentors"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Spotlight"
            value="spotlight"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Sessions"
            value="sessions"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`px-4 pb-8 pt-4`}>
          {activeTab === 'mentors' && renderMentorsTab()}
          {activeTab === 'spotlight' && renderSpotlightTab()}
          {activeTab === 'sessions' && renderSessionsTab()}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}