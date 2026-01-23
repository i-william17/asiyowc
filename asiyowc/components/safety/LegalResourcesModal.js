import { Modal, View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  Video,
  Link as LinkIcon,
  Download,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import tw from "../../utils/tw";

export default function LegalResourcesModal({ visible, onClose }) {
  const resources = [
    {
      section: "Know Your Rights",
      description:
        "Understand laws that protect women and survivors of gender-based violence.",
      items: [
        {
          title: "What To Do After Sexual Assault",
          type: "article",
          url: "https://www.who.int/news-room/fact-sheets/detail/violence-against-women",
        },
        {
          title: "Legal Steps After GBV (PDF)",
          type: "pdf",
          url: "https://www.unwomen.org/sites/default/files/Headquarters/Attachments/Sections/Library/Publications/2019/Handbook-on-effective-police-responses-to-violence-against-women-and-girls-en.pdf",
        },
      ],
    },
    {
      section: "Mental Health & Healing",
      description: "Trauma-informed resources to support emotional recovery.",
      items: [
        {
          title: "Coping With Trauma After Abuse (Video)",
          type: "video",
          url: "https://www.youtube.com/watch?v=Q0YMdL7Z5mE",
        },
        {
          title: "Mental Health Support Guide (PDF)",
          type: "pdf",
          url: "https://www.mhinnovation.net/sites/default/files/downloads/resource/Mental_Health_in_Humanitarian_Settings_WHO.pdf",
        },
      ],
    },
    {
      section: "Reproductive & Sexual Health",
      description:
        "Information on reproductive rights, consent, and post-assault care.",
      items: [
        {
          title: "Emergency Contraception & Care",
          type: "article",
          url: "https://www.unfpa.org/sexual-reproductive-health",
        },
        {
          title: "Post-Assault Medical Care (Video)",
          type: "video",
          url: "https://www.youtube.com/watch?v=Y6GzY6lJc2g",
        },
      ],
    },
    {
      section: "Reporting & Protection",
      description: "Steps you can take to report abuse and seek protection.",
      items: [
        {
          title: "How to Report GBV Safely",
          type: "article",
          url: "https://www.unwomen.org/en/what-we-do/ending-violence-against-women",
        },
        {
          title: "Protection Orders Explained (PDF)",
          type: "pdf",
          url: "https://www.legal-tools.org/doc/44a1d2/pdf/",
        },
      ],
    },
  ];

  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const getIcon = (type) => {
    if (type === "video") return <Video size={18} color="#7c3aed" />;
    if (type === "pdf") return <Download size={18} color="#7c3aed" />;
    return <LinkIcon size={18} color="#7c3aed" />;
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={tw`flex-1 bg-gray-50`}>
        {/* HEADER */}
        <View style={tw`bg-purple-700 pt-14 pb-6 rounded-b-3xl`}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            style={tw`absolute top-14 left-4 w-10 h-10 items-center justify-center bg-white/20 rounded-full`}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={tw`px-16 items-center`}>
            <Text style={[tw`text-white text-2xl text-center`, { fontFamily: "Poppins-SemiBold" }]}>
              Legal & Safety Resources
            </Text>
            <Text style={[tw`text-purple-100 mt-2 text-center`, { fontFamily: "Poppins-Regular" }]}>
              Information to help you stay safe, informed, and supported.
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView contentContainerStyle={tw`px-4 pt-6 pb-8`}>
          {resources.map((section, idx) => (
            <View key={idx} style={tw`mb-8`}>
              <Text style={[tw`text-purple-900 text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                {section.section}
              </Text>
              <Text style={[tw`text-gray-600 mt-1 mb-4`, { fontFamily: "Poppins-Regular" }]}>
                {section.description}
              </Text>

              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => openLink(item.url)}
                  activeOpacity={0.8}
                  style={tw`flex-row items-center gap-3 p-4 mb-3 bg-white rounded-2xl border border-gray-100`}
                >
                  <View style={tw`w-9 h-9 rounded-full bg-purple-100 items-center justify-center`}>
                    {getIcon(item.type)}
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[tw`flex-1 text-gray-800`, { fontFamily: "Poppins-Medium" }]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={tw`p-4 bg-purple-50 rounded-2xl`}>
            <Text style={[tw`text-sm text-gray-700 text-center`, { fontFamily: "Poppins-Regular" }]}>
              You are not required to take any action before you are ready.
              Support and help are always available.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
