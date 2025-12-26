import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import tw from "../../../utils/tw";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import { fetchVoiceDetail } from "../../../store/slices/communitySlice";

export default function VoiceDetail() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { selectedVoice, loadingDetail, error } = useSelector((s) => s.community);

  useEffect(() => {
    dispatch(fetchVoiceDetail(id));
  }, [id]);

  if (loadingDetail) return <LoadingBlock />;
  if (!selectedVoice) return <EmptyState title="Voice room not found" subtitle={error || "Unavailable room."} />;

  const v = selectedVoice;

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22, color: "#111827" }}>
        {v.title}
      </Text>

      <View style={tw`bg-white rounded-2xl p-4 mt-5`}>
        <Text style={{ fontFamily: "Poppins-Regular", color: "#6B7280" }}>
          Host: {v.host?.name || "Host"}
        </Text>
        <Text style={{ fontFamily: "Poppins-Regular", marginTop: 8, color: "#6B7280" }}>
          Instances: {v.instances?.length ?? 0}
        </Text>
      </View>
    </ScrollView>
  );
}
