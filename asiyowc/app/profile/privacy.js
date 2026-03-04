import React from "react";
import {
    View,
    Text,
    Platform,
    useWindowDimensions,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PrivacySecurity() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === "web";
    const isLargeScreen = width > 1024;
    const isTablet = width > 768 && width <= 1024;

    // Responsive content width
    const contentWidth = isWeb
        ? isLargeScreen
            ? Math.min(width * 0.45, 800)
            : isTablet
                ? width * 0.7
                : width - 48
        : width - 48;

    const horizontalPadding = isWeb && (isLargeScreen || isTablet)
        ? (width - contentWidth) / 2
        : 20;

    const sections = [
        {
            id: 1,
            title: "Data Protection Compliance",
            icon: "document-lock",
            color: "#6366F1",
            bgColor: "#EEF2FF",
            content:
                "This platform follows international cybersecurity standards and complies with Kenyan privacy regulations, particularly the Data Protection Act (2019). The law requires organizations to implement safeguards such as encryption, controlled data access, and secure storage of personal information to prevent data breaches or misuse.",
            regulations: ["GDPR Compliant", "ISO 27001 Certified", "DPA 2019 Compliant"],
        },
    ];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: "#F8FAFC" }}
            contentContainerStyle={{
                alignItems: "center",
                paddingVertical: 40,
            }}
            showsVerticalScrollIndicator={false}
        >
            {/* Header Section */}
            {/* Header Section */}
            <View
                style={{
                    width: "100%",
                    backgroundColor: "#FFFFFF",
                    borderBottomWidth: 1,
                    borderBottomColor: "#F1F5F9",
                    paddingHorizontal: horizontalPadding,
                    paddingVertical: 32,
                    marginBottom: 32,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        maxWidth: contentWidth,
                        alignSelf: "center",
                        width: "100%",
                    }}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 100,
                            backgroundColor: "#F1F5F9",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 16,
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#475569" />
                    </TouchableOpacity>

                    {/* Title Section */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {/* Shield Icon */}
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 16,
                                backgroundColor: "#EEF2FF",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 16,
                            }}
                        >
                            <Ionicons name="shield" size={28} color="#6366F1" />
                        </View>

                        <View>
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontFamily: "Poppins-Medium",
                                    color: "#6366F1",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 4,
                                }}
                            >
                                Trust & Safety
                            </Text>

                            <Text
                                style={{
                                    fontSize: isLargeScreen ? 36 : 28,
                                    fontFamily: "Poppins-Bold",
                                    color: "#0F172A",
                                    letterSpacing: -0.5,
                                }}
                            >
                                Privacy & Security
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Main Content */}
            <View
                style={{
                    width: "100%",
                    paddingHorizontal: horizontalPadding,
                }}
            >
                <View style={{ maxWidth: contentWidth, alignSelf: "center" }}>
                    {/* Introduction Card */}
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 24,
                            padding: 32,
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: "#F1F5F9",
                            shadowColor: "#000",
                            shadowOpacity: 0.02,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 4 },
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 18,
                                fontFamily: "Poppins-SemiBold",
                                color: "#0F172A",
                                marginBottom: 16,
                                lineHeight: 28,
                            }}
                        >
                            "Protecting user privacy and securing personal data are fundamental
                            principles of this platform."
                        </Text>
                        <Text
                            style={{
                                fontSize: 15,
                                fontFamily: "Poppins-Regular",
                                color: "#475569",
                                lineHeight: 26,
                            }}
                        >
                            Our system is designed using modern cybersecurity practices to ensure
                            that all user information is protected against unauthorized access,
                            misuse, or alteration. We employ a defense-in-depth approach with
                            multiple layers of security controls.
                        </Text>
                    </View>

                    {/* Sections */}
                    {sections.map((section) => (
                        <View
                            key={section.id}
                            style={{
                                backgroundColor: "#FFFFFF",
                                borderRadius: 24,
                                padding: 32,
                                marginBottom: 20,
                                borderWidth: 1,
                                borderColor: "#F1F5F9",
                                shadowColor: "#000",
                                shadowOpacity: 0.02,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 4 },
                            }}
                        >
                            {/* Section Header */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 24,
                                }}
                            >
                                <View
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 18,
                                        backgroundColor: section.bgColor,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: 16,
                                    }}
                                >
                                    <Ionicons name={section.icon} size={30} color={section.color} />
                                </View>
                                <View>
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            fontFamily: "Poppins-SemiBold",
                                            color: "#0F172A",
                                            marginBottom: 4,
                                        }}
                                    >
                                        {section.title}
                                    </Text>
                                    <View
                                        style={{
                                            width: 40,
                                            height: 3,
                                            backgroundColor: section.color,
                                            borderRadius: 2,
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Content */}
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontFamily: "Poppins-Regular",
                                    color: "#475569",
                                    lineHeight: 26,
                                    marginBottom: 24,
                                }}
                            >
                                {section.content}
                            </Text>

                            {/* Regulations Badges */}
                            {section.regulations && (
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        marginTop: 16,
                                    }}
                                >
                                    {section.regulations.map((reg, idx) => (
                                        <View
                                            key={idx}
                                            style={{
                                                backgroundColor: section.bgColor,
                                                paddingHorizontal: 16,
                                                paddingVertical: 8,
                                                borderRadius: 30,
                                                marginRight: 8,
                                                marginBottom: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontFamily: "Poppins-Medium",
                                                    color: section.color,
                                                }}
                                            >
                                                {reg}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Trust Badges */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-around",
                            marginTop: 16,
                            marginBottom: 32,
                        }}
                    >
                        {[
                            { icon: "lock-closed", label: "Top-Level Security" },
                            { icon: "eye-off", label: "Privacy First" },
                            { icon: "shield", label: "Data Protection" },
                        ].map((badge, idx) => (
                            <View key={idx} style={{ alignItems: "center" }}>
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 16,
                                        backgroundColor: "#F1F5F9",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons name={badge.icon} size={24} color="#475569" />
                                </View>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontFamily: "Poppins-Medium",
                                        color: "#64748B",
                                    }}
                                >
                                    {badge.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Footer Note */}
                    <View
                        style={{
                            backgroundColor: "#F1F5F9",
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 20,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontFamily: "Poppins-Regular",
                                color: "#475569",
                                textAlign: "center",
                                lineHeight: 22,
                            }}
                        >
                            This page was last updated on March 15, 2025. We regularly review
                            and update our security practices to ensure the highest level of
                            protection for our users.
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}