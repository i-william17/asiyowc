import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import tw from "../../utils/tw";

/* ============================================================
   MOCK DATA
============================================================ */

// ----- GROUPS -----
const MOCK_GROUPS = [
  {
    id: "grp_101",
    name: "Women in Tech - Africa",
    description:
      "A safe space for African women in software development, cybersecurity, and cloud engineering.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200",
    membersCount: 1842,
    topics: ["Tech", "Cybersecurity", "Cloud", "Career Growth"],
  },
  {
    id: "grp_102",
    name: "Financial Freedom Circle",
    description:
      "Learn about budgeting, saving, investing, and financial independence.",
    image:
      "https://images.unsplash.com/photo-1616587229648-6b33b4a629a3?q=80&w=1200",
    membersCount: 957,
    topics: ["Finance", "Savings", "Investing", "Money"],
  },
  {
    id: "grp_103",
    name: "Advocacy & Leadership Hub",
    description:
      "A leadership-focused community for women advocating for change.",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200",
    membersCount: 621,
    topics: ["Leadership", "Activism", "Public Speaking"],
  },
];

// ----- DIRECT MESSAGES -----
const MOCK_CONVERSATIONS = [
  {
    id: "chat_201",
    name: "Sarah Kimani",
    lastMessage: "Did you finish the leadership challenge?",
    timestamp: "2025-01-27T10:15:02Z",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    unreadCount: 2,
  },
  {
    id: "chat_202",
    name: "Aisha Mohammed",
    lastMessage: "I loved your post about financial discipline!",
    timestamp: "2025-01-27T09:48:06Z",
    avatar: "https://randomuser.me/api/portraits/women/75.jpg",
    unreadCount: 0,
  },
  {
    id: "chat_203",
    name: "Grace Wanjiku",
    lastMessage: "We should host a women-in-tech hackathon.",
    timestamp: "2025-01-26T16:24:33Z",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg",
    unreadCount: 1,
  },
];

// ----- VOICE ROOMS -----
const MOCK_VOICE_ROOMS = [
  {
    id: "voice_301",
    topic: "Breaking into Cybersecurity in Africa",
    host: "Naomi Achieng",
    participants: 128,
    image:
      "https://images.unsplash.com/photo-1581094651223-1efb89ab3aaa?q=80&w=1200",
    live: true,
  },
  {
    id: "voice_302",
    topic: "Women Leadership in 2025 — What’s Changing?",
    host: "Leila Hassan",
    participants: 89,
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200",
    live: false,
  },
];

// ----- GLOBAL / REGIONAL / COUNTRY HUBS -----
const MOCK_HUBS = [
  // GLOBAL
  {
    id: "hub_global_1",
    level: "Global",
    title: "Global Asiyo Hub",
    members: 8400,
    description:
      "The main hub connecting women from all regions for global empowerment initiatives.",
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200",
  },

  // REGIONAL
  {
    id: "hub_reg_ea_1",
    level: "Regional",
    title: "East Africa Hub",
    members: 2100,
    description: "Women across Kenya, Uganda, Tanzania, Rwanda, Burundi & South Sudan.",
    image:
      "https://images.unsplash.com/photo-1549144511-f099e773c147?q=80&w=1200",
  },
  {
    id: "hub_reg_wa_1",
    level: "Regional",
    title: "West Africa Hub",
    members: 1750,
    description:
      "Nigeria, Ghana, Senegal, Ivory Coast, Mali and more — united in empowerment.",
    image:
      "https://images.unsplash.com/photo-1551836022-4c4c79bbae18?q=80&w=1200",
  },

  // COUNTRY
  {
    id: "hub_ke_1",
    level: "Country",
    title: "Kenya Women Hub",
    members: 980,
    description:
      "Kenyan women leaders uplifting one another through community, education and opportunity.",
    image:
      "https://images.unsplash.com/photo-1522543558187-768b6df7b15a?q=80&w=1200",
  },
  {
    id: "hub_ng_1",
    level: "Country",
    title: "Nigeria Women Hub",
    members: 830,
    description:
      "Empowering Nigerian women across tech, business, advocacy & creative industries.",
    image:
      "https://images.unsplash.com/photo-1534604973900-c43ab4c2ad5d?q=80&w=1200",
  },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */

const CommunityScreen = () => {
  const router = useRouter();

  const [groups] = useState(MOCK_GROUPS);
  const [chats] = useState(MOCK_CONVERSATIONS);
  const [voiceRooms] = useState(MOCK_VOICE_ROOMS);
  const [hubs] = useState(MOCK_HUBS);

  const [activeTab, setActiveTab] = useState("groups");
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  /* ============================================================
     RENDER HUBS
  ============================================================= */

  const renderHubs = () => (
    <View style={tw`space-y-4`}>
      {hubs.map((hub) => (
        <View
          key={hub.id}
          style={tw`bg-white p-4 mb-4 rounded-2xl shadow-sm flex-row`}
        >
          <Image
            source={{ uri: hub.image }}
            style={tw`w-24 h-24 rounded-xl`}
          />

          <View style={tw`ml-4 flex-1`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 16,
                color: "#111827",
              }}
            >
              {hub.title}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                marginTop: 2,
                color: "#6B7280",
              }}
            >
              {hub.description}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Medium",
                marginTop: 4,
                color: "#7C3AED",
              }}
            >
              {hub.members} members
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  /* ============================================================
     OTHER TAB RENDERERS (Groups, Chats, Voice Rooms)
  ============================================================= */

  const renderGroups = () => (
    <View style={tw`space-y-4`}>
      {groups.map((g) => (
        <TouchableOpacity
          key={g.id}
          style={tw`bg-white p-4 mb-4 rounded-2xl shadow-sm flex-row`}
        >
          <Image source={{ uri: g.image }} style={tw`w-20 h-20 rounded-xl`} />
          <View style={tw`ml-4 flex-1`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#111827",
              }}
            >
              {g.name}
            </Text>
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                color: "#6B7280",
              }}
              numberOfLines={2}
            >
              {g.description}
            </Text>
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                color: "#9333EA",
                marginTop: 4,
              }}
            >
              {g.membersCount} members
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderChats = () => (
    <View style={tw`space-y-4`}>
      {chats.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={tw`bg-white p-4 mb-4 rounded-2xl shadow-sm flex-row items-center`}
        >
          <Image source={{ uri: c.avatar }} style={tw`w-14 h-14 rounded-full`} />

          <View style={tw`ml-4 flex-1`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#111827",
              }}
            >
              {c.name}
            </Text>
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#6B7280",
              }}
              numberOfLines={1}
            >
              {c.lastMessage}
            </Text>
          </View>

          {c.unreadCount > 0 && (
            <View style={tw`bg-purple-600 rounded-full px-3 py-1`}>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 12,
                  color: "white",
                }}
              >
                {c.unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderVoiceRooms = () => (
    <View style={tw`space-y-4`}>
      {voiceRooms.map((v) => (
        <View
          key={v.id}
          style={tw`bg-white p-4 mb-4 rounded-2xl shadow-sm flex-row`}
        >
          <Image source={{ uri: v.image }} style={tw`w-24 h-24 rounded-xl`} />

          <View style={tw`ml-4 flex-1`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#111827",
              }}
            >
              {v.topic}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              Host: {v.host}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Medium",
                color: "#9333EA",
                marginTop: 4,
              }}
            >
              {v.participants} listening
            </Text>

            {v.live && (
              <View style={tw`bg-red-500 px-3 py-1 rounded-full mt-2 w-20`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Bold",
                    color: "white",
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  LIVE 🔴
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  /* ============================================================
     MAIN UI
  ============================================================= */

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6A1B9A"]}
            tintColor="#6A1B9A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <LinearGradient
          colors={["#6A1B9A", "#8E24AA"]}
          style={tw`px-6 pt-16 pb-10 rounded-b-3xl shadow-sm`}
        >
          <View style={tw`flex-row justify-between items-center`}>
            <View>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 26,
                  color: "white",
                }}
              >
                Community
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  marginTop: 4,
                  color: "white",
                  opacity: 0.85,
                }}
              >
                Groups • Messages • Voice Rooms • Hubs
              </Text>
            </View>

            <TouchableOpacity
              style={tw`bg-white/20 p-3 rounded-2xl`}
              onPress={() => router.push("/modals/search")}
            >
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* TABS */}
        <View style={tw`px-1 -mt-4 mb-6`}>
          <View style={tw`bg-white rounded-2xl p-2 flex-row shadow-sm`}>
            {[
              { id: "groups", icon: "people", label: "Groups" },
              { id: "chats", icon: "chatbubbles", label: "Messages" },
              { id: "rooms", icon: "mic", label: "Rooms" },
              { id: "hubs", icon: "earth", label: "Hubs" },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[
                  tw`flex-1 py-3 rounded-xl flex-row justify-center items-center`,
                  activeTab === t.id ? tw`bg-purple-600` : tw`bg-transparent`,
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={activeTab === t.id ? "#fff" : "#6B7280"}
                />
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    marginLeft: 6,
                    color: activeTab === t.id ? "#fff" : "#6B7280",
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CONTENT */}
        <View style={tw`px-6 pb-10`}>
          {activeTab === "groups" && renderGroups()}
          {activeTab === "chats" && renderChats()}
          {activeTab === "rooms" && renderVoiceRooms()}
          {activeTab === "hubs" && renderHubs()}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default CommunityScreen;



// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   SafeAreaView,
//   TouchableOpacity,
//   Animated,
//   RefreshControl,
// } from 'react-native';
// import { useRouter } from 'expo-router';
// import { useSelector, useDispatch } from 'react-redux';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { fetchGroups } from '../../store/slices/communitySlice';
// import GroupCard from '../../components/community/GroupCard';
// import LottieLoader from '../../components/animations/LottieLoader';
// import AnimatedButton from '../../components/ui/AnimatedButton';
// import { FeedShimmer } from '../../components/ui/ShimmerLoader';
// import tw from '../../utils/tw';

// const CommunityScreen = () => {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const { groups, conversations, loading } = useSelector(state => state.community);
  
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState('groups');
//   const fadeAnim = useState(new Animated.Value(0))[0];

//   const tabs = [
//     { id: 'groups', name: 'Groups', icon: 'people' },
//     { id: 'chats', name: 'Messages', icon: 'chatbubbles' },
//     { id: 'voice', name: 'Voice Rooms', icon: 'mic' },
//   ];

//   useEffect(() => {
//     loadData();
//     animateIn();
//   }, []);

//   const animateIn = () => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 800,
//       useNativeDriver: true,
//     }).start();
//   };

//   const loadData = async () => {
//     await dispatch(fetchGroups());
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadData();
//     setRefreshing(false);
//   };

//   const renderContent = () => {
//     switch (activeTab) {
//       case 'groups':
//         return renderGroups();
//       case 'chats':
//         return renderChats();
//       case 'voice':
//         return renderVoiceRooms();
//       default:
//         return renderGroups();
//     }
//   };

//   const renderGroups = () => {
//     if (loading) {
//       return <FeedShimmer />;
//     }

//     if (groups.length === 0) {
//       return (
//         <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
//           <LottieLoader type="connection" size={120} loop={false} />
//           <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
//             No groups yet
//           </Text>
//           <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
//             Join groups to connect with like-minded women
//           </Text>
//           <AnimatedButton
//             title="Explore Groups"
//             onPress={() => {}}
//             variant="primary"
//           />
//         </View>
//       );
//     }

//     return (
//       <View style={tw`space-y-4`}>
//         {groups.map((group, index) => (
//           <GroupCard 
//             key={group.id} 
//             group={group}
//             style={{
//               opacity: fadeAnim,
//               transform: [{
//                 translateY: fadeAnim.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [50 * (index + 1), 0],
//                 }),
//               }],
//             }}
//           />
//         ))}
//       </View>
//     );
//   };

//   const renderChats = () => {
//     return (
//       <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
//         <LottieLoader type="mentorship" size={120} loop={false} />
//         <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
//           Direct Messages
//         </Text>
//         <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
//           Connect one-on-one with community members
//         </Text>
//         <AnimatedButton
//           title="Start a Conversation"
//           onPress={() => {}}
//           variant="primary"
//         />
//       </View>
//     );
//   };

//   const renderVoiceRooms = () => {
//     return (
//       <View style={tw`bg-white rounded-2xl p-8 items-center shadow-sm`}>
//         <LottieLoader type="empowerment" size={120} loop={false} />
//         <Text style={tw`text-lg text-gray-500 mt-4 text-center font-medium`}>
//           Voice Rooms
//         </Text>
//         <Text style={tw`text-gray-400 text-center mt-2 mb-6`}>
//           Join live audio conversations with the community
//         </Text>
//         <AnimatedButton
//           title="Explore Voice Rooms"
//           onPress={() => {}}
//           variant="gold"
//         />
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={tw`flex-1 bg-gray-50`}>
//       <Animated.ScrollView
//         style={{ opacity: fadeAnim }}
//         refreshControl={
//           <RefreshControl 
//             refreshing={refreshing} 
//             onRefresh={onRefresh}
//             colors={['#6A1B9A']}
//             tintColor="#6A1B9A"
//           />
//         }
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Header */}
//         <LinearGradient
//           colors={['#6A1B9A', '#8E24AA']}
//           style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
//         >
//           <View style={tw`flex-row justify-between items-center mb-6`}>
//             <View>
//               <Text style={tw`text-2xl font-bold text-white`}>
//                 Community
//               </Text>
//               <Text style={tw`text-white opacity-90 mt-1`}>
//                 Connect with women worldwide
//               </Text>
//             </View>
//             <TouchableOpacity
//               style={tw`bg-white bg-opacity-20 p-3 rounded-2xl`}
//               onPress={() => router.push('/modals/create-post')}
//             >
//               <Ionicons name="search" size={24} color="white" />
//             </TouchableOpacity>
//           </View>
//         </LinearGradient>

//         {/* Tab Navigation */}
//         <View style={tw`px-6 -mt-4 mb-6`}>
//           <View style={tw`bg-white rounded-2xl p-2 shadow-corporate`}>
//             <View style={tw`flex-row`}>
//               {tabs.map((tab) => (
//                 <TouchableOpacity
//                   key={tab.id}
//                   style={[
//                     tw`flex-1 flex-row items-center justify-center py-3 rounded-xl`,
//                     activeTab === tab.id 
//                       ? tw`bg-purple-500` 
//                       : tw`bg-transparent`
//                   ]}
//                   onPress={() => setActiveTab(tab.id)}
//                 >
//                   <Ionicons 
//                     name={tab.icon} 
//                     size={20} 
//                     color={activeTab === tab.id ? 'white' : '#6B7280'} 
//                   />
//                   <Text 
//                     style={[
//                       tw`ml-2 font-medium`,
//                       activeTab === tab.id ? tw`text-white` : tw`text-gray-600`
//                     ]}
//                   >
//                     {tab.name}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>

//         {/* Content */}
//         <View style={tw`px-6 pb-8`}>
//           {renderContent()}
//         </View>
//       </Animated.ScrollView>
//     </SafeAreaView>
//   );
// };

// export default CommunityScreen;