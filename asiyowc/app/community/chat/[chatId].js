// app/community/chat/[chatId].js
import { useLocalSearchParams } from "expo-router";
import ChatInterface from "../../../components/community/ChatInterface";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();

  return <ChatInterface chatId={chatId} />;
}
