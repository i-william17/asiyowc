import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Animated
} from "react-native";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Globe,
  ChevronRight,
  CheckCircle,
  User,
  Bookmark,
  BookmarkCheck,
  Share
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";

import {
  rsvpEvent,
  cancelRsvpEvent
} from "../../store/slices/eventSlice";

import tw from "../../utils/tw";

const PURPLE = "#6A1B9A";
const PURPLE_LIGHT = "#EDE7F6";
const PURPLE_DARK = "#4A148C";

/* =====================================================
   EVENT CARD
===================================================== */

export default function EventCard({ event }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const scaleAnim = useState(new Animated.Value(1))[0];

  const token = useSelector((s) => s.auth.token);
  const isFree = event?.price?.isFree;
  const isRegistered = event?.isRegistered;
  const isVirtual = event?.type === "virtual";

  /* =====================================================
     FORMAT
  ===================================================== */

  const formattedDate = useMemo(() => {
    if (!event?.dateTime?.start) return "";
    const date = new Date(event.dateTime.start);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, [event]);

  const formattedTime = useMemo(() => {
    if (!event?.dateTime?.start) return "";
    return new Date(event.dateTime.start).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }, [event]);

  const dayOfWeek = useMemo(() => {
    if (!event?.dateTime?.start) return "";
    return new Date(event.dateTime.start).toLocaleDateString('en-US', { 
      weekday: 'short' 
    }).toUpperCase();
  }, [event]);

  /* =====================================================
     ANIMATIONS
  ===================================================== */

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  /* =====================================================
     ACTIONS
  ===================================================== */

  const openDetails = () => {
    router.push(`/events/${event._id}`);
  };

  const handleRSVP = (e) => {
    e.stopPropagation();
    
    if (!token) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to RSVP for this event",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/auth/signin") }
        ]
      );
      return;
    }

    if (isRegistered) {
      Alert.alert(
        "Cancel Registration",
        "Are you sure you want to cancel your registration?",
        [
          { text: "No", style: "cancel" },
          { 
            text: "Yes", 
            onPress: () => dispatch(cancelRsvpEvent({ 
              eventId: event._id, 
              token 
            }))
          }
        ]
      );
    } else {
      Alert.alert(
        "Join Event",
        `Are you sure you want to join "${event.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Join", 
            onPress: () => dispatch(rsvpEvent({ 
              eventId: event._id, 
              token 
            }))
          }
        ]
      );
    }
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    
    if (!event?.location?.onlineLink) return;

    await Clipboard.setStringAsync(event.location.onlineLink);
    Alert.alert(
      "Link Copied",
      "Meeting link has been copied to clipboard",
      [{ text: "OK" }]
    );
  };

  const handleShareEvent = async (e) => {
    e.stopPropagation();
    
    try {
      await Clipboard.setStringAsync(`Check out this event: ${event.title}\n\nEvent ID: ${event._id}`);
      Alert.alert(
        "Event Shared",
        "Event details copied to clipboard",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <Animated.View 
      style={[
        tw`mb-5`,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={openDetails}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          tw`bg-white rounded-3xl overflow-hidden`,
          {
            elevation: 8,
            shadowColor: PURPLE,
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 }
          }
        ]}
      >

        {/* =====================================================
           IMAGE SECTION
        ===================================================== */}
        <View style={tw`h-52 relative`}>

          {/* Event Image */}
          <Image
            source={{ uri: event?.image?.url }}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={tw`absolute bottom-0 left-0 right-0 h-24`}
          />

          {/* Date Badge */}
          <View style={tw`absolute top-4 left-4`}>
            <View style={[
              tw`items-center justify-center rounded-xl px-3 py-2`,
              { backgroundColor: "rgba(255,255,255,0.95)" }
            ]}>
              <Text style={[
                tw`text-gray-500 text-xs`,
                { fontFamily: "Poppins-Bold" }
              ]}>
                {dayOfWeek}
              </Text>
              <Text style={[
                tw`text-gray-800 text-lg`,
                { fontFamily: "Poppins-Bold" }
              ]}>
                {new Date(event.dateTime.start).getDate()}
              </Text>
              <Text style={[
                tw`text-gray-500 text-xs`,
                { fontFamily: "Poppins-Medium" }
              ]}>
                {new Date(event.dateTime.start).toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </View>
          </View>

          {/* Event Type Badge */}
          <View
            style={[
              tw`absolute top-4 right-4 px-4 py-2 rounded-full`,
              { 
                backgroundColor: isVirtual ? "#3B82F6" : PURPLE,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 }
              }
            ]}
          >
            <View style={tw`flex-row items-center`}>
              {isVirtual ? (
                <Video size={14} color="#fff" style={tw`mr-1`} />
              ) : (
                <MapPin size={14} color="#fff" style={tw`mr-1`} />
              )}
              <Text
                style={[
                  tw`text-white text-xs`,
                  { fontFamily: "Poppins-SemiBold" }
                ]}
              >
                {isVirtual ? "VIRTUAL" : "IN-PERSON"}
              </Text>
            </View>
          </View>

          {/* Price Badge */}
          {!isFree && event?.price?.amount && (
            <View
              style={[
                tw`absolute bottom-4 right-4 px-4 py-2 rounded-full`,
                { 
                  backgroundColor: "rgba(255,255,255,0.95)",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }
                }
              ]}
            >
              <Text
                style={[
                  tw`text-amber-600 text-sm`,
                  { fontFamily: "Poppins-Bold" }
                ]}
              >
                KES {event.price.amount}
              </Text>
            </View>
          )}

          {/* Event Title Overlay */}
          <View style={tw`absolute bottom-4 left-4 right-20`}>
            <Text
              style={[
                tw`text-white text-xl leading-6`,
                { fontFamily: "Poppins-Bold" }
              ]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <User size={14} color="#fff" style={tw`mr-1`} />
              <Text
                style={[
                  tw`text-white/90 text-sm`,
                  { fontFamily: "Poppins-Medium" }
                ]}
              >
                {event.organizer?.profile?.fullName || "Host"}
              </Text>
            </View>
          </View>
        </View>


        {/* =====================================================
           BODY SECTION
        ===================================================== */}
        <View style={tw`p-5`}>

          {/* Quick Info Grid */}
          <View style={tw`flex-row mb-4 justify-between`}>
            <InfoItem 
              icon={Calendar} 
              label={formattedDate}
              iconColor="#6B7280"
            />
            <InfoItem 
              icon={Clock} 
              label={formattedTime}
              iconColor="#6B7280"
            />
            <InfoItem 
              icon={Users} 
              label={`${event.statistics?.registrations || 0}`}
              subLabel="Attending"
              iconColor="#6B7280"
            />
          </View>

          {/* Location/Virtual Info */}
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center`}>
              {isVirtual ? (
                <Video size={16} color="#3B82F6" style={tw`mr-2`} />
              ) : (
                <MapPin size={16} color="#EF4444" style={tw`mr-2`} />
              )}
              <Text style={[
                tw`text-gray-700`,
                { fontFamily: "Poppins-Medium" }
              ]}>
                {isVirtual ? "Online Event" : `${event.location?.city || "Location"}`}
              </Text>
            </View>
          </View>

          {/* Tags (if available) */}
          {event.tags?.length > 0 && (
            <View style={tw`mb-4 flex-row flex-wrap gap-2`}>
              {event.tags.slice(0, 3).map((tag, index) => (
                <View 
                  key={index}
                  style={[
                    tw`px-3 py-1 rounded-full`,
                    { backgroundColor: PURPLE_LIGHT }
                  ]}
                >
                  <Text style={[
                    tw`text-xs`,
                    { color: PURPLE, fontFamily: "Poppins-Medium" }
                  ]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {event.tags.length > 3 && (
                <View style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: "#F3F4F6" }
                ]}>
                  <Text style={[
                    tw`text-xs text-gray-600`,
                    { fontFamily: "Poppins-Medium" }
                  ]}>
                    +{event.tags.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* =====================================================
             ACTION BUTTONS
          ===================================================== */}
          <View style={tw`flex-row gap-3`}>

            {/* Main Action Button */}
            {/* <TouchableOpacity
              onPress={handleRSVP}
              style={[
                tw`flex-1 py-3 rounded-xl items-center justify-center`,
                { 
                  backgroundColor: isRegistered ? "#10B981" : PURPLE,
                  shadowColor: isRegistered ? "#10B981" : PURPLE,
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4
                }
              ]}
              activeOpacity={0.8}
            >
              <View style={tw`flex-row items-center`}>
                {isRegistered && (
                  <CheckCircle size={18} color="#fff" style={tw`mr-2`} />
                )}
                <Text
                  style={[
                    tw`text-white text-base`,
                    { fontFamily: "Poppins-SemiBold" }
                  ]}
                >
                  {isRegistered ? "Registered" : isFree ? "RSVP Now" : "Get Ticket"}
                </Text>
              </View>
              {!isRegistered && !isFree && event?.price?.amount && (
                <Text style={[
                  tw`text-white/90 text-xs mt-1`,
                  { fontFamily: "Poppins-Regular" }
                ]}>
                  KES {event.price.amount}
                </Text>
              )}
            </TouchableOpacity> */}

            {/* Secondary Actions */}
            <View style={tw`flex-row gap-2`}>
              
              {/* Virtual Link Copy */}
              {isVirtual && event?.location?.onlineLink && (
                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={[
                    tw`w-12 h-12 rounded-xl items-center justify-center border`,
                    { 
                      borderColor: "#3B82F6",
                      backgroundColor: "rgba(59, 130, 246, 0.1)"
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Share size={20} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {/* Share Event */}
              <TouchableOpacity
                onPress={handleShareEvent}
                style={[
                  tw`w-12 h-12 rounded-xl items-center justify-center border`,
                  { 
                    borderColor: PURPLE,
                    backgroundColor: "rgba(106, 27, 154, 0.1)"
                  }
                ]}
                activeOpacity={0.7}
              >
                <Globe size={20} color={PURPLE} />
              </TouchableOpacity>

              {/* View Details Arrow */}
              <TouchableOpacity
                onPress={openDetails}
                style={[
                  tw`w-12 h-12 rounded-xl items-center justify-center`,
                  { backgroundColor: PURPLE }
                ]}
                activeOpacity={0.7}
              >
                <ChevronRight size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* =====================================================
   INFO ITEM COMPONENT
===================================================== */

function InfoItem({ icon: Icon, label, subLabel, iconColor }) {
  return (
    <View style={tw`items-center flex-1`}>
      <View style={tw`flex-row items-center mb-1`}>
        <Icon size={14} color={iconColor} style={tw`mr-1`} />
        <Text
          style={[
            tw`text-gray-700 text-sm`,
            { fontFamily: "Poppins-SemiBold" }
          ]}
        >
          {label}
        </Text>
      </View>
      {subLabel && (
        <Text
          style={[
            tw`text-gray-500 text-xs`,
            { fontFamily: "Poppins-Regular" }
          ]}
        >
          {subLabel}
        </Text>
      )}
    </View>
  );
}