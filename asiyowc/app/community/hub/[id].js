import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import tw from "../../../utils/tw";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import { fetchHubDetail } from "../../../store/slices/communitySlice";

export default function HubDetail() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { selectedHub, loadingDetail, error } = useSelector((s) => s.community);

  useEffect(() => {
    dispatch(fetchHubDetail(id));
  }, [id]);

  if (loadingDetail) return <LoadingBlock />;
  if (!selectedHub) return <EmptyState title="Hub not found" subtitle={error || "Unavailable hub."} />;

  const h = selectedHub;

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22, color: "#111827" }}>
        {h.name}
      </Text>

      <View style={tw`bg-white rounded-2xl p-4 mt-5`}>
        <Text style={{ fontFamily: "Poppins-Medium", color: "#7C3AED" }}>
          {h.members?.length ?? 0} members
        </Text>
        <Text style={{ fontFamily: "Poppins-Regular", marginTop: 8, color: "#6B7280" }}>
          Type: {h.type}
        </Text>
        {!!h.region && (
          <Text style={{ fontFamily: "Poppins-Regular", marginTop: 8, color: "#6B7280" }}>
            Region: {h.region}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
