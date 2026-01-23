import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Users,
  Video,
  Clock,
  Bell,
  Share2,
  Shuffle,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import tw from "../../utils/tw";

// Animated pulse component
const AnimatedPulseDot = () => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.5, { duration: 1200 }),
      -1, // infinite repetitions
      true // reverse animation
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.6,
  }));

  return (
    <Animated.View
      style={[
        tw`absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full`,
        pulseStyle,
      ]}
    />
  );
};

// Memoized subcomponents
const EventCard = React.memo(({ event }) => (
  <Animated.View 
    entering={FadeInDown}
    style={[
      tw`bg-white rounded-2xl overflow-hidden shadow-sm mb-4`,
      event.featured && tw`border-2 border-amber-300`,
    ]}
  >
    {event.featured && (
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`px-4 py-2 flex-row items-center`}
      >
        <Sparkles size={16} color="#FFFFFF" />
        <View style={tw`w-2`} />
        <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Featured Event
        </Text>
      </LinearGradient>
    )}
    
    <View style={tw`h-48 relative`}>
      <Image
        source={{ uri: event.image }}
        style={tw`w-full h-full`}
      />
      <View style={tw`absolute top-3 right-3 bg-purple-600 px-3 py-1 rounded-full`}>
        <Text style={[tw`text-white text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
          {event.category}
        </Text>
      </View>
    </View>
    
    <View style={tw`p-4`}>
      <Text style={[tw`text-purple-900 text-lg mb-3`, { fontFamily: 'Poppins-SemiBold' }]}>
        {event.title}
      </Text>
      
      {/* Fixed gap usage with margins */}
      <View style={tw`mb-4`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {event.date}
          </Text>
        </View>
        <View style={tw`flex-row items-center mb-2`}>
          <Clock size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {event.time}
          </Text>
        </View>
        <View style={tw`flex-row items-center mb-2`}>
          <MapPin size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {event.type}
          </Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Users size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {event.attendees} attending
          </Text>
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
            <Bell size={16} color="#FFFFFF" />
            <View style={tw`w-2`} />
            <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
              RSVP
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={tw`w-2`} />
        
        <TouchableOpacity
          style={tw`w-12 h-12 border border-gray-300 rounded-full items-center justify-center`}
          activeOpacity={0.7}
        >
          <Share2 size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>
));

const LiveEventBanner = React.memo(({ event }) => (
  <LinearGradient
    colors={['#EF4444', '#EC4899']}
    style={tw`rounded-2xl p-4 mt-4 shadow-lg`}
  >
    <TouchableOpacity activeOpacity={0.9}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`relative`}>
          <View style={tw`w-12 h-12 bg-white/20 rounded-full items-center justify-center`}>
            <Video size={24} color="#FFFFFF" />
          </View>
          <AnimatedPulseDot />
        </View>
        <View style={tw`w-3`} />
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center mb-1`}>
            <View style={tw`bg-red-600 px-2 py-1 rounded-full`}>
              <Text style={[tw`text-white text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
                LIVE
              </Text>
            </View>
            <View style={tw`w-2`} />
            <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              {event.viewers} watching
            </Text>
          </View>
          <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
            {event.title}
          </Text>
          <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            Hosted by {event.host}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  </LinearGradient>
));

const NetworkingRoulette = React.memo(() => (
  <LinearGradient
    colors={['#7C3AED', '#6D28D9']}
    style={tw`rounded-2xl p-6 mt-4 shadow-lg`}
  >
    <View style={tw`flex-row items-center justify-between mb-4`}>
      <View>
        <Text style={[tw`text-white text-xl mb-1`, { fontFamily: 'Poppins-Bold' }]}>
          Networking Roulette
        </Text>
        <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Connect with a random sister globally
        </Text>
      </View>
      <Shuffle size={32} color="#FFFFFF" />
    </View>
    
    <TouchableOpacity
      style={tw`bg-white rounded-full overflow-hidden shadow-lg`}
      activeOpacity={0.8}
    >
      <View style={tw`py-4 items-center`}>
        <Text style={[tw`text-purple-600 text-lg`, { fontFamily: 'Poppins-SemiBold' }]}>
          Find a Match
        </Text>
      </View>
    </TouchableOpacity>
  </LinearGradient>
));

export default function EventsScreen() {
  const upcomingEvents = [
    {
      id: 1,
      title: "Global Women Leadership Summit",
      date: "Dec 15, 2025",
      time: "2:00 PM - 5:00 PM EST",
      type: "Virtual",
      attendees: 2345,
      image: "https://images.unsplash.com/flagged/photo-1570562119798-a4b2a542fe3b?w=400",
      category: "Leadership",
      featured: true
    },
    {
      id: 2,
      title: "Financial Freedom Workshop",
      date: "Dec 20, 2025",
      time: "10:00 AM - 12:00 PM GMT",
      type: "Virtual",
      attendees: 567,
      image: "https://images.unsplash.com/photo-1573496267526-08a69e46a409?w=400",
      category: "Finance",
      featured: false
    },
    {
      id: 3,
      title: "Wellness & Healing Retreat",
      date: "Jan 10, 2026",
      time: "All Day",
      type: "In-Person · Nairobi, Kenya",
      attendees: 120,
      image: "https://images.unsplash.com/photo-1758274539654-23fa349cc090?w=400",
      category: "Wellness",
      featured: false
    }
  ];

  const liveEvents = [
    {
      id: 1,
      title: "Sisterhood Networking Hour",
      viewers: 324,
      host: "Dr. Sarah Johnson"
    }
  ];

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
          Events & Conferences
        </Text>
        <Text style={[tw`text-purple-200 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Connect, learn, and grow together
        </Text>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`px-4 pb-8`}>
          {/* Live Events Banner */}
          {liveEvents.length > 0 && (
            <LiveEventBanner event={liveEvents[0]} />
          )}

          {/* Networking Roulette */}
          <NetworkingRoulette />

          {/* Upcoming Events */}
          <Text style={[tw`text-purple-900 text-xl mt-6 mb-4`, { fontFamily: 'Poppins-Bold' }]}>
            Upcoming Events
          </Text>
          
          <View>
            {upcomingEvents.map((event, index) => (
              <View key={`event-${event.id}`} style={index > 0 && tw`mt-4`}>
                <EventCard event={event} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}