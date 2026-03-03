import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Linking,
    Alert,
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

const ResourceList = ({ resources = [], onDownload }) => {
    if (!resources || resources.length === 0) return null;

    const handlePress = async (resource) => {
        try {
            if (onDownload) {
                onDownload(resource);
            }

            const supported = await Linking.canOpenURL(resource.url);

            if (supported) {
                await Linking.openURL(resource.url);
            } else {
                Alert.alert("Unable to open link");
            }
        } catch (err) {
            console.log("Resource open error:", err);
        }
    };

    return (
        <View style={tw`mt-6`}>
            <Text
                style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 18,
                    marginBottom: 10,
                    marginLeft: 8,
                    color: "#1F2937",
                }}
            >
                Resources
            </Text>

            {resources.map((resource, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => handlePress(resource)}
                    style={tw`bg-gray-50 border border-gray-200 p-4 rounded-xl mb-3 flex-row items-center justify-between`}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontFamily: "Poppins-SemiBold",
                                fontSize: 15,
                                color: "#374151",
                            }}
                        >
                            {resource.title}
                        </Text>

                        {resource.description && (
                            <Text
                                style={{
                                    fontFamily: "Poppins-Regular",
                                    fontSize: 13,
                                    color: "#6B7280",
                                    marginTop: 4,
                                }}
                            >
                                {resource.description}
                            </Text>
                        )}
                    </View>

                    <Ionicons
                        name="download-outline"
                        size={22}
                        color="#6D28D9"
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

export default ResourceList;