import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Globe,
  TrendingUp,
  Users,
  Award,
  Heart,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import tw from "../../utils/tw";

// Memoized subcomponents
const RegionalCard = React.memo(({ region }) => {
  const percentage = (region.members / 50234) * 100;
  return (
    <View style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm`}>
      <View style={tw`flex-row items-center mb-3`}>
        <Text style={tw`text-3xl mr-3`}>{region.flag}</Text>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-purple-900`, { fontFamily: 'Poppins-SemiBold' }]}>
            {region.country}
          </Text>
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            {region.region}
          </Text>
        </View>
        <View style={tw`bg-green-100 px-3 py-1 rounded-full flex-row items-center`}>
          <TrendingUp size={12} color="#10B981" />
          <Text style={[tw`text-green-700 text-xs ml-1`, { fontFamily: 'Poppins-SemiBold' }]}>
            +{region.growth}%
          </Text>
        </View>
      </View>
      <View style={tw`mb-2`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
            Members
          </Text>
          <Text style={[tw`text-purple-600 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
            {region.members.toLocaleString()}
          </Text>
        </View>
        <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <View 
            style={[tw`h-full bg-purple-500`, { width: `${Math.min(percentage, 100)}%` }]} 
          />
        </View>
      </View>
    </View>
  );
});

const AchievementCard = React.memo(({ achievement, categoryIcons }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm`}
  >
    <View style={tw`flex-row items-start`}>
      <View style={[tw`w-12 h-12 bg-purple-100 rounded-full items-center justify-center`, { flexShrink: 0 }]}>
        <Text style={tw`text-2xl`}>{categoryIcons[achievement.category]}</Text>
      </View>
      <View style={tw`flex-1 ml-3`}>
        <View style={tw`flex-row items-start justify-between mb-2`}>
          <Text style={[tw`text-purple-900`, { fontFamily: 'Poppins-SemiBold' }]}>
            {achievement.name}
          </Text>
          <View style={tw`bg-purple-100 px-3 py-1 rounded-full`}>
            <Text style={[tw`text-purple-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
              {achievement.category}
            </Text>
          </View>
        </View>
        <Text style={[tw`text-gray-700 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
          {achievement.achievement}
        </Text>
        <View style={tw`flex-row items-center`}>
          <MapPin size={12} color="#6B7280" />
          <Text style={[tw`text-gray-500 text-xs ml-1`, { fontFamily: 'Poppins-Regular' }]}>
            {achievement.location}
          </Text>
          <Text style={[tw`text-gray-500 text-xs mx-2`, { fontFamily: 'Poppins-Regular' }]}>
            •
          </Text>
          <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
            {achievement.date}
          </Text>
        </View>
      </View>
    </View>
  </Animated.View>
));

const ImpactCategoryCard = React.memo(({ title, value, description, icon: Icon, color, gradient }) => (
  <LinearGradient
    colors={gradient}
    style={tw`rounded-xl p-4 shadow-sm`}
  >
    <View style={tw`flex-row items-center mb-2`}>
      <Icon size={20} color={getColorFromText(color)} />
      <Text style={[tw`text-gray-700 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
        {title}
      </Text>
    </View>
    <Text style={[
      tw`text-2xl mb-1`, 
      { fontFamily: 'Poppins-Bold', color: getColorFromText(color) }
    ]}>
      {value}
    </Text>
    <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
      {description}
    </Text>
  </LinearGradient>
));

// Helper function to convert Tailwind color classes to actual colors
const getColorFromText = (colorClass) => {
  const colorMap = {
    'text-purple-900': '#4C1D95',
    'text-amber-900': '#92400E',
    'text-green-900': '#064E3B',
    'text-blue-900': '#1E3A8A',
  };
  return colorMap[colorClass] || '#4C1D95';
};

export default function ImpactTrackerScreen() {
  const globalStats = {
    totalMembers: 50234,
    activeGroups: 1243,
    programsCompleted: 8956,
    savingsGoals: 12340000,
    mentorshipSessions: 15678
  };

  const regionalImpact = [
    { region: "East Africa", country: "Kenya", members: 12453, growth: 23, flag: "🇰🇪" },
    { region: "West Africa", country: "Nigeria", members: 18921, growth: 34, flag: "🇳🇬" },
    { region: "Southern Africa", country: "South Africa", members: 8234, growth: 18, flag: "🇿🇦" },
    { region: "East Africa", country: "Tanzania", members: 3421, growth: 45, flag: "🇹🇿" },
    { region: "West Africa", country: "Ghana", members: 4123, growth: 28, flag: "🇬🇭" },
    { region: "North America", country: "USA", members: 2456, growth: 12, flag: "🇺🇸" },
    { region: "Europe", country: "UK", members: 626, growth: 15, flag: "🇬🇧" }
  ];

  const recentAchievements = [
    {
      id: 1,
      name: "Wanjiru Kamau",
      achievement: "Launched tech startup with $500K funding",
      location: "Nairobi, Kenya",
      date: "2 days ago",
      category: "Entrepreneurship"
    },
    {
      id: 2,
      name: "Fatima Ahmed",
      achievement: "Became CTO at major tech company",
      location: "Lagos, Nigeria",
      date: "1 week ago",
      category: "Leadership"
    },
    {
      id: 3,
      name: "Grace Mutua",
      achievement: "Completed PhD in Economics",
      location: "Johannesburg, South Africa",
      date: "2 weeks ago",
      category: "Education"
    }
  ];

  const categoryIcons = {
    Entrepreneurship: "🚀",
    Leadership: "👑",
    Education: "🎓",
    Advocacy: "📣",
    Finance: "💰"
  };

  const impactCategories = [
    {
      title: "Leadership",
      value: "2,345",
      description: "Women in leadership roles",
      icon: Users,
      color: "text-purple-900",
      gradient: ['#F5F3FF', '#FFFFFF']
    },
    {
      title: "Businesses",
      value: "1,234",
      description: "Businesses launched",
      icon: Award,
      color: "text-amber-900",
      gradient: ['#FFFBEB', '#FFFFFF']
    },
    {
      title: "Mentorship",
      value: "15,678",
      description: "Sessions completed",
      icon: Heart,
      color: "text-green-900",
      gradient: ['#F0FDF4', '#FFFFFF']
    },
    {
      title: "Education",
      value: "8,956",
      description: "Degrees & certs earned",
      icon: Sparkles,
      color: "text-blue-900",
      gradient: ['#EFF6FF', '#FFFFFF']
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
        <View style={tw`flex-row items-center mb-2`}>
          <Globe size={24} color="#FFFFFF" />
          <Text style={[tw`text-white text-2xl ml-3`, { fontFamily: 'Poppins-Bold' }]}>
            Global Impact Tracker
          </Text>
        </View>
        <Text style={[tw`text-purple-200 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
          Women's achievements worldwide
        </Text>
      </LinearGradient>

      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`px-4 pb-8`}>
          {/* Global Stats Overview */}
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            style={tw`rounded-2xl p-6 mt-4 shadow-lg`}
          >
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={[tw`text-white text-xl`, { fontFamily: 'Poppins-Bold' }]}>
                Global Community
              </Text>
              <Globe size={32} color="#FFFFFF" />
            </View>
            <View style={tw`flex-row flex-wrap`}>
              <View style={tw`w-1/2 pr-1 mb-4`}>
                <Text style={[tw`text-white/80 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                  Total Members
                </Text>
                <Text style={[tw`text-white text-3xl`, { fontFamily: 'Poppins-Bold' }]}>
                  {globalStats.totalMembers.toLocaleString()}
                </Text>
              </View>
              <View style={tw`w-1/2 pl-1 mb-4`}>
                <Text style={[tw`text-white/80 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                  Active Groups
                </Text>
                <Text style={[tw`text-white text-3xl`, { fontFamily: 'Poppins-Bold' }]}>
                  {globalStats.activeGroups.toLocaleString()}
                </Text>
              </View>
              <View style={tw`w-1/2 pr-1`}>
                <Text style={[tw`text-white/80 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                  Programs Done
                </Text>
                <Text style={[tw`text-white text-3xl`, { fontFamily: 'Poppins-Bold' }]}>
                  {globalStats.programsCompleted.toLocaleString()}
                </Text>
              </View>
              <View style={tw`w-1/2 pl-1`}>
                <Text style={[tw`text-white/80 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                  Savings Goals
                </Text>
                <Text style={[tw`text-white text-3xl`, { fontFamily: 'Poppins-Bold' }]}>
                  ${(globalStats.savingsGoals / 1000000).toFixed(1)}M
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* World Map Representation */}
          <View style={tw`border-2 border-purple-200 rounded-2xl p-6 mt-4 shadow-sm bg-gradient-to-r from-amber-50 to-purple-50`}>
            <View style={tw`flex-row items-center mb-4`}>
              <MapPin size={20} color="#7C3AED" />
              <Text style={[tw`text-purple-900 ml-2`, { fontFamily: 'Poppins-SemiBold' }]}>
                Members Worldwide
              </Text>
            </View>
            <View style={tw`items-center py-4`}>
              <Text style={tw`text-6xl mb-4`}>🌍</Text>
              <Text style={[tw`text-purple-900 text-lg mb-2`, { fontFamily: 'Poppins-SemiBold' }]}>
                Active in 47 Countries
              </Text>
              <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
                Across 6 Continents
              </Text>
            </View>
          </View>

          {/* Regional Breakdown */}
          <Text style={[tw`text-purple-900 text-xl mt-6 mb-4`, { fontFamily: 'Poppins-Bold' }]}>
            Regional Impact
          </Text>
          <View>
            {regionalImpact.map((region, index) => (
              <View key={`${region.country}-${region.region}`} style={index > 0 && tw`mt-3`}>
                <RegionalCard region={region} />
              </View>
            ))}
          </View>

          {/* Recent Achievements */}
          <View style={tw`flex-row items-center justify-between mt-6 mb-4`}>
            <Text style={[tw`text-purple-900 text-xl`, { fontFamily: 'Poppins-Bold' }]}>
              Recent Achievements
            </Text>
            <TouchableOpacity style={tw`flex-row items-center`}>
              <Text style={[tw`text-purple-600 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                View All
              </Text>
              <ArrowRight size={16} color="#7C3AED" style={tw`ml-1`} />
            </TouchableOpacity>
          </View>
          <View>
            {recentAchievements.map((achievement, index) => (
              <View key={`achievement-${achievement.id}`} style={index > 0 && tw`mt-3`}>
                <AchievementCard 
                  achievement={achievement}
                  categoryIcons={categoryIcons}
                />
              </View>
            ))}
          </View>

          {/* Impact Categories */}
          <Text style={[tw`text-purple-900 text-xl mt-6 mb-4`, { fontFamily: 'Poppins-Bold' }]}>
            Impact by Category
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {impactCategories.map((category, index) => (
              <View key={`category-${index}`} style={tw`w-1/2 pr-1 mb-2 ${index % 2 === 1 ? 'pl-1 pr-0' : 'pr-1'}`}>
                <ImpactCategoryCard {...category} />
              </View>
            ))}
          </View>

          {/* Call to Action */}
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            style={tw`rounded-2xl p-6 mt-6 shadow-lg`}
          >
            <Sparkles size={48} color="#FFFFFF" style={tw`mx-auto mb-3`} />
            <Text style={[tw`text-white text-xl text-center mb-2`, { fontFamily: 'Poppins-Bold' }]}>
              Be Part of the Impact
            </Text>
            <Text style={[tw`text-white/90 text-center mb-4`, { fontFamily: 'Poppins-Regular' }]}>
              Your achievements inspire sisters worldwide. Share your success story!
            </Text>
            <TouchableOpacity
              style={tw`bg-white rounded-full overflow-hidden shadow-lg`}
              activeOpacity={0.8}
            >
              <View style={tw`py-4 items-center`}>
                <Text style={[tw`text-purple-600 text-lg`, { fontFamily: 'Poppins-SemiBold' }]}>
                  Share Your Achievement
                </Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}