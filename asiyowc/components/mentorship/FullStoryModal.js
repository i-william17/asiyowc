import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Modal,
} from "react-native";

import { useSelector } from "react-redux";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';

import { LinearGradient } from "expo-linear-gradient";
import { 
  ArrowLeft, 
  Heart, 
  Eye, 
  Calendar, 
  User, 
  Share2, 
  BookOpen, 
  MessageCircle,
  Clock,
  ChevronRight,
  Bookmark,
} from "lucide-react-native";
import tw from "../../utils/tw";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FullStoryScreen() {
  const router = useRouter();
  const { storyId } = useLocalSearchParams();

  const { stories, loading } = useSelector((state) => state.mentorship);
  
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  /* ============================================================
     FIND STORY
  ============================================================ */
  const story = useMemo(() => {
    return stories?.find((s) => s._id === storyId);
  }, [stories, storyId]);

  /* ============================================================
     HANDLERS
  ============================================================ */
  const handleBack = () => {
    router.back();
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async () => {
    try {
      if (story?.image) {
        await Sharing.shareAsync(story.image, {
          dialogTitle: `Share "${story.title}"`,
          mimeType: 'image/jpeg',
        });
      } else {
        await Sharing.shareAsync({
          message: `${story?.title}\n\n${story?.content?.substring(0, 200)}...`,
          url: story?.image,
          title: story?.title,
        });
      }
    } catch (error) {
      console.log('Sharing error:', error);
    }
  };

  /* ============================================================
     LOADING STATE
  ============================================================ */
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={[tw`text-gray-600 mt-4`, { fontFamily: 'Poppins-Regular' }]}>
            Loading story...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!story) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <View style={tw`w-24 h-24 bg-purple-100 rounded-full items-center justify-center mb-6`}>
            <BookOpen size={40} color="#7C3AED" />
          </View>
          <Text style={[tw`text-gray-900 text-xl mb-3 text-center`, { fontFamily: 'Poppins-Bold' }]}>
            Story Not Found
          </Text>
          <Text style={[tw`text-gray-600 text-center mb-8`, { fontFamily: 'Poppins-Regular' }]}>
            The story you're looking for may have been moved or deleted.
          </Text>
          <TouchableOpacity
            style={tw`bg-purple-600 rounded-full px-6 py-3.5`}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
              Back to Stories
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ============================================================
     FORMATTING HELPERS
  ============================================================ */
  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const readingTime = (content) => {
    if (!content) return '1 min read';
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  /* ============================================================
     UI COMPONENTS
  ============================================================ */
  const StatItem = ({ icon: Icon, value, label, color = "#6B7280" }) => (
    <View style={tw`flex-row items-center mr-4 mb-3`}>
      <View style={[tw`w-8 h-8 rounded-full items-center justify-center mr-2`, { backgroundColor: `${color}15` }]}>
        <Icon size={16} color={color} />
      </View>
      <View>
        <Text style={[tw`text-gray-900 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
          {value}
        </Text>
        <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
          {label}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal style={tw`flex-1 bg-white`}>
      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-20`}
      >
        {/* ======================================================
           HERO IMAGE SECTION
        ====================================================== */}
        <View style={tw`relative`}>
          {story.image ? (
            <Image
              source={{ uri: story.image }}
              style={tw`w-full h-64`}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              style={tw`w-full h-64`}
            />
          )}
          
          {/* Header with Back Button - Fixed positioning issues */}
          <View style={tw`absolute top-0 left-0 right-0 pt-12 px-5`}>
            <View style={tw`flex-row items-center justify-between`}>
              <TouchableOpacity
                onPress={handleBack}
                style={tw`w-10 h-10 rounded-full bg-black/30 items-center justify-center`}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={tw`flex-row`}>
                {/* <TouchableOpacity
                  onPress={handleBookmark}
                  style={tw`w-10 h-10 rounded-full bg-black/30 items-center justify-center ml-2`}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Bookmark 
                    size={20} 
                    color="#FFFFFF" 
                    fill={isBookmarked ? "#FFFFFF" : "transparent"} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleShare}
                  style={tw`w-10 h-10 rounded-full bg-black/30 items-center justify-center ml-2`}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Share2 size={20} color="#FFFFFF" />
                </TouchableOpacity> */}
              </View>
            </View>
          </View>

          {/* Story Title Overlay - Moved down for better visibility */}
          <View style={tw`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5`}>
            <Text 
              numberOfLines={2}
              style={[tw`text-white text-2xl leading-8`, { fontFamily: 'Poppins-Bold' }]}
            >
              {story.title}
            </Text>
          </View>
        </View>

        {/* ======================================================
           STORY METADATA
        ====================================================== */}
        <View style={tw`px-5 pt-6 pb-4`}>
          {/* Author Info */}
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-10 h-10 rounded-full bg-purple-100 border-2 border-white`}>
              {story.author?.avatar ? (
                <Image 
                  source={{ uri: story.author.avatar }} 
                  style={tw`w-full h-full rounded-full`}
                  resizeMode="cover"
                />
              ) : (
                <View style={tw`w-full h-full items-center justify-center`}>
                  <User size={20} color="#7C3AED" />
                </View>
              )}
            </View>
            <View style={tw`ml-3`}>
              <Text style={[tw`text-gray-900 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                {story.author?.fullName || 'Anonymous Mentor'}
              </Text>
              <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                Mentor
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={tw`flex-row flex-wrap mb-4`}>
            <StatItem 
              icon={Calendar} 
              value={formatDate(story.createdAt)} 
              label="Published" 
              color="#7C3AED" 
            />
            <StatItem 
              icon={Clock} 
              value={readingTime(story.content)} 
              label="Reading time" 
              color="#F59E0B" 
            />
            <StatItem 
              icon={Eye} 
              value={(story.views || 0).toLocaleString()} 
              label="Views" 
              color="#10B981" 
            />
          </View>
        </View>

        {/* ======================================================
           STORY CONTENT
        ====================================================== */}
        <View style={tw`px-5 pt-4`}>
          {/* Main Content */}
          <Text style={[tw`text-gray-800 text-base leading-7`, { fontFamily: 'Poppins-Regular' }]}>
            {story.content}
          </Text>
        </View>

        {/* ======================================================
           CALL TO ACTION
        ====================================================== */}
        <View style={tw`mx-5 mt-8 p-5 bg-purple-50 rounded-2xl border border-purple-100`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-10 h-10 bg-white rounded-lg items-center justify-center`}>
              <MessageCircle size={22} color="#7C3AED" />
            </View>
            <View style={tw`ml-4 flex-1`}>
              <Text style={[tw`text-gray-900 text-sm mb-1`, { fontFamily: 'Poppins-Bold' }]}>
                Inspired by this story?
              </Text>
              <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                Connect with mentors who can guide your journey
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={tw`bg-purple-600 rounded-xl py-3.5 flex-row items-center justify-center`}
            activeOpacity={0.8}
            onPress={() => router.push('/mentorship')}
          >
            <Text style={[tw`text-white text-sm mr-2`, { fontFamily: 'Poppins-SemiBold' }]}>
              Find a Mentor
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

    </Modal>
  );
}