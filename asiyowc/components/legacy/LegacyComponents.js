// components/legacy/LegacyComponents.js
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    Dimensions,
    Linking,
    Platform
} from 'react-native';
import {
    Calendar,
    Quote,
    Award,
    Users,
    Heart,
    Play,
    BookOpen,
    ChevronLeft,
    Video,
    Mail,
    ExternalLink,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from "../../utils/tw";

const { width: screenWidth } = Dimensions.get('window');

// ========== Carousel Component ==========
import { BlurView } from "expo-blur";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate,
    FadeInDown
} from "react-native-reanimated";

export const Carousel = React.memo(({ data, renderItem }) => {
    const ITEM_WIDTH = screenWidth * 0.8;
    const SPACING = 14;
    const scrollX = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    return (
        <View style={{ height: 340 }}>
            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + SPACING}
                decelerationRate="fast"
                contentContainerStyle={{
                    paddingHorizontal: (screenWidth - ITEM_WIDTH) / 2,
                }}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {data.map((item, index) => {
                    const inputRange = [
                        (index - 1) * (ITEM_WIDTH + SPACING),
                        index * (ITEM_WIDTH + SPACING),
                        (index + 1) * (ITEM_WIDTH + SPACING),
                    ];

                    const animatedStyle = useAnimatedStyle(() => {
                        const scale = interpolate(
                            scrollX.value,
                            inputRange,
                            [0.82, 1, 0.82],
                            Extrapolate.CLAMP
                        );

                        const opacity = interpolate(
                            scrollX.value,
                            inputRange,
                            [0.45, 1, 0.45],
                            Extrapolate.CLAMP
                        );

                        const translateX = interpolate(
                            scrollX.value,
                            inputRange,
                            [-40, 0, 40],
                            Extrapolate.CLAMP
                        );

                        return {
                            transform: [{ scale }, { translateX }],
                            opacity,
                        };
                    });

                    return (
                        <Animated.View
                            key={item.id || index}
                            style={[
                                {
                                    width: ITEM_WIDTH,
                                    marginRight: SPACING,
                                },
                                animatedStyle,
                            ]}
                        >
                            {/* GLASS CARD */}
                            <BlurView
                                intensity={18}
                                tint="light"
                                style={{
                                    borderRadius: 28,
                                    overflow: "hidden",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.3)",
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    shadowColor: "#000",
                                    shadowOpacity: 0.25,
                                    shadowRadius: 22,
                                    shadowOffset: { width: 0, height: 14 },
                                    elevation: 14,
                                }}
                            >
                                {renderItem({ item, index })}
                            </BlurView>
                        </Animated.View>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
});

// ========== Achievement Carousel Item ==========
export const AchievementCarouselItem = React.memo(({ item }) => {
    const IconComponent = item.icon;

    return (
        <View style={{ height: 300 }}>
            {/* Background Image */}
            <Image
                source={{ uri: item.image }}
                style={tw`w-full h-full`}
                resizeMode="cover"
            />

            {/* Glass overlay tint */}
            <LinearGradient
                colors={[
                    "rgba(255,255,255,0.08)",
                    "rgba(255,255,255,0)",
                ]}
                style={tw`absolute inset-0`}
            />

            {/* Dark depth overlay */}
            <LinearGradient
                colors={[
                    "rgba(0,0,0,0.55)",
                    "rgba(48,12,72,0.7)",
                    "rgba(106,27,154,0.88)",
                ]}
                locations={[0, 0.55, 1]}
                style={tw`absolute inset-0`}
            />

            {/* Content */}
            <View style={tw`absolute inset-0 justify-end px-7 pb-7`}>
                <View style={tw`flex-row items-center mb-4`}>
                    <View
                        style={[
                            tw`items-center justify-center mr-4`,
                            {
                                width: 54,
                                height: 54,
                                borderRadius: 27,
                                backgroundColor: "rgba(255,255,255,0.22)",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.35)",
                            },
                        ]}
                    >
                        <IconComponent size={26} color="#FFF" />
                    </View>

                    <View
                        style={{
                            borderRadius: 999,
                            paddingHorizontal: 16,
                            paddingVertical: 4,
                            backgroundColor: "rgba(106,27,154,0.9)",
                        }}
                    >
                        <Text style={{ color: "#FFF", fontFamily: "Poppins-SemiBold" }}>
                            {item.year}
                        </Text>
                    </View>
                </View>

                <Text
                    style={[
                        tw`text-white mb-2`,
                        { fontFamily: "Poppins-Bold", fontSize: 22 },
                    ]}
                >
                    {item.title}
                </Text>

                <View style={tw`w-12 h-1 bg-purple-300 mb-3`} />

                <Text
                    style={[
                        tw`text-purple-100`,
                        { fontFamily: "Poppins-Regular", fontSize: 14 },
                    ]}
                    numberOfLines={3}
                >
                    {item.description}
                </Text>
            </View>
        </View>
    );
});

// ========== Timeline Carousel Item ==========
export const TimelineCarouselItem = React.memo(({ item, isFeatured }) => (
    <View style={[
        tw`rounded-2xl overflow-hidden shadow-lg`,
        isFeatured && tw`border-2 border-amber-400`
    ]}>
        <View style={tw`h-56 relative`}>
            <Image
                source={{ uri: item.image }}
                style={tw`w-full h-full`}
                resizeMode="cover"
            />
            <LinearGradient
                colors={['rgba(124, 58, 237, 0.85)', 'rgba(168, 85, 247, 0.7)']}
                style={tw`absolute inset-0`}
            />

            <View style={tw`absolute inset-0 p-6 justify-end`}>
                <View style={tw`flex-row items-center mb-3`}>
                    <Calendar size={20} color="#FFFFFF" />
                    <View style={[
                        tw`px-4 py-1 rounded-full ml-3`,
                        isFeatured ? tw`bg-amber-500` : tw`bg-purple-800/80`
                    ]}>
                        <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                            {item.year}
                        </Text>
                    </View>
                </View>

                <Text style={[tw`text-white text-2xl mb-3`, { fontFamily: 'Poppins-Bold' }]}>
                    {item.event}
                </Text>
                <Text style={[tw`text-purple-100 text-base leading-6`, { fontFamily: 'Poppins-Regular' }]}>
                    {item.description}
                </Text>
            </View>
        </View>
    </View>
));

// ========== Header Section with Back Button ==========
export const HeaderSection = ({ onBackPress }) => (
    <LinearGradient
        colors={["#6A1B9A", "#6A1B9A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
            tw`px-4 rounded-b-[36px]`,
            {
                paddingTop: 64,
                paddingBottom: 28,
                minHeight: 160,   // ⬅️ increased height
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 8,
            },
        ]}
    >
        <View style={tw`flex-row items-center`}>
            {/* Back Button */}
            <TouchableOpacity
                onPress={onBackPress}
                activeOpacity={0.7}
                style={tw`w-11 h-11 rounded-full bg-white/15 items-center justify-center`}
            >
                <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Title */}
            <View style={tw`flex-1 items-center px-3`}>
                <Text
                    style={[
                        tw`text-white text-xl`,
                        { fontFamily: "Poppins-Bold", letterSpacing: 0.3 },
                    ]}
                    numberOfLines={1}
                >
                    Digital Legacy Archive
                </Text>

                <Text
                    style={[
                        tw`text-purple-200 text-sm mt-1`,
                        { fontFamily: "Poppins-Regular" },
                    ]}
                >
                    Hon. Phoebe Asiyo’s Journey
                </Text>
            </View>

            {/* Spacer */}
            <View style={tw`w-11`} />
        </View>
    </LinearGradient>
);

// ========== Quote Card ==========
export const QuoteCard = React.memo(({ quote }) => (
    <Animated.View
        entering={FadeInDown}
        style={[
            tw`mb-6 rounded-3xl overflow-hidden`,
            {
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
            },
        ]}
    >
        {/* Glass Background */}
        <View
            style={[
                tw`p-7`,
                {
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.6)",
                },
            ]}
        >
            {/* Subtle highlight */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 120,
                    backgroundColor: "rgba(255,255,255,0.25)",
                }}
            />

            <View style={tw`flex-row`}>
                {/* Icon */}
                <View
                    style={[
                        tw`items-center justify-center mr-5`,
                        {
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: "rgba(255,215,0,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(255,215,0,0.35)",
                        },
                    ]}
                >
                    <Quote size={22} color="#D4AF37" />
                </View>

                {/* Text */}
                <View style={tw`flex-1`}>
                    <Text
                        style={[
                            tw`text-purple-900 mb-5`,
                            {
                                fontFamily: "Poppins-Italic",
                                fontSize: 18,
                                lineHeight: 30,
                            },
                        ]}
                    >
                        “{quote.text}”
                    </Text>

                    {/* Divider */}
                    <View style={tw`w-16 h-[2px] bg-purple-200 mb-4`} />

                    {/* Context */}
                    <Text
                        style={[
                            tw`text-purple-700`,
                            {
                                fontFamily: "Poppins-SemiBold",
                                fontSize: 13,
                                letterSpacing: 0.5,
                            },
                        ]}
                    >
                        — {quote.context}
                    </Text>
                </View>
            </View>
        </View>
    </Animated.View>
));


