import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    FlatList,
    Modal,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingBlock from './LoadingBlock';
import tw from "../../utils/tw";

const { width, height } = Dimensions.get('window');

// Create a custom Text component with Poppins font
const PoppinsText = ({ style, children, ...props }) => (
    <Text style={[{ fontFamily: 'Poppins-Regular' }, style]} {...props}>
        {children}
    </Text>
);

const PoppinsTextBold = ({ style, children, ...props }) => (
    <Text style={[{ fontFamily: 'Poppins-Bold' }, style]} {...props}>
        {children}
    </Text>
);

const PoppinsTextSemibold = ({ style, children, ...props }) => (
    <Text style={[{ fontFamily: 'Poppins-SemiBold' }, style]} {...props}>
        {children}
    </Text>
);

const PoppinsTextMedium = ({ style, children, ...props }) => (
    <Text style={[{ fontFamily: 'Poppins-Medium' }, style]} {...props}>
        {children}
    </Text>
);

// Sub-components with Poppins font
const SpeakerCard = ({ speaker, isHostView, currentUserId, onMute }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <View style={tw.style(
            'bg-white/5 border border-white/10 rounded-3xl p-4 items-center relative',
            speaker.isSpeaking && 'bg-emerald-500/10 border-emerald-500/30'
        )}>
            {speaker.isSpeaking && (
                <View style={tw`absolute top-0 left-0 right-0 bottom-0 rounded-3xl border-2 border-emerald-500/20`} />
            )}

            <View style={tw`relative mb-3`}>
                <Image
                    source={{ uri: speaker.avatar }}
                    style={tw`w-20 h-20 rounded-full border-2 border-white/30`}
                />

                {speaker.isSpeaking && !speaker.isMuted && (
                    <View style={tw`absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white items-center justify-center`}>
                        <Ionicons name="pulse" size={10} color="#fff" />
                    </View>
                )}

                {speaker.isMuted && (
                    <View style={tw`absolute bottom-0 right-0 w-6 h-6 rounded-full bg-red-500 border-2 border-white items-center justify-center`}>
                        <Ionicons name="mic-off" size={10} color="#fff" />
                    </View>
                )}

                {speaker.isHost && (
                    <View style={tw`absolute -top-1 -left-1 w-8 h-8 rounded-full bg-amber-500 border-2 border-white items-center justify-center shadow-md shadow-black/30`}>
                        <Ionicons name="mic-circle" size={20} color="#fff" />
                    </View>
                )}
            </View>

            <View style={tw`items-center w-full`}>
                <PoppinsTextSemibold style={tw`text-sm text-white text-center mb-2`} numberOfLines={1}>
                    {speaker.name}
                    {speaker.userId === currentUserId && ' (You)'}
                </PoppinsTextSemibold>

                <View style={tw`flex-row justify-center`}>
                    {speaker.isSpeaking ? (
                        <View style={tw`flex-row items-center bg-emerald-500/20 px-2 py-1 rounded-3xl`}>
                            <Ionicons name="radio-button-on" size={10} color="#22c55e" />
                            <PoppinsText style={tw`text-xs ml-1 text-white`}>Speaking</PoppinsText>
                        </View>
                    ) : speaker.isMuted ? (
                        <View style={tw`flex-row items-center bg-red-500/20 px-2 py-1 rounded-3xl`}>
                            <Ionicons name="mic-off" size={10} color="#ef4444" />
                            <PoppinsText style={tw`text-xs ml-1 text-white`}>Muted</PoppinsText>
                        </View>
                    ) : (
                        <View style={tw`flex-row items-center bg-blue-500/20 px-2 py-1 rounded-3xl`}>
                            <Ionicons name="mic" size={10} color="#3b82f6" />
                            <PoppinsText style={tw`text-xs ml-1 text-white`}>Active</PoppinsText>
                        </View>
                    )}
                </View>
            </View>

            {isHostView && speaker.userId !== currentUserId && (
                <TouchableOpacity
                    style={tw.style(
                        'absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center shadow-md shadow-black/30',
                        speaker.isMuted ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                    onPress={() => onMute(speaker.userId)}
                >
                    <Ionicons
                        name={speaker.isMuted ? "mic" : "mic-off"}
                        size={16}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const ListenerCard = ({ listener, isHostView, currentUserId, onApprove, onRemove }) => {
    return (
        <View style={tw`flex-row items-center bg-white/5 rounded-2xl p-3 mb-2`}>
            <View style={tw`relative`}>
                <Image
                    source={{ uri: listener.avatar }}
                    style={tw`w-12 h-12 rounded-full border-2 border-white/20`}
                />

                {listener.isRequestingSpeaker && (
                    <View style={tw`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border border-white items-center justify-center`}>
                        <Ionicons name="hand-left" size={8} color="#fff" />
                    </View>
                )}
            </View>

            <View style={tw`flex-1 ml-3`}>
                <PoppinsTextSemibold style={tw`text-sm text-white mb-1`} numberOfLines={1}>
                    {listener.name}
                    {listener.userId === currentUserId && ' (You)'}
                </PoppinsTextSemibold>

                <View style={tw`flex-row`}>
                    {listener.isRequestingSpeaker ? (
                        <View style={tw`flex-row items-center bg-sky-500/20 px-2 py-1 rounded-3xl`}>
                            <Ionicons name="hand-left" size={10} color="#38bdf8" />
                            <PoppinsText style={tw`text-xs ml-1 text-white`}>Requesting to speak</PoppinsText>
                        </View>
                    ) : (
                        <View style={tw`flex-row items-center bg-gray-400/20 px-2 py-1 rounded-3xl`}>
                            <Ionicons name="person" size={10} color="#9ca3af" />
                            <PoppinsText style={tw`text-xs ml-1 text-white`}>Listener</PoppinsText>
                        </View>
                    )}
                </View>
            </View>

            {isHostView && (
                <View style={tw`flex-row gap-2`}>
                    {listener.isRequestingSpeaker && (
                        <TouchableOpacity
                            style={tw`w-8 h-8 rounded-full bg-emerald-500 items-center justify-center shadow-md shadow-black/30`}
                            onPress={() => onApprove(listener.userId)}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={tw`w-8 h-8 rounded-full bg-red-500 items-center justify-center shadow-md shadow-black/30`}
                        onPress={() => onRemove(listener.userId)}
                    >
                        <Ionicons name="remove-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const ChatMessage = ({ message, currentUserId }) => {
    const isOwnMessage = message.userId === currentUserId;
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <View style={tw.style(
            'mb-3',
            isOwnMessage ? 'items-end' : 'items-start'
        )}>
            {!isOwnMessage && (
                <PoppinsTextSemibold style={tw`text-xs text-white/70 mb-1 ml-2`}>
                    {message.userName}
                </PoppinsTextSemibold>
            )}
            <View style={tw.style(
                'p-3 rounded-2xl max-w-[80%]',
                isOwnMessage ? 'bg-indigo-600 rounded-br-sm' : 'bg-white/10 rounded-bl-sm'
            )}>
                <PoppinsText style={tw`text-sm text-white`}>{message.message}</PoppinsText>
                <View style={tw.style(
                    'flex-row items-center mt-1',
                    isOwnMessage ? 'justify-end' : 'justify-start'
                )}>
                    <PoppinsText style={tw`text-xs text-white/60`}>{time}</PoppinsText>
                    {isOwnMessage && (
                        <Ionicons name="checkmark" size={12} color="#a78bfa" style={tw`ml-1`} />
                    )}
                </View>
            </View>
        </View>
    );
};

// Main Component
export default function VoiceRoomInterface(props) {
    const {
        voiceId,
        currentUser,
        voiceState,
        onRequestToSpeak,
        onApproveSpeaker,
        onDemoteSpeaker,
        onMuteUser,
        onUnmuteUser,
        onSendChatMessage,
        onMuteSelf,
        onLeave,
    } = props;

    const room = voiceState?.room || {};
    const instance = voiceState?.instance || {};
    const myId = currentUser?._id || null;

    const normalizeUser = (u) => {
        if (!u) return null;

        // populated user
        if (typeof u === "object" && u.profile) {
            return {
                _id: u._id,
                name: u.profile.fullName ?? "Unknown",
                avatar: u.profile.avatar?.url ?? null,
            };
        }

        // Already normalized user
        if (typeof u === "object" && u.name && u.avatar !== undefined) {
            return u;
        }

        // fallback (ObjectId or broken object)
        return {
            _id: typeof u === "string" ? u : u?._id || 'unknown',
            name: "Unknown",
            avatar: null,
        };
    };

    // Get all participants
    const allParticipants = Array.isArray(instance?.participants)
        ? instance.participants
            .map(normalizeUser)
            .filter(Boolean)
        : [];

    // Get speakers
    const rawSpeakers = Array.isArray(instance?.speakers)
        ? instance.speakers
            .map(normalizeUser)
            .filter(Boolean)
        : [];

    // Separate host from other speakers
    const hostId = room?.host?._id;
    const hostSpeaker = rawSpeakers.find(s => s._id === hostId);
    const otherSpeakers = rawSpeakers.filter(s => s._id !== hostId);

    // Sort speakers: host first, then other speakers
    const sortedSpeakers = [];
    if (hostSpeaker) sortedSpeakers.push(hostSpeaker);
    sortedSpeakers.push(...otherSpeakers);

    // Get listeners (participants who are not speakers)
    const listeners = allParticipants.filter(p => 
        !rawSpeakers.some(s => s._id === p._id)
    );

    const messages = Array.isArray(voiceState?.messages)
        ? voiceState.messages
        : [];

    const isHost = room?.host?._id === myId;
    const isSpeaker = rawSpeakers.some(u => u?._id === myId);
    const isListener = listeners.some(u => u?._id === myId);
    const canSpeak = isHost || isSpeaker;
    const canModerate = isHost;

    const hostUser = room?.host ?? null;
    const hostAvatar = hostUser?.profile?.avatar?.url ?? null;

    const [activePanel, setActivePanel] = useState(null); // 'listeners' or 'chat'
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [panelAnim] = useState(new Animated.Value(width));

    const togglePanel = (panel) => {
        if (activePanel === panel) {
            Animated.timing(panelAnim, {
                toValue: width,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setActivePanel(null);
            });
        } else {
            setActivePanel(panel);
            Animated.timing(panelAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        onSendChatMessage(chatInput.trim());
        setChatInput("");
    };

    const handleToggleChat = () => {
        if (canModerate) {
            setChatEnabled(!chatEnabled);
        }
    };

    const handleMuteUser = (userId) => {
        console.log(`Mute user: ${userId}`);
    };

    const handleApproveSpeaker = (userId) => {
        console.log(`Approve speaker: ${userId}`);
    };

    const handleRemoveUser = (userId) => {
        console.log(`Remove user: ${userId}`);
    };

    const handleRequestToSpeak = () => {
        console.log('Requesting to speak...');
    };

    const handleLeaveRoom = () => {
        onLeave();
    };

    const renderSpeakersGrid = () => {
        const numColumns =
            width < 400 ? 2 :
                width < 600 ? 3 :
                    width < 900 ? 4 : 6;

        return (
            <FlatList
                data={sortedSpeakers}
                keyExtractor={(item) => item._id}
                numColumns={numColumns}
                contentContainerStyle={tw`p-4`}
                renderItem={({ item }) => (
                    <View style={tw`flex-1 min-w-[120px] max-w-[150px] m-2`}>
                        <SpeakerCard
                            speaker={{
                                userId: item._id,
                                name: item.name,
                                avatar: item.avatar,
                                isHost: item._id === hostId,
                                isMuted: item.isMuted,
                                isSpeaking: voiceState?.speakingUsers?.[item._id],
                            }}
                            isHostView={isHost}
                            currentUserId={myId}
                            onMute={() =>
                                item.isMuted
                                    ? onUnmuteUser(item._id)
                                    : onMuteUser(item._id)
                            }
                        />
                    </View>
                )}
                ListFooterComponent={
                    !canSpeak ? (
                        <View style={tw`items-center p-6 mt-4 bg-blue-500/10 border-2 border-blue-500/20 border-dashed rounded-2xl mx-2`}>
                            <View style={tw`w-20 h-20 rounded-full bg-sky-200/20 items-center justify-center mb-4`}>
                                <Ionicons name="headset" size={40} color="#93c5fd" />
                            </View>
                            <PoppinsTextSemibold style={tw`text-base text-white mb-4`}>
                                You're listening
                            </PoppinsTextSemibold>
                            <TouchableOpacity
                                style={tw`flex-row items-center bg-blue-500 px-5 py-3 rounded-3xl gap-2`}
                                onPress={handleRequestToSpeak}
                            >
                                <Ionicons name="hand-left" size={20} color="#fff" />
                                <PoppinsTextSemibold style={tw`text-sm text-white`}>
                                    Request to Speak
                                </PoppinsTextSemibold>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-indigo-950`}>
            <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

            {/* Top Header */}
            <View style={tw`bg-black/50 border-b border-white/10 pt-[${Platform.OS === 'ios' ? 0 : StatusBar.currentHeight}px]`}>
                <View style={tw`flex-row items-center justify-between px-4 py-3`}>
                    <TouchableOpacity
                        style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}
                        onPress={handleLeaveRoom}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={tw`flex-1 flex-row items-center mx-3`}>
                        <View style={tw`relative`}>
                            <Image
                                source={{ uri: hostAvatar }}
                                style={tw`w-12 h-12 rounded-full border-2 border-purple-500/50`}
                            />
                            <View style={tw`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white items-center justify-center`}>
                                <Ionicons name="mic-circle" size={12} color="#fff" />
                            </View>
                        </View>

                        <View style={tw`ml-3 flex-1`}>
                            <PoppinsTextBold style={tw`text-lg text-white`} numberOfLines={1}>
                                {room?.title ?? "Live Voice Room"}
                            </PoppinsTextBold>
                            <View style={tw`flex-row items-center mt-1`}>
                                <View style={tw`flex-row items-center bg-red-500/20 px-2 py-1 rounded-3xl mr-2`}>
                                    <Ionicons name="radio" size={10} color="#f87171" />
                                    <PoppinsTextSemibold style={tw`text-xs text-red-300 ml-1`}>
                                        LIVE
                                    </PoppinsTextSemibold>
                                </View>
                                <PoppinsText style={tw`text-xs text-white/60`}>
                                    {sortedSpeakers.length} speaking • {listeners.length} listening
                                </PoppinsText>
                            </View>
                        </View>
                    </View>

                    <View style={tw`flex-row gap-2`}>
                        <TouchableOpacity
                            style={tw.style(
                                'w-12 h-12 rounded-full items-center justify-center',
                                activePanel === 'listeners' ? 'bg-blue-500' : 'bg-white/10'
                            )}
                            onPress={() => togglePanel('listeners')}
                        >
                            <Ionicons
                                name="people"
                                size={24}
                                color={activePanel === 'listeners' ? '#fff' : '#d1d5db'}
                            />
                            <PoppinsText 
                                style={[
                                    tw`text-xs mt-0.5`,
                                    activePanel === 'listeners' 
                                        ? { color: '#fff' } 
                                        : { color: 'rgba(255, 255, 255, 0.8)' }
                                ]}
                            >
                                {listeners.length}
                            </PoppinsText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={tw.style(
                                'w-12 h-12 rounded-full items-center justify-center',
                                activePanel === 'chat' ? 'bg-blue-500' : 'bg-white/10',
                                !chatEnabled && 'bg-white/5'
                            )}
                            onPress={() => togglePanel('chat')}
                            disabled={!chatEnabled}
                        >
                            <Ionicons
                                name="chatbubbles"
                                size={24}
                                color={
                                    activePanel === 'chat' ? '#fff' :
                                        !chatEnabled ? '#6b7280' : '#d1d5db'
                                }
                            />
                            <PoppinsText 
                                style={[
                                    tw`text-xs mt-0.5`,
                                    activePanel === 'chat' 
                                        ? { color: '#fff' } 
                                        : !chatEnabled 
                                            ? { color: 'rgba(255, 255, 255, 0.4)' } 
                                            : { color: 'rgba(255, 255, 255, 0.8)' }
                                ]}
                            >
                                {messages.length}
                            </PoppinsText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Main Content - Speakers Grid */}
            <View style={tw`flex-1`}>
                {renderSpeakersGrid()}
            </View>

            {/* Side Panel - FIXED OVERLAY STRUCTURE */}
            {activePanel && (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { zIndex: 9999, elevation: 20 },
                    ]}
                    pointerEvents="box-none"
                >
                    {/* Backdrop */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => togglePanel(activePanel)}
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: "rgba(0,0,0,0.55)",
                                zIndex: 9998,
                            },
                        ]}
                    />

                    {/* Side Panel */}
                    <Animated.View
                        style={[
                            tw`absolute top-0 right-0 bottom-0 bg-black/90 border-l border-white/10 shadow-2xl`,
                            {
                                width: Math.min(width * 0.9, 400),
                                transform: [{ translateX: panelAnim }],
                                zIndex: 10000,
                                elevation: 25,
                            },
                        ]}
                    >
                        <View style={tw`flex-1 pt-[${Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 40}px]`}>
                            {activePanel === 'listeners' && (
                                <>
                                    <View style={tw`flex-row items-center justify-between px-4 py-3 border-b border-white/10`}>
                                        <View style={tw`flex-row items-center gap-3`}>
                                            <Ionicons name="people" size={24} color="#fff" />
                                            <PoppinsTextBold style={tw`text-xl text-white`}>
                                                Listeners ({listeners.length})
                                            </PoppinsTextBold>
                                        </View>
                                        <TouchableOpacity
                                            style={tw`w-8 h-8 rounded-full bg-white/10 items-center justify-center`}
                                            onPress={() => togglePanel('listeners')}
                                        >
                                            <Ionicons name="close" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {/* Speakers Section (Always at top) */}
                                    {sortedSpeakers.length > 0 && (
                                        <>
                                            <View style={tw`px-4 pt-4 pb-2`}>
                                                <PoppinsTextSemibold style={tw`text-sm text-white/80 mb-3`}>
                                                    Speakers ({sortedSpeakers.length})
                                                </PoppinsTextSemibold>
                                            </View>
                                            <ScrollView 
                                                style={tw`max-h-64`} 
                                                showsVerticalScrollIndicator={false}
                                                nestedScrollEnabled={true}
                                            >
                                                {sortedSpeakers.map(speaker => (
                                                    <ListenerCard
                                                        key={speaker._id}
                                                        listener={{
                                                            userId: speaker._id,
                                                            name: speaker.name,
                                                            avatar: speaker.avatar,
                                                            isRequestingSpeaker: false,
                                                        }}
                                                        isHostView={isHost}
                                                        currentUserId={myId}
                                                        onApprove={() => onApproveSpeaker(speaker._id)}
                                                        onRemove={() => onDemoteSpeaker(speaker._id)}
                                                    />
                                                ))}
                                            </ScrollView>
                                            <View style={tw`px-4 pt-4 pb-2 border-t border-white/10`}>
                                                <PoppinsTextSemibold style={tw`text-sm text-white/80 mb-3`}>
                                                    Listeners ({listeners.length})
                                                </PoppinsTextSemibold>
                                            </View>
                                        </>
                                    )}
                                    
                                    <PoppinsText style={tw`text-xs text-white/60 px-4 py-2`}>
                                        People currently in the room
                                    </PoppinsText>

                                    <FlatList
                                        data={listeners}
                                        keyExtractor={(item) => item._id}
                                        contentContainerStyle={tw`p-4 pt-0`}
                                        renderItem={({ item }) => (
                                            <ListenerCard
                                                listener={{
                                                    userId: item._id,
                                                    name: item.name,
                                                    avatar: item.avatar,
                                                    isRequestingSpeaker: item.requestedToSpeak,
                                                }}
                                                isHostView={isHost}
                                                currentUserId={myId}
                                                onApprove={() => onApproveSpeaker(item._id)}
                                                onRemove={() => onDemoteSpeaker(item._id)}
                                            />
                                        )}
                                        ListHeaderComponent={sortedSpeakers.length > 0 ? null : undefined}
                                    />
                                </>
                            )}

                            {activePanel === 'chat' && (
                                <>
                                    <View style={tw`flex-row items-center justify-between px-4 py-3 border-b border-white/10`}>
                                        <View style={tw`flex-row items-center gap-3`}>
                                            <Ionicons name="chatbubbles" size={24} color="#fff" />
                                            <PoppinsTextBold style={tw`text-xl text-white`}>
                                                Voice Chat
                                            </PoppinsTextBold>
                                            {!chatEnabled && (
                                                <View style={tw`bg-red-500/20 px-2 py-1 rounded-3xl`}>
                                                    <PoppinsText style={tw`text-xs text-red-300`}>
                                                        Disabled
                                                    </PoppinsText>
                                                </View>
                                            )}
                                        </View>
                                        <View style={tw`flex-row items-center gap-2`}>
                                            {canModerate && (
                                                <TouchableOpacity
                                                    style={tw`w-8 h-8 rounded-full bg-white/10 items-center justify-center`}
                                                    onPress={handleToggleChat}
                                                >
                                                    <Ionicons
                                                        name={chatEnabled ? "lock-closed" : "lock-open"}
                                                        size={20}
                                                        color="#fff"
                                                    />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={tw`w-8 h-8 rounded-full bg-white/10 items-center justify-center`}
                                                onPress={() => togglePanel('chat')}
                                            >
                                                <Ionicons name="close" size={24} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <PoppinsText style={tw`text-xs text-white/60 px-4 py-2`}>
                                        Messages disappear when room ends
                                    </PoppinsText>

                                    <FlatList
                                        data={messages}
                                        keyExtractor={(item) => item._id}
                                        contentContainerStyle={tw`p-4`}
                                        inverted={false}
                                        renderItem={({ item }) => (
                                            <ChatMessage
                                                message={item}
                                                currentUserId={myId}
                                            />
                                        )}
                                        ListEmptyComponent={
                                            <View style={tw`items-center p-10`}>
                                                <View style={tw`w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4`}>
                                                    <Ionicons name="chatbubble" size={40} color="#9ca3af" />
                                                </View>
                                                <PoppinsTextSemibold style={tw`text-base text-white mb-2`}>
                                                    No messages yet
                                                </PoppinsTextSemibold>
                                                <PoppinsText style={tw`text-xs text-white/60 text-center`}>
                                                    {chatEnabled
                                                        ? "Be the first to send a message!"
                                                        : "Chat is currently disabled by the host"
                                                    }
                                                </PoppinsText>
                                            </View>
                                        }
                                    />

                                    {chatEnabled && (
                                        <View style={tw`flex-row p-4 border-t border-white/10 gap-2`}>
                                            <TextInput
                                                style={[
                                                    tw`flex-1 bg-white/10 border border-white/20 rounded-3xl px-4 py-3 text-white text-sm`,
                                                    { fontFamily: 'Poppins-Regular' }
                                                ]}
                                                value={chatInput}
                                                onChangeText={setChatInput}
                                                placeholder="Type a message..."
                                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                                maxLength={200}
                                                multiline={false}
                                            />
                                            <TouchableOpacity
                                                style={tw.style(
                                                    'flex-row items-center bg-violet-500 px-5 py-3 rounded-3xl gap-2',
                                                    !chatInput.trim() && 'opacity-50'
                                                )}
                                                onPress={handleSendMessage}
                                                disabled={!chatInput.trim()}
                                            >
                                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                                                <PoppinsTextSemibold style={tw`text-sm text-white`}>
                                                    Send
                                                </PoppinsTextSemibold>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Bottom Controls */}
            <View style={tw`bg-black/50 border-t border-white/10 py-4`}>
                <View style={tw`flex-row items-center justify-center gap-4 mb-3`}>
                    <TouchableOpacity
                        style={tw.style(
                            'w-16 h-16 rounded-full items-center justify-center',
                            isMicMuted ? 'bg-red-500' : 'bg-emerald-500'
                        )}
                        onPress={() => onMuteSelf()}
                    >
                        <Ionicons
                            name={isMicMuted ? "mic-off" : "mic"}
                            size={28}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={tw.style(
                            'w-14 h-14 rounded-full bg-white/10 items-center justify-center',
                            isOutputMuted && 'bg-red-500/30'
                        )}
                        onPress={() => setIsOutputMuted(!isOutputMuted)}
                    >
                        <Ionicons
                            name={isOutputMuted ? "volume-mute" : "volume-high"}
                            size={24}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    {!canSpeak && (
                        <TouchableOpacity
                            style={tw`w-14 h-14 rounded-full bg-blue-500 items-center justify-center`}
                            onPress={handleRequestToSpeak}
                        >
                            <Ionicons name="hand-left" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <View style={tw`w-px h-8 bg-white/20`} />

                    <TouchableOpacity
                        style={tw`flex-row items-center bg-red-500 px-5 py-3 rounded-3xl gap-2`}
                        onPress={handleLeaveRoom}
                    >
                        <Ionicons name="exit" size={20} color="#fff" />
                        <PoppinsTextSemibold style={tw`text-sm text-white`}>
                            Leave
                        </PoppinsTextSemibold>
                    </TouchableOpacity>
                </View>

                <View style={tw`flex-row items-center justify-center gap-2`}>
                    <View style={tw.style(
                        'w-3 h-3 rounded-full',
                        isMicMuted ? 'bg-red-500' : 'bg-emerald-500'
                    )} />
                    <PoppinsText style={tw`text-xs text-white/80`}>
                        {isMicMuted ? 'Microphone muted' : 'Microphone active'}
                        {isOutputMuted && ' • Output muted'}
                        {isHost && ' • You are the host'}
                    </PoppinsText>
                    <Ionicons name="wifi" size={16} color="#22c55e" />
                </View>
            </View>
        </SafeAreaView>
    );
};