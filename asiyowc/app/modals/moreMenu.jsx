import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import { useRouter } from 'expo-router';

export default function MoreMenu() {
  const router = useRouter();

  const menuItems = [
    { title: "Settings", icon: "settings", route: "/settings" },
    { title: "Help & Support", icon: "help-circle", route: "/support" },
    { title: "Referrals", icon: "gift", route: "/referrals" },
    { title: "Resources", icon: "book", route: "/resources" },
    { title: "About Asiyo", icon: "information-circle", route: "/about" },
  ];

  return (
    <View style={tw`flex-1 bg-white p-6`}>
      <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22, marginBottom: 20 }}>
        More Options
      </Text>

      <ScrollView>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={tw`flex-row items-center p-4 rounded-xl bg-gray-100 mb-3`}
            onPress={() => router.push(item.route)}
          >
            <Ionicons name={item.icon} size={26} color="#6A1B9A" />
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                fontSize: 16,
                marginLeft: 15,
              }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
