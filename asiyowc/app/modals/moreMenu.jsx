// app/modals/moreMenu.jsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

export default function MoreMenu() {
  const router = useRouter();

  const exploreItems = [
    {
      title: "Events & Conferences",
      subtitle: "Discover upcoming events and summits",
      icon: "calendar",
      route: "/more/events",
    },
    {
      title: "Mentorship",
      subtitle: "Connect with experienced mentors",
      icon: "people",
      route: "/more/mentorship",
    },
    {
      title: "Wellness & Travel",
      subtitle: "Retreats, wellbeing, and travel experiences",
      icon: "leaf",
      route: "/more/wellness",
    },
    {
      title: "Marketplace",
      subtitle: "Products, services, and partnerships",
      icon: "cart",
      route: "/more/marketplace",
    },
    {
      title: "Global Impact Tracker",
      subtitle: "Track community and social impact",
      icon: "earth",
      route: "/more/impact",
    },
    {
      title: "Digital Legacy Archive",
      subtitle: "Preserve stories, work, and achievements",
      icon: "archive",
      route: "/more/legacy",
    },
    {
      title: "Safety & Support Hub",
      subtitle: "Resources for protection and assistance",
      icon: "shield-checkmark",
      route: "/more/safetyhub",
    },
  ];

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* ================= HEADER ================= */}
      <View style={tw`px-6 pt-14 pb-6 bg-purple-700`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="grid" size={26} color="#FFD700" />
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 22,
              color: "#fff",
              marginLeft: 10,
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
          }}
        >
          Access additional features and resources
        </Text>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView contentContainerStyle={tw`p-6`}>
        {exploreItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.85}
            style={tw`bg-gray-100 rounded-2xl p-4 mb-4`}
            onPress={() => router.push(item.route)}
          >
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-12 h-12 rounded-xl bg-purple-100 items-center justify-center`}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color="#6A1B9A"
                />
              </View>

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
                size={20}
                color="#9CA3AF"
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* ================= ABOUT ASIYO ================= */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={tw`mt-6 bg-purple-600 rounded-2xl p-5`}
          onPress={() => router.push("/more/about")}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <View>
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
                  marginTop: 2,
                }}
              >
                Learn more about our mission and vision
              </Text>
            </View>

            <Ionicons name="information-circle" size={26} color="#FFD700" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
