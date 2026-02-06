import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, ChevronLeft } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";

import { fetchEvents } from "../../store/slices/eventSlice";
import EventCard from "../../components/events/EventCard";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import tw from "../../utils/tw";

const PURPLE = "#6A1B9A";

export default function EventsScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { events, loading } = useSelector((s) => s.events);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchEvents());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEvents());
    setRefreshing(false);
  }, []);

  /* =====================================================
     EMPTY STATE
  ===================================================== */
  const EmptyState = () => (
    <View style={tw`flex-1 items-center justify-center px-8 mt-20`}>
      <View
        style={[
          tw`w-20 h-20 rounded-full items-center justify-center mb-5`,
          { backgroundColor: "#EDE7F6" }
        ]}
      >
        <CalendarDays size={34} color={PURPLE} />
      </View>

      <Text style={[tw`text-lg mb-2`, { fontFamily: "Poppins-SemiBold", color: PURPLE }]}>
        No events yet
      </Text>

      <Text style={[tw`text-gray-500 text-center`, { fontFamily: "Poppins-Regular" }]}>
        Conferences, workshops and meetups will appear here soon.
      </Text>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-white`}>

      {/* =====================================================
   HEADER (SOLID BRAND PURPLE)
===================================================== */}
      <View
        style={[
          tw`pt-14 pb-8 px-5 rounded-b-[45px] shadow-lg h-45`,
          { backgroundColor: "#6A1B9A" }
        ]}
      >

        {/* BACK BUTTON */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`absolute left-4 top-14 w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
          activeOpacity={0.8}
        >
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* TITLE */}
        <View style={tw`ml-12`}>
          <Text
            style={[
              tw`text-white text-2xl`,
              { fontFamily: "Poppins-Bold" }
            ]}
          >
            Events & Conferences
          </Text>

          <Text
            style={[
              tw`text-purple-100 text-sm mt-1`,
              { fontFamily: "Poppins-Regular" }
            ]}
          >
            Connect, learn, and grow together
          </Text>
        </View>
      </View>


      {/* =====================================================
         BODY
      ===================================================== */}

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ShimmerLoader />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={tw`px-4 pt-4 pb-20`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PURPLE}
            />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </View>
  );
}
