// app/community/hub/[id].js
import { useLocalSearchParams } from "expo-router";
import HubInterface from "../../../components/community/HubInterface";

export default function HubScreen() {
  const { id } = useLocalSearchParams();

  return <HubInterface hubId={id} />;
}
