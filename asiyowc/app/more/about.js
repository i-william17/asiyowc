import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

const { width: windowWidth } = Dimensions.get("window");

export default function AboutAsiyo() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  // Responsive content width
  const contentWidth = isWeb
    ? isLargeScreen
      ? Math.min(width * 0.5, 900)
      : isTablet
        ? width * 0.8
        : width - 48
    : width - 48;

  const horizontalPadding = isWeb && (isLargeScreen || isTablet)
    ? (width - contentWidth) / 2
    : 24;

  const stats = [
    { label: "Community Members", value: "10K+", icon: "people", color: "#6366F1" },
    { label: "Active Pods", value: "500+", icon: "cube", color: "#8B5CF6" },
    { label: "Countries", value: "15+", icon: "globe", color: "#10B981" },
    { label: "Success Stories", value: "1K+", icon: "trophy", color: "#F59E0B" },
  ];

  const features = [
    {
      icon: "people-circle",
      title: "Community-Led Growth",
      description: "Connect with like-minded women in niche communities",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      icon: "trending-up",
      title: "Financial Empowerment",
      description: "Tools and resources for financial independence",
      color: "#10B981",
      bgColor: "#E0F2E9",
    },
    {
      icon: "school",
      title: "Mentorship Programs",
      description: "1-on-1 guidance from industry leaders",
      color: "#8B5CF6",
      bgColor: "#EDE9FE",
    },
    {
      icon: "heart-circle",
      title: "Wellness Support",
      description: "Holistic wellbeing for mind, body, and soul",
      color: "#EC4899",
      bgColor: "#FCE7F3",
    },
    {
      icon: "briefcase",
      title: "Business Network",
      description: "Partnerships and opportunities for growth",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
    },
    {
      icon: "rocket",
      title: "Innovation Hub",
      description: "Access to cutting-edge resources and tools",
      color: "#3B82F6",
      bgColor: "#DBEAFE",
    },
  ];

  const teamImages = [
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format",
    "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format",
  ];

  return (
    <View style={tw`flex-1 bg-[#F8FAFC]`}>
      {/* ================= FLOATING HEADER ================= */}
      <View style={[
        tw`absolute top-0 left-0 right-0 z-30`,
        {
          paddingTop: Platform.OS === 'ios' ? 50 : 40,
          paddingHorizontal: horizontalPadding,
        }
      ]}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              tw`w-12 h-12 rounded-2xl items-center justify-center`,
              {
                backgroundColor: 'rgba(255,255,255,0.95)',
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.5)',
              }
            ]}
          >
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        bounces={!isWeb}
      >
        {/* ================= HERO SECTION ================= */}
        <View style={[
          tw`relative overflow-hidden`,
          {
            backgroundColor: '#0F172A',
            paddingTop: Platform.OS === 'ios' ? 120 : 100,
            paddingBottom: 80,
          }
        ]}>
          {/* Abstract Background Pattern */}
          <View style={tw`absolute inset-0 opacity-10`}>
            <View style={[
              tw`absolute rounded-full`,
              { width: 400, height: 400, backgroundColor: '#6366F1', top: -100, right: -100 }
            ]} />
            <View style={[
              tw`absolute rounded-full`,
              { width: 300, height: 300, backgroundColor: '#8B5CF6', bottom: -50, left: -50 }
            ]} />
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: horizontalPadding }}>
            <View style={tw`items-center`}>
              {/* Brand Mark */}
              <View style={[
                tw`mb-8`,
                {
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }
              ]}>
                <Image
                  source={require("../../assets/images/notification_icon.png")}
                  style={{ width: 100, height: 100, resizeMode: "contain" }}
                />
              </View>

              {/* Main Headline */}
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: isLargeScreen ? 56 : isTablet ? 48 : 40,
                  color: "#FFFFFF",
                  lineHeight: isLargeScreen ? 64 : isTablet ? 56 : 48,
                  textAlign: 'center',
                  maxWidth: 800,
                }}
              >
                Empowering Women to
                <Text style={{ color: '#6366F1' }}> Rise Higher</Text>
              </Text>

              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: isLargeScreen ? 18 : 16,
                  color: "#94A3B8",
                  lineHeight: 28,
                  textAlign: 'center',
                  maxWidth: 600,
                  marginTop: 20,
                }}
              >
                Asiyo is where ambition meets community. Join thousands of women
                building wealth, knowledge, and lasting impact.
              </Text>

              {/* CTA Buttons */}
              {/* <View style={tw`flex-row mt-10`}>
                <TouchableOpacity
                  style={[
                    tw`px-8 py-4 rounded-2xl mr-4`,
                    {
                      backgroundColor: '#6366F1',
                      shadowColor: '#6366F1',
                      shadowOpacity: 0.3,
                      shadowRadius: 15,
                      shadowOffset: { width: 0, height: 8 },
                    }
                  ]}
                >
                  <Text style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#FFFFFF",
                    fontSize: 16,
                  }}>
                    Join the Movement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`px-8 py-4 rounded-2xl`,
                    {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                    }
                  ]}
                >
                  <Text style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#FFFFFF",
                    fontSize: 16,
                  }}>
                    Watch Video
                  </Text>
                </TouchableOpacity>
              </View> */}
            </View>
          </View>
        </View>

        {/* ================= FEATURES GRID ================= */}
        <View style={[tw`mt-16`, { paddingHorizontal: horizontalPadding }]}>
          <View style={tw`items-center mb-12`}>
            <Text style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 14,
              color: "#6366F1",
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Why Asiyo
            </Text>
            <Text style={{
              fontFamily: "Poppins-Bold",
              fontSize: isLargeScreen ? 40 : 32,
              color: "#0F172A",
              textAlign: 'center',
              maxWidth: 600,
            }}>
              Everything you need to thrive
            </Text>
          </View>

          <View style={[
            tw`flex-row flex-wrap`,
            {
              marginHorizontal: -12,
            }
          ]}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  tw`p-3`,
                  {
                    width: isLargeScreen ? '33.333%' : isTablet ? '50%' : '100%',
                  }
                ]}
              >
                <View style={[
                  tw`p-6 rounded-2xl`,
                  {
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#F1F5F9',
                    shadowColor: "#000",
                    shadowOpacity: 0.02,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                  }
                ]}>
                  <View style={[
                    tw`w-14 h-14 rounded-xl items-center justify-center mb-4`,
                    { backgroundColor: feature.bgColor }
                  ]}>
                    <Ionicons name={feature.icon} size={28} color={feature.color} />
                  </View>
                  <Text style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 18,
                    color: "#0F172A",
                    marginBottom: 8,
                  }}>
                    {feature.title}
                  </Text>
                  <Text style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 14,
                    color: "#64748B",
                    lineHeight: 22,
                  }}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ================= TEAM SECTION ================= */}
        {/* <View style={[tw`mt-16`, { paddingHorizontal: horizontalPadding }]}>
          <View style={tw`items-center mb-12`}>
            <Text style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 14,
              color: "#6366F1",
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Leadership
            </Text>
            <Text style={{
              fontFamily: "Poppins-Bold",
              fontSize: isLargeScreen ? 40 : 32,
              color: "#0F172A",
              textAlign: 'center',
              maxWidth: 600,
            }}>
              Meet the women behind the vision
            </Text>
          </View>

          <View style={[
            tw`flex-row flex-wrap`,
            {
              marginHorizontal: -12,
            }
          ]}>
            {teamImages.map((img, index) => (
              <View
                key={index}
                style={[
                  tw`p-3`,
                  {
                    width: isLargeScreen ? '25%' : isTablet ? '50%' : '100%',
                  }
                ]}
              >
                <View style={tw`relative`}>
                  <Image
                    source={{ uri: img }}
                    style={[
                      tw`rounded-2xl`,
                      {
                        width: '100%',
                        height: 280,
                      }
                    ]}
                    resizeMode="cover"
                  />
                  <View style={[
                    tw`absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl`,
                    {
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      borderTopWidth: 1,
                      borderTopColor: 'rgba(255,255,255,0.5)',
                    }
                  ]}>
                    <Text style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 16,
                      color: "#0F172A",
                    }}>
                      {["Sarah Johnson", "Michelle Auma", "Grace Mwangi", "Esther Okonkwo"][index]}
                    </Text>
                    <Text style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 13,
                      color: "#64748B",
                      marginTop: 2,
                    }}>
                      {["CEO & Founder", "Head of Community", "Director of Programs", "Regional Lead"][index]}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View> */}

        {/* ================= CTA SECTION ================= */}
        <View style={[
          tw`mt-16 mb-12`,
          { paddingHorizontal: horizontalPadding }
        ]}>
          <View style={[
            tw`p-12 rounded-3xl items-center`,
            {
              backgroundColor: '#0F172A',
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 50%)',
            }
          ]}>
            <Text style={{
              fontFamily: "Poppins-Bold",
              fontSize: isLargeScreen ? 40 : 32,
              color: "#FFFFFF",
              textAlign: 'center',
              maxWidth: 600,
              marginBottom: 16,
            }}>
              Ready to start your journey?
            </Text>
            <Text style={{
              fontFamily: "Poppins-Regular",
              fontSize: 16,
              color: "#94A3B8",
              textAlign: 'center',
              maxWidth: 500,
              marginBottom: 32,
            }}>
              Join thousands of women already growing with Asiyo
            </Text>
            <TouchableOpacity
              style={[
                tw`px-10 py-5 rounded-2xl`,
                {
                  backgroundColor: '#6366F1',
                  shadowColor: '#6366F1',
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 10 },
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => Linking.openURL("mailto:info@asiyo.org")}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#FFFFFF",
                    fontSize: 18,
                  }}
                >
                  Email us to learn more
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= FOOTER ================= */}
        <View style={[
          tw`py-8 border-t border-[#E2E8F0]`,
          { paddingHorizontal: horizontalPadding }
        ]}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={{
              fontFamily: "Poppins-Medium",
              fontSize: 14,
              color: "#64748B",
            }}>
              <Text style={tw`text-gray-500 text-sm`}>
                © {new Date().getFullYear()} Asiyo. All rights reserved.
              </Text>
            </Text>
            <View style={tw`flex-row`}>
              <TouchableOpacity style={tw`mr-4`}>
                <Ionicons name="logo-twitter" size={20} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={tw`mr-4`}>
                <Ionicons name="logo-linkedin" size={20} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="logo-instagram" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}