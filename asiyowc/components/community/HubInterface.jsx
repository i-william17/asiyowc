import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import tw from "../../utils/tw";
import { 
  fetchHubDetail, 
  sendHubUpdate, 
  joinHub, 
  leaveHub 
} from "../../store/slices/communitySlice";
import LoadingBlock from "./LoadingBlock";
import EmptyState from "./EmptyState";

export default function HubInterface({ hubId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { selectedHub, loadingDetail, user } = useSelector(
    (s) => s.community
  );

  // Assuming user data includes role information
  const isModerator = user?.role === "moderator" || selectedHub?.isModerator;
  const isMember = selectedHub?.isMember;

  /* ===========================
     FETCH HUB (READ-ONLY)
  =========================== */
  useEffect(() => {
    if (hubId) {
      dispatch(fetchHubDetail(hubId));
    }
  }, [hubId]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    
    try {
      setIsSending(true);
      await dispatch(sendHubUpdate({
        hubId,
        content: message,
        authorId: user.id,
        authorName: user.name,
        timestamp: new Date().toISOString(),
      })).unwrap();
      
      setMessage("");
      // Refresh hub data to show new message
      dispatch(fetchHubDetail(hubId));
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleJoinHub = async () => {
    try {
      await dispatch(joinHub(hubId)).unwrap();
      setShowMenu(false);
      Alert.alert("Success", "You have joined the hub!");
      dispatch(fetchHubDetail(hubId));
    } catch (error) {
      Alert.alert("Error", "Failed to join hub");
    }
  };

  const handleLeaveHub = async () => {
    Alert.alert(
      "Leave Hub",
      "Are you sure you want to leave this hub?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(leaveHub(hubId)).unwrap();
              setShowMenu(false);
              Alert.alert("Success", "You have left the hub");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to leave hub");
            }
          }
        }
      ]
    );
  };

  console.log("Selected Hub:", selectedHub, "Loading Detail:", loadingDetail);
  if (loadingDetail || !selectedHub) {
    return <LoadingBlock />;
  }

  const {
    name,
    description,
    avatar,
    membersCount = 0,
    type,
    region,
    updates = [],
  } = selectedHub;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ================= HEADER ================= */}
        <View style={tw`bg-[#6A1B9A] px-6 pt-14 pb-8 rounded-b-3xl`}>
          {/* Back and Menu */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`p-2`}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={tw`p-2`}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hub Meta */}
          <View style={tw`flex-row items-center`}>
            <View
              style={tw`w-16 h-16 rounded-2xl overflow-hidden bg-purple-200 mr-4`}
            >
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={tw`w-full h-full`}
                />
              ) : (
                <View
                  style={tw`flex-1 items-center justify-center`}
                >
                  <Ionicons name="earth" size={28} color="#6A1B9A" />
                </View>
              )}
            </View>

            <View style={tw`flex-1`}>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 20,
                  color: "#fff",
                }}
              >
                {name}
              </Text>

              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  color: "#E9D5FF",
                  marginTop: 2,
                }}
              >
                {membersCount} members · {type?.toUpperCase()}
                {region ? ` · ${region}` : ""}
              </Text>
            </View>
          </View>

          {/* Description */}
          {description ? (
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 14,
                color: "#F3E8FF",
                marginTop: 14,
                lineHeight: 20,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {/* ================= CONTENT ================= */}
        <View style={tw`px-6 pt-6 pb-24`}>
          {/* Messages/Updates Feed */}
          {updates.length > 0 ? (
            <View style={tw`space-y-4`}>
              {updates.map((update, index) => (
                <View 
                  key={index} 
                  style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100`}
                >
                  <View style={tw`flex-row items-center mb-3`}>
                    <View style={tw`w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2`}>
                      <Ionicons name="megaphone" size={16} color="#6A1B9A" />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-["Poppins-SemiBold"] text-gray-800`}>
                        {update.authorName || "Moderator"}
                      </Text>
                      <Text style={tw`font-["Poppins-Regular"] text-xs text-gray-500`}>
                        {new Date(update.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw`font-["Poppins-Regular"] text-gray-700`}>
                    {update.content}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No updates yet"
              subtitle="Announcements and hub updates will appear here."
            />
          )}
        </View>
      </ScrollView>

      {/* ================= MESSAGE INPUT ================= */}
      {isModerator ? (
        <View style={tw`px-4 pb-6 pt-4 border-t border-gray-200 bg-white`}>
          <View style={tw`flex-row items-center`}>
            <TextInput
              style={tw`flex-1 bg-gray-100 rounded-xl px-4 py-3 mr-3 font-["Poppins-Regular"]`}
              placeholder="Send an update to the hub..."
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!message.trim() || isSending}
              style={[
                tw`p-3 rounded-xl`,
                !message.trim() || isSending
                  ? tw`bg-purple-300`
                  : tw`bg-[#6A1B9A]`
              ]}
            >
              <Ionicons 
                name={isSending ? "time-outline" : "send"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
          <Text style={tw`text-xs text-gray-500 mt-2 text-center font-["Poppins-Regular"]`}>
            {message.length}/500
          </Text>
        </View>
      ) : (
        <View style={tw`px-4 pb-6 pt-4 border-t border-gray-200 bg-gray-50`}>
          <Text style={tw`text-center text-gray-600 font-["Poppins-Regular"]`}>
            Only moderators can send updates to this hub
          </Text>
        </View>
      )}

      {/* ================= SIDE MENU MODAL ================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={tw`flex-1`}>
          {/* Overlay */}
          <TouchableOpacity
            style={tw`flex-1 bg-black/50`}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          
          {/* Menu Panel */}
          <View style={tw`absolute top-0 right-0 bottom-0 w-4/5 bg-white shadow-xl`}>
            <View style={tw`p-6 pt-14`}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                style={tw`absolute top-6 right-6`}
              >
                <Ionicons name="close" size={28} color="#6A1B9A" />
              </TouchableOpacity>

              {/* Hub Info in Menu */}
              <View style={tw`flex-row items-center mb-8`}>
                <View style={tw`w-12 h-12 rounded-xl overflow-hidden bg-purple-100 mr-3`}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={tw`w-full h-full`}
                    />
                  ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                      <Ionicons name="earth" size={22} color="#6A1B9A" />
                    </View>
                  )}
                </View>
                <View>
                  <Text style={tw`font-["Poppins-Bold"] text-lg text-gray-800`}>
                    {name}
                  </Text>
                  <Text style={tw`font-["Poppins-Regular"] text-sm text-gray-600`}>
                    {type?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Menu Items */}
              <View style={tw`border-t border-gray-200 pt-4`}>
                {/* Hub Description */}
                {description && (
                  <View style={tw`mb-6`}>
                    <Text style={tw`font-["Poppins-SemiBold"] text-gray-700 mb-2`}>
                      About
                    </Text>
                    <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                      {description}
                    </Text>
                  </View>
                )}

                {/* Hub Stats */}
                <View style={tw`flex-row mb-6`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-["Poppins-Bold"] text-xl text-[#6A1B9A]`}>
                      {membersCount}
                    </Text>
                    <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                      Members
                    </Text>
                  </View>
                  {region && (
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-["Poppins-Bold"] text-xl text-[#6A1B9A]`}>
                        {region}
                      </Text>
                      <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                        Region
                      </Text>
                    </View>
                  )}
                </View>

                {/* Join/Leave Button */}
                <TouchableOpacity
                  onPress={isMember ? handleLeaveHub : handleJoinHub}
                  style={tw`mb-4 py-3 rounded-xl ${
                    isMember ? "bg-red-50" : "bg-[#6A1B9A]"
                  }`}
                >
                  <Text style={tw`text-center font-["Poppins-SemiBold"] ${
                    isMember ? "text-red-600" : "text-white"
                  }`}>
                    {isMember ? "Leave Hub" : "Join Hub"}
                  </Text>
                </TouchableOpacity>

                {/* Settings (for moderators) */}
                {isModerator && (
                  <TouchableOpacity
                    style={tw`py-3 rounded-xl border border-[#6A1B9A] mb-4`}
                    onPress={() => {
                      setShowMenu(false);
                      // Navigate to hub settings
                      // router.push(`/hub/${hubId}/settings`);
                    }}
                  >
                    <Text style={tw`text-center font-["Poppins-SemiBold"] text-[#6A1B9A]`}>
                      Hub Settings
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Report Hub */}
                <TouchableOpacity
                  style={tw`py-3`}
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert("Report Hub", "This feature is coming soon!");
                  }}
                >
                  <Text style={tw`text-center font-["Poppins-Regular"] text-gray-500`}>
                    Report Hub
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}