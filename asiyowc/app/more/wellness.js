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
  Heart,
  Smile,
  Meh,
  Frown,
  Calendar,
  MapPin,
  Users,
  Play,
  Moon,
  Sun,
  Sparkles,
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
        tw`flex-1 px-3 py-2 rounded-full`,
        isActive && tw`bg-white`,
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        tw`text-center text-sm`, 
        { fontFamily: 'Poppins-Regular' },
        isActive ? tw`text-purple-600` : tw`text-gray-600`
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const MoodButton = React.memo(({ icon: Icon, label, color, onPress }) => (
  <TouchableOpacity
    style={tw`items-center p-3 rounded-lg`}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[
      tw`w-12 h-12 rounded-full items-center justify-center`,
      { backgroundColor: color.bg }
    ]}>
      <Icon size={24} color={color.icon} />
    </View>
    <Text style={[tw`text-xs text-gray-700 mt-2`, { fontFamily: 'Poppins-Regular' }]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const RetreatCard = React.memo(({ retreat }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-2xl overflow-hidden shadow-sm mb-4`}
  >
    <View style={tw`h-48 relative`}>
      <Image
        source={{ uri: retreat.image }}
        style={tw`w-full h-full`}
      />
      <View style={tw`absolute top-3 right-3 bg-purple-600 px-3 py-1 rounded-full`}>
        <Text style={[tw`text-white text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
          {retreat.type}
        </Text>
      </View>
    </View>
    <View style={tw`p-4`}>
      <Text style={[tw`text-purple-900 text-lg mb-3`, { fontFamily: 'Poppins-SemiBold' }]}>
        {retreat.title}
      </Text>
      
      <View style={tw`mb-4`}>
        <View style={tw`flex-row items-center mb-2`}>
          <MapPin size={16} color="#6B7280" />
          <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
            {retreat.location}
          </Text>
        </View>
        <View style={tw`flex-row items-center mb-2`}>
          <Calendar size={16} color="#6B7280" />
          <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
            {retreat.dates}
          </Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Users size={16} color="#6B7280" />
          <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
            {retreat.participants}/{retreat.maxCapacity} participants
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`rounded-xl p-3 mb-3`}
      >
        <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
          Investment
        </Text>
        <Text style={[tw`text-purple-900 text-xl`, { fontFamily: 'Poppins-Bold' }]}>
          {retreat.price}
        </Text>
      </LinearGradient>

      <TouchableOpacity
        style={tw`rounded-full overflow-hidden shadow-lg`}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#7C3AED', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`py-4 items-center`}
        >
          <Text style={[tw`text-white text-lg`, { fontFamily: 'Poppins-SemiBold' }]}>
            Reserve Your Spot
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </Animated.View>
));

const TravelCircleCard = React.memo(({ circle }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 shadow-sm mb-3`}
  >
    <View style={tw`items-start justify-between mb-3`}>
      <View style={tw`flex-row items-start justify-between w-full`}>
        <View>
          <Text style={[tw`text-purple-900 text-lg mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
            🌍 {circle.destination}
          </Text>
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            Organized by {circle.organizer}
          </Text>
        </View>
        <View style={tw`bg-green-100 px-3 py-1 rounded-full`}>
          <Text style={[tw`text-green-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
            {circle.targetMembers - circle.members} spots left
          </Text>
        </View>
      </View>
    </View>

    <View style={tw`flex-row mb-4`}>
      <View style={tw`w-1/2 pr-1`}>
        <LinearGradient
          colors={['#F5F3FF', '#FFFFFF']}
          style={tw`rounded-xl p-3`}
        >
          <Text style={[tw`text-gray-600 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
            Group Size
          </Text>
          <Text style={[tw`text-purple-900`, { fontFamily: 'Poppins-SemiBold' }]}>
            {circle.members}/{circle.targetMembers} members
          </Text>
        </LinearGradient>
      </View>
      <View style={tw`w-1/2 pl-1`}>
        <LinearGradient
          colors={['#FFFBEB', '#FFFFFF']}
          style={tw`rounded-xl p-3`}
        >
          <Text style={[tw`text-gray-600 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
            Departure
          </Text>
          <Text style={[tw`text-amber-900`, { fontFamily: 'Poppins-SemiBold' }]}>
            {circle.departureDate}
          </Text>
        </LinearGradient>
      </View>
    </View>

    <LinearGradient
      colors={['#EFF6FF', '#FFFFFF']}
      style={tw`rounded-xl p-3 mb-3`}
    >
      <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
        Estimated Budget
      </Text>
      <Text style={[tw`text-blue-700`, { fontFamily: 'Poppins-SemiBold' }]}>
        {circle.budget}
      </Text>
    </LinearGradient>

    <TouchableOpacity
      style={tw`bg-purple-600 rounded-full py-3 items-center`}
      activeOpacity={0.8}
    >
      <Text style={[tw`text-white text-lg`, { fontFamily: 'Poppins-SemiBold' }]}>
        Join Circle
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

const VirtualSessionCard = React.memo(({ session }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 shadow-sm mb-3`}
  >
    <View style={tw`flex-row items-center`}>
      <View style={tw`w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-3`}>
        <Play size={24} color="#7C3AED" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
          {session.title}
        </Text>
        <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
          {session.instructor}
        </Text>
        <View style={tw`flex-row items-center`}>
          <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
            {session.duration}
          </Text>
          <Text style={[tw`text-gray-500 text-xs mx-2`, { fontFamily: 'Poppins-Regular' }]}>
            •
          </Text>
          <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
            {session.participants} completed
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={tw`rounded-full overflow-hidden`}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#7C3AED', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`px-4 py-2`}
        >
          <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
            Start
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </Animated.View>
));

export default function WellnessScreen() {
  const [activeTab, setActiveTab] = useState('journal');
  const [journalText, setJournalText] = useState('');

  const retreats = [
    {
      id: 1,
      title: "Healing Safari Kenya",
      location: "Maasai Mara, Kenya",
      dates: "Jan 20-25, 2026",
      participants: 12,
      maxCapacity: 15,
      price: "Ksh 120,000",
      image: "https://images.unsplash.com/photo-1758274539654-23fa349cc090?w=400",
      type: "Women-Only Retreat"
    },
    {
      id: 2,
      title: "Coastal Wellness Escape",
      location: "Diani Beach, Kenya",
      dates: "Feb 10-14, 2026",
      participants: 8,
      maxCapacity: 12,
      price: "Ksh 85,000",
      image: "https://images.unsplash.com/photo-1573496267526-08a69e46a409?w=400",
      type: "Women-Only Retreat"
    }
  ];

  const travelCircles = [
    {
      id: 1,
      destination: "Morocco",
      organizer: "Sarah Johnson",
      members: 6,
      targetMembers: 8,
      departureDate: "March 2026",
      budget: "Ksh 150,000 per person"
    },
    {
      id: 2,
      destination: "South Africa",
      organizer: "Grace Mutua",
      members: 4,
      targetMembers: 10,
      departureDate: "April 2026",
      budget: "Ksh 200,000 per person"
    }
  ];

  const virtualSessions = [
    {
      id: 1,
      title: "Morning Meditation",
      duration: "15 min",
      instructor: "Dr. Amina Hassan",
      type: "Meditation",
      participants: 234
    },
    {
      id: 2,
      title: "Gentle Yoga Flow",
      duration: "30 min",
      instructor: "Grace Wanjiru",
      type: "Yoga",
      participants: 456
    },
    {
      id: 3,
      title: "Breathwork for Anxiety",
      duration: "20 min",
      instructor: "Sarah Johnson",
      type: "Breathwork",
      participants: 189
    }
  ];

  const moodOptions = [
    {
      icon: Smile,
      label: "Great",
      color: { bg: '#D1FAE5', icon: '#10B981' }
    },
    {
      icon: Smile,
      label: "Good",
      color: { bg: '#DBEAFE', icon: '#3B82F6' }
    },
    {
      icon: Meh,
      label: "Okay",
      color: { bg: '#FEF3C7', icon: '#F59E0B' }
    },
    {
      icon: Frown,
      label: "Low",
      color: { bg: '#FEE2E2', icon: '#EF4444' }
    }
  ];

  const renderJournalTab = () => (
    <>
      <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={tw`rounded-2xl p-6 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center mb-4`}>
          <Heart size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white text-lg mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Daily Check-In
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              How are you feeling today?
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Mood Tracker */}
      <View style={tw`bg-white rounded-xl p-4 mb-4 shadow-sm`}>
        <Text style={[tw`text-purple-900 mb-3`, { fontFamily: 'Poppins-Bold' }]}>
          Track Your Mood
        </Text>
        <View style={tw`flex-row`}>
          {moodOptions.map((mood, index) => (
            <View key={index} style={tw`w-1/4 px-1`}>
              <MoodButton {...mood} />
            </View>
          ))}
        </View>
      </View>

      {/* Journal Entry */}
      <View style={tw`bg-white rounded-xl p-4 mb-4 shadow-sm`}>
        <Text style={[tw`text-purple-900 mb-3`, { fontFamily: 'Poppins-Bold' }]}>
          Today's Reflection
        </Text>
        <TextInput
          style={[tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 h-40 mb-3`, 
            { fontFamily: 'Poppins-Regular', textAlignVertical: 'top' }
          ]}
          placeholder="Write your thoughts, gratitude, or feelings here..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={journalText}
          onChangeText={setJournalText}
        />
        <TouchableOpacity
          style={tw`rounded-full overflow-hidden shadow-lg`}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`py-4 items-center`}
          >
            <Text style={[tw`text-white text-lg`, { fontFamily: 'Poppins-SemiBold' }]}>
              Save Entry
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Daily Affirmation */}
      <View style={tw`border border-amber-200 rounded-2xl p-6 shadow-sm bg-gradient-to-r from-amber-50 to-purple-50 mb-4`}>
        <View style={tw`flex-row items-start`}>
          <Sparkles size={24} color="#7C3AED" style={tw`mr-3`} />
          <View>
            <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
              Today's Affirmation
            </Text>
            <Text style={[tw`text-purple-900 italic leading-5`, { fontFamily: 'Poppins-Italic' }]}>
              "I am strong, capable, and worthy of all the good things life has to offer. My journey is unique and valuable."
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderRetreatsTab = () => (
    <>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <Text style={[tw`text-white mb-2`, { fontFamily: 'Poppins-Bold' }]}>
          Women-Only Retreats
        </Text>
        <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Safe, healing spaces designed for sisterhood and renewal
        </Text>
      </LinearGradient>

      <View>
        {retreats.map((retreat, index) => (
          <View key={`retreat-${retreat.id}`} style={index > 0 && tw`mt-4`}>
            <RetreatCard retreat={retreat} />
          </View>
        ))}
      </View>
    </>
  );

  const renderTravelTab = () => (
    <>
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <Text style={[tw`text-white mb-2`, { fontFamily: 'Poppins-Bold' }]}>
          Safe Travel Circles
        </Text>
        <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Plan and travel with verified sisters worldwide
        </Text>
      </LinearGradient>

      <View>
        {travelCircles.map((circle, index) => (
          <View key={`circle-${circle.id}`} style={index > 0 && tw`mt-3`}>
            <TravelCircleCard circle={circle} />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={tw`border-2 border-dashed border-purple-300 rounded-2xl p-6 items-center mb-4`}
        activeOpacity={0.7}
      >
        <View style={tw`w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-3`}>
          <MapPin size={24} color="#7C3AED" />
        </View>
        <Text style={[tw`text-purple-900 mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
          Create Travel Circle
        </Text>
        <Text style={[tw`text-gray-600 text-sm text-center`, { fontFamily: 'Poppins-Regular' }]}>
          Start planning your dream trip with sisters
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderVirtualTab = () => (
    <>
      <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={tw`rounded-2xl p-6 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View>
            <Text style={[tw`text-white text-lg mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Virtual Retreat Mode
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Wellness at your fingertips
            </Text>
          </View>
          <Moon size={32} color="#FFFFFF" />
        </View>
      </LinearGradient>

      <View style={tw`mb-6`}>
        {virtualSessions.map((session, index) => (
          <View key={`session-${session.id}`} style={index > 0 && tw`mt-3`}>
            <VirtualSessionCard session={session} />
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={tw`flex-row`}>
        <View style={tw`w-1/2 pr-1`}>
          <TouchableOpacity
            style={tw`bg-white rounded-xl p-4 items-center shadow-sm`}
            activeOpacity={0.7}
          >
            <View style={tw`w-12 h-12 bg-amber-100 rounded-full items-center justify-center mb-2`}>
              <Sun size={24} color="#F59E0B" />
            </View>
            <Text style={[tw`text-purple-900 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Morning Routine
            </Text>
          </TouchableOpacity>
        </View>
        <View style={tw`w-1/2 pl-1`}>
          <TouchableOpacity
            style={tw`bg-white rounded-xl p-4 items-center shadow-sm`}
            activeOpacity={0.7}
          >
            <View style={tw`w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2`}>
              <Moon size={24} color="#3B82F6" />
            </View>
            <Text style={[tw`text-purple-900 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Evening Wind Down
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={[tw`text-white text-2xl mb-2`, { fontFamily: 'Poppins-Bold' }]}>
          Wellness & Travel
        </Text>
        <Text style={[tw`text-purple-200 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Nurture your mind, body, and spirit
        </Text>
      </LinearGradient>

      {/* Tab Navigation */}
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`mx-4 mt-4 rounded-full p-1 shadow-sm`}
      >
        <View style={tw`flex-row`}>
          <TabButton
            label="Journal"
            value="journal"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Retreats"
            value="retreats"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Travel"
            value="travel"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Virtual"
            value="virtual"
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
          {activeTab === 'journal' && renderJournalTab()}
          {activeTab === 'retreats' && renderRetreatsTab()}
          {activeTab === 'travel' && renderTravelTab()}
          {activeTab === 'virtual' && renderVirtualTab()}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}