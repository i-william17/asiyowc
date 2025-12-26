//community/group-chat/[chatId].js
import { useLocalSearchParams } from "expo-router";
import GroupChatInterface from "../../../components/community/GroupChatInterface";

export default function GroupChatScreen() {
  const { chatId } = useLocalSearchParams();

  return <GroupChatInterface chatId={chatId} />;
}
