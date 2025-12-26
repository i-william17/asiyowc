import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

const { width } = Dimensions.get("window");

export default function AboutAsiyo() {
  const images = [
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
  ];

  return (
    <ScrollView style={tw`flex-1 bg-white`}>
      {/* ================= HERO HEADER ================= */}
      <View style={tw`px-6 pt-14 pb-8 bg-purple-700`}>
        <View style={tw`flex-row items-center mb-3`}>
          <Ionicons name="sparkles" size={26} color="#FFD700" />
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 24,
              color: "#fff",
              marginLeft: 10,
            }}
          >
            About Asiyo
          </Text>
        </View>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            color: "#E9D5FF",
            lineHeight: 22,
          }}
        >
          Empowering women to rise, lead, and create global impact.
        </Text>
      </View>

      {/* ================= IMAGE CAROUSEL ================= */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={tw`mt-6`}
      >
        {images.map((img, index) => (
          <Image
            key={index}
            source={{ uri: img }}
            style={{
              width: width - 48,
              height: 220,
              marginHorizontal: 24,
              borderRadius: 24,
            }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* ================= CONTENT ================= */}
      <View style={tw`px-6 mt-8`}>
        <Text
          style={{
            fontFamily: "Poppins-Bold",
            fontSize: 20,
            color: "#111",
            marginBottom: 12,
          }}
        >
          Asiyo Women Connect
        </Text>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            color: "#374151",
            lineHeight: 24,
            marginBottom: 18,
          }}
        >
          Asiyo Women Connect is a community-driven digital platform designed
          to uplift, empower, and connect women across Africa and beyond.
          We believe that when women are supported with the right tools,
          networks, and opportunities, they become powerful agents of
          transformation in their families, communities, and economies.
        </Text>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            color: "#374151",
            lineHeight: 24,
            marginBottom: 18,
          }}
        >
          Our platform brings together entrepreneurs, professionals,
          creatives, and leaders into one inclusive ecosystem — offering
          access to mentorship, programs, wellness initiatives, financial
          empowerment tools, and safe spaces for dialogue and growth.
        </Text>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            color: "#374151",
            lineHeight: 24,
            marginBottom: 18,
          }}
        >
          Through community engagement, education, and technology, Asiyo
          Women Connect is building a future where women are not only heard,
          but supported to lead boldly, create sustainably, and leave a
          meaningful legacy.
        </Text>
      </View>

      {/* ================= VALUES / HIGHLIGHTS ================= */}
      <View style={tw`px-6 mt-4 mb-10`}>
        {[
          {
            icon: "people",
            title: "Community First",
            text: "A safe, inclusive space built on trust, connection, and shared growth.",
          },
          {
            icon: "school",
            title: "Learning & Mentorship",
            text: "Access programs, mentors, and resources that unlock potential.",
          },
          {
            icon: "heart",
            title: "Wellbeing & Balance",
            text: "Supporting holistic wellness — mental, emotional, and financial.",
          },
          {
            icon: "globe",
            title: "Global Impact",
            text: "Empowering women to create change locally and globally.",
          },
        ].map((item, idx) => (
          <View
            key={idx}
            style={tw`flex-row items-start mb-6`}
          >
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
                  fontSize: 14,
                  color: "#6B7280",
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {item.text}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