// ========== Life History Card ==========
export const LifeHistoryCard = React.memo(({ video }) => (
    <Animated.View
        entering={FadeInDown}
        style={tw`bg-white rounded-2xl overflow-hidden shadow-lg mb-4 border border-gray-100`}
    >
        <TouchableOpacity
            style={tw`relative`}
            activeOpacity={0.9}
            onPress={() => Linking.openURL(video.url)}
        >
            {/* Thumbnail */}
            <View style={tw`h-48 relative`}>
                <Image
                    source={{ uri: video.image }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                    style={tw`absolute inset-0`}
                />

                {/* Play Button */}
                <View style={tw`absolute inset-0 items-center justify-center`}>
                    <View style={tw`w-16 h-16 bg-white/90 rounded-full items-center justify-center 
                                shadow-lg`}>
                        <Play size={28} color="#7C3AED" />
                    </View>
                </View>

                {/* YouTube Badge */}
                <View style={tw`absolute top-4 right-4 bg-red-600 px-3 py-1 rounded-full 
                            flex-row items-center`}>
                    <Video size={14} color="#FFFFFF" />
                    <Text style={[tw`text-white text-xs ml-1`, { fontFamily: 'Poppins-SemiBold' }]}>
                        YouTube
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View style={tw`p-5`}>
                <View style={tw`flex-row justify-between items-start mb-3`}>
                    <Text style={[tw`text-purple-900 text-lg flex-1 mr-3`, { fontFamily: 'Poppins-Bold' }]}>
                        {video.title}
                    </Text>
                    <ExternalLink size={18} color="#7C3AED" />
                </View>

                <Text style={[tw`text-gray-600 text-sm mb-3`, { fontFamily: 'Poppins-Regular' }]}>
                    {video.description}
                </Text>

                <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center`}>
                        <Calendar size={14} color="#6B7280" />
                        <Text style={[tw`text-gray-500 text-xs ml-2`, { fontFamily: 'Poppins-Regular' }]}>
                            {video.date}
                        </Text>
                    </View>

                    <View style={tw`flex-row items-center`}>
                        <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                            {video.duration}
                        </Text>
                        <Text style={[tw`text-gray-500 text-xs mx-2`, { fontFamily: 'Poppins-Regular' }]}>
                            •
                        </Text>
                        <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                            {video.views.toLocaleString()} views
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    </Animated.View>
));

// ========== Impact Stats ==========
export const ImpactStats = () => (
    <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={tw`rounded-2xl p-8 mt-8 shadow-xl`}
    >
        <View style={tw`items-center mb-2`}>
            <Text style={[tw`text-2xl text-center mt-3 mb-2`, { fontFamily: "Poppins-Bold" }]}>
                <Text style={tw`text-white`}>Lasting </Text>
                <Text style={{ color: "#D4AF37" }}>Impact</Text>
            </Text>

            <Text style={[tw`text-purple-200 text-center mb-6`, { fontFamily: 'Poppins-Regular' }]}>
                A legacy measured in lives transformed
            </Text>
        </View>
        <View style={tw`flex-row flex-wrap`}>
            <View style={tw`w-1/2 items-center mb-8`}>
                <View style={tw`w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3`}>
                    <Users size={24} color="#FFFFFF" />
                </View>
                <Text style={[tw`text-white text-3xl my-2`, { fontFamily: 'Poppins-Bold' }]}>
                    50,000+
                </Text>
                <Text style={[tw`text-purple-200 text-sm text-center`, { fontFamily: 'Poppins-Regular' }]}>
                    Women Empowered
                </Text>
            </View>
            <View style={tw`w-1/2 items-center mb-8`}>
                <View style={tw`w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3`}>
                    <BookOpen size={24} color="#FFFFFF" />
                </View>
                <Text style={[tw`text-white text-3xl my-2`, { fontFamily: 'Poppins-Bold' }]}>
                    10,000+
                </Text>
                <Text style={[tw`text-purple-200 text-sm text-center`, { fontFamily: 'Poppins-Regular' }]}>
                    Girls Educated
                </Text>
            </View>
            <View style={tw`w-1/2 items-center`}>
                <View style={tw`w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3`}>
                    <Award size={24} color="#FFFFFF" />
                </View>
                <Text style={[tw`text-white text-3xl my-2`, { fontFamily: 'Poppins-Bold' }]}>
                    15+
                </Text>
                <Text style={[tw`text-purple-200 text-sm text-center`, { fontFamily: 'Poppins-Regular' }]}>
                    Awards & Honors
                </Text>
            </View>
            <View style={tw`w-1/2 items-center`}>
                <View style={tw`w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3`}>
                    <Heart size={24} color="#FFFFFF" />
                </View>
                <Text style={[tw`text-white text-3xl my-2`, { fontFamily: 'Poppins-Bold' }]}>
                    40+
                </Text>
                <Text style={[tw`text-purple-200 text-sm text-center`, { fontFamily: 'Poppins-Regular' }]}>
                    Years of Service
                </Text>
            </View>
        </View>
    </LinearGradient>
);

// ========== Hero Section ==========
export const HeroSection = () => (
    <View style={tw`bg-white mt-4 overflow-hidden`}>
        <View style={{ height: 480 }}>
            {/* Background Image */}
            <Image
                source={{
                    uri: "https://res.cloudinary.com/ducckh8ip/image/upload/v1765555535/WhatsApp_Image_2025-09-11_at_18.54.09_8b5d33ac_x9jzhn.jpg",
                }}
                style={tw`w-full h-full`}
                resizeMode="cover"
            />

            {/* Deep Corporate Overlay */}
            <LinearGradient
                colors={[
                    "rgba(0,0,0,0.65)",
                    "rgba(48,12,72,0.75)",
                    "rgba(106,27,154,0.92)",
                ]}
                locations={[0, 0.45, 1]}
                style={tw`absolute inset-0`}
            />

            {/* Subtle Texture Layer */}
            <LinearGradient
                colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
                style={tw`absolute inset-0`}
            />

            {/* Content */}
            <View style={tw`absolute inset-0 justify-end px-7 pb-12`}>
                {/* Eyebrow */}
                <Text
                    style={[
                        tw`uppercase tracking-widest mb-2`,
                        {
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 12,
                            color: "#D4AF37", // heritage gold
                            letterSpacing: 2.4,
                        },
                    ]}
                >
                    Digital Legacy Archive
                </Text>

                {/* Name */}
                <Text
                    style={[
                        tw`text-white`,
                        {
                            fontFamily: "Poppins-Bold",
                            fontSize: 34,
                            letterSpacing: 0.6,
                            lineHeight: 40,
                        },
                    ]}
                >
                    Hon. Phoebe Asiyo
                </Text>

                {/* Lifespan */}
                <Text
                    style={[
                        tw`text-purple-200 mt-1`,
                        { fontFamily: "Poppins-SemiBold", fontSize: 16 },
                    ]}
                >
                    1936 – 2025
                </Text>

                {/* Accent Rule */}
                <View style={tw`w-16 h-1 bg-[#D4AF37] mt-4 mb-6`} />

                {/* Title */}
                <Text
                    style={[
                        tw`text-white mb-4`,
                        {
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 20,
                            lineHeight: 26,
                        },
                    ]}
                >
                    Champion for Women’s Rights & Equality
                </Text>

                {/* Quote */}
                <Text
                    style={[
                        tw`text-purple-100`,
                        {
                            fontFamily: "Poppins-Italic",
                            fontSize: 16,
                            lineHeight: 26,
                        },
                    ]}
                >
                    “A trailblazer who dedicated her life to fighting for women’s rights,
                    land ownership, and educational opportunities across Kenya and Africa.”
                </Text>

                {/* Bottom Fade */}
                <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]}
                    style={tw`absolute left-0 right-0 bottom-0 h-24`}
                />
            </View>
        </View>
    </View>
);

// ========== Join Movement Card ==========
export const JoinMovementCard = () => (
    <View
        style={[
            tw`mt-8 rounded-3xl p-8 overflow-hidden`,
            {
                backgroundColor: "rgba(255,255,255,0.9)",
                borderWidth: 1,
                borderColor: "rgba(212,175,55,0.35)",
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 12 },
                elevation: 12,
            },
        ]}
    >
        {/* Subtle highlight */}
        <View
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 120,
                backgroundColor: "rgba(255,215,0,0.08)",
            }}
        />

        <View style={tw`items-center mb-8`}>
            {/* Icon */}
            <View
                style={[
                    tw`items-center justify-center mb-5`,
                    {
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "rgba(124,58,237,0.9)",
                        borderWidth: 2,
                        borderColor: "rgba(212,175,55,0.6)",
                    },
                ]}
            >
                <Users size={34} color="#FFFFFF" />
            </View>

            {/* Title */}
            <Text style={[tw`text-2xl text-center mb-4`, { fontFamily: "Poppins-Bold" }]}>
                <Text style={tw`text-purple-900`}>Join the </Text>
                <Text style={{ color: "#D4AF37" }}>Movement</Text>
            </Text>

            {/* Divider */}
            <View style={tw`w-16 h-[2px] bg-purple-200 mb-4`} />

            {/* Description */}
            <Text
                style={[
                    tw`text-gray-700 text-center leading-6`,
                    {
                        fontFamily: "Poppins-Regular",
                        maxWidth: 300,
                    },
                ]}
            >
                Be part of Hon. Phoebe Asiyo’s vision for empowered, educated, and
                economically independent women across Africa.
            </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL("mailto:join@asiyofoundation.org")}
            style={[
                tw`rounded-2xl overflow-hidden`,
                {
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 10,
                },
            ]}
        >
            <LinearGradient
                colors={["#7C3AED", "#D4AF37"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tw`py-5 flex-row items-center justify-center`}
            >
                <Mail size={20} color="#FFFFFF" style={tw`mr-3`} />
                <Text
                    style={[
                        tw`text-white text-lg`,
                        { fontFamily: "Poppins-SemiBold", letterSpacing: 0.4 },
                    ]}
                >
                    Get Involved via Email
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    </View>
);
