// app/modals/moreMenu.jsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import tw from "../../utils/tw";

export default function MoreMenu() {
  const router = useRouter();

  const PURPLE = "#6A1B9A";
  const GOLD = "#FFD700";

  const exploreItems = [
    {
      title: "Events & Conferences",
      subtitle: "Discover upcoming events and summits",
      icon: "calendar-outline",
      route: "/more/events",
    },
    {
      title: "Mentorship",
      subtitle: "Connect with experienced mentors",
      icon: "people-outline",
      route: "/more/mentorship",
    },
    {
      title: "Wellness & Retreats",
      subtitle: "Retreats, wellbeing, and calming experiences",
      icon: "leaf-outline",
      route: "/more/wellness",
    },
    {
      title: "Marketplace",
      subtitle: "Products, services, and partnerships",
      icon: "cart-outline",
      route: "/more/marketplace",
    },
    // {
    //   title: "Global Impact Tracker",
    //   subtitle: "Track community and social impact",
    //   icon: "earth-outline",
    //   route: "/more/impact",
    // },
    {
      title: "Digital Legacy Archive",
      subtitle: "Preserve stories, work, and achievements",
      icon: "archive-outline",
      route: "/more/legacy",
    },
    {
      title: "Safety & Support Hub",
      subtitle: "Resources for protection and assistance",
      icon: "shield-checkmark-outline",
      route: "/more/safetyhub",
    },
  ];

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="light-content" />

      {/* ================= HEADER ================= */}
      <LinearGradient
        colors={[PURPLE, "#4A148C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
      >
        <View style={tw`flex-row items-center`}>
          <View
            style={[
              tw`w-10 h-10 rounded-xl items-center justify-center`,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <Ionicons name="grid-outline" size={22} color={GOLD} />
          </View>

          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 22,
              color: "#fff",
              marginLeft: 12,
            }}
          >
            Explore More
          </Text>
        </View>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 14,
            color: "#E9D5FF",
            marginTop: 6,
          }}
        >
          Access additional features and resources
        </Text>
      </LinearGradient>

      {/* ================= CONTENT ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-6 pb-10 pt-5`}
      >
        {exploreItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.85}
            onPress={() => router.push(item.route)}
            style={[
              tw`rounded-2xl p-4 mb-4 bg-white`,
              {
                shadowColor: PURPLE,
                shadowOpacity: 0.08,
                shadowRadius: 10,
                elevation: 4,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              {/* Icon */}
              <View
                style={[
                  tw`w-12 h-12 rounded-xl items-center justify-center`,
                  { backgroundColor: "#F3E8FF" },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={PURPLE} />
              </View>

              {/* Text */}
              <View style={tw`ml-4 flex-1`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 16,
                    color: "#111",
                  }}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                >
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#BDBDBD"
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* ================= ABOUT ASIYO ================= */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={tw`mt-6 rounded-3xl overflow-hidden`}
          onPress={() => router.push("/more/about")}
        >
          <LinearGradient
            colors={[PURPLE, "#4A148C"]}
            style={tw`p-5`}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 pr-3`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 16,
                    color: "#fff",
                  }}
                >
                  About Asiyo
                </Text>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    color: "#E9D5FF",
                    marginTop: 3,
                  }}
                >
                  Learn more about our mission and vision
                </Text>
              </View>

              <Ionicons
                name="information-circle"
                size={26}
                color={GOLD}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
