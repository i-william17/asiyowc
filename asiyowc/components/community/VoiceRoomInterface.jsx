import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Status bar heights for dynamic padding
const headerPadTop = Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0);
const panelPadTop = Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 0) + 40;

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

// Helper to get initials from name
const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Avatar component with fallback to initials
const Avatar = ({ user, size = 'w-24 h-24', textSize = 'text-3xl' }) => {
    const [imageError, setImageError] = useState(false);

    if (user?.avatar && !imageError) {
        return (
            <Image
                source={{ uri: user.avatar }}
                style={tw`${size} rounded-full border-3 border-white/30`}
                onError={() => setImageError(true)}
            />
        );
    }

    // Fallback to initials with purple background
    const initials = getInitials(user?.name);
    const sizeClass = size;
    const textSizeClass = textSize;

    return (
        <View style={tw`${sizeClass} rounded-full bg-purple-600 border-3 border-white/30 items-center justify-center`}>
            <PoppinsTextSemibold style={tw`${textSizeClass} text-white`}>
                {initials}
            </PoppinsTextSemibold>
        </View>
    );
};

// Smaller avatar for lists
const SmallAvatar = ({ user }) => {
    const [imageError, setImageError] = useState(false);

    if (user?.avatar && !imageError) {
        return (
            <Image
                source={{ uri: user.avatar }}
                style={tw`w-14 h-14 rounded-full border-2 border-white/20`}
                onError={() => setImageError(true)}
            />
        );
    }

    const initials = getInitials(user?.name);

    return (
        <View style={tw`w-14 h-14 rounded-full bg-purple-600 border-2 border-white/20 items-center justify-center`}>
            <PoppinsTextSemibold style={tw`text-base text-white`}>
                {initials}
            </PoppinsTextSemibold>
        </View>
    );
};

// Sub-components with Poppins font
const SpeakerCard = ({ speaker, isHostView, currentUserId, onMute }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <View style={tw.style(
            'bg-white/5 border border-white/10 rounded-3xl p-5 items-center relative',
            speaker.isSpeaking && 'bg-emerald-500/10 border-emerald-500/30'
        )}>
            {speaker.isSpeaking && (
                <View style={tw`absolute top-0 left-0 right-0 bottom-0 rounded-3xl border-2 border-emerald-500/20`} />
            )}

            <View style={tw`relative mb-3`}>
                <Avatar user={speaker} size="w-24 h-24" textSize="text-3xl" />

                {speaker.isSpeaking && !speaker.isMuted && (
                    <View style={tw`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white items-center justify-center`}>
                        <Ionicons name="pulse" size={14} color="#fff" />
                    </View>
                )}

                {speaker.isMuted && (
                    <View style={tw`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-red-500 border-2 border-white items-center justify-center`}>
                        <Ionicons name="mic-off" size={14} color="#fff" />
                    </View>
                )}

                {speaker.isHost && (
                    <View style={tw`absolute -top-2 -left-2 w-8 h-8 rounded-full bg-amber-500 border-2 border-white items-center justify-center shadow-md shadow-black/30`}>
                        <Ionicons name="mic-circle" size={18} color="#fff" />
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
                        <View style={tw`flex-row items-center bg-emerald-500/20 px-3 py-1.5 rounded-3xl`}>
                            <Ionicons name="radio-button-on" size={12} color="#22c55e" />
                            <PoppinsText style={tw`text-xs ml-1.5 text-white`}>Speaking</PoppinsText>
                        </View>
                    ) : speaker.isMuted ? (
                        <View style={tw`flex-row items-center bg-red-500/20 px-3 py-1.5 rounded-3xl`}>
                            <Ionicons name="mic-off" size={12} color="#ef4444" />
                            <PoppinsText style={tw`text-xs ml-1.5 text-white`}>Muted</PoppinsText>
                        </View>
                    ) : (
                        <View style={tw`flex-row items-center bg-blue-500/20 px-3 py-1.5 rounded-3xl`}>
                            <Ionicons name="mic" size={12} color="#3b82f6" />
                            <PoppinsText style={tw`text-xs ml-1.5 text-white`}>Active</PoppinsText>
                        </View>
                    )}
                </View>
            </View>

            {isHostView && speaker.userId !== currentUserId && (
                <TouchableOpacity
                    style={tw.style(
                        'absolute top-3 right-3 w-10 h-10 rounded-full items-center justify-center shadow-md shadow-black/30',
                        speaker.isMuted ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                    onPress={onMute} // ✅ Fixed: now calls without args
                >
                    <Ionicons
                        name={speaker.isMuted ? "mic" : "mic-off"}
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const ListenerCard = ({ listener, isHostView, currentUserId, onApprove, onRemove }) => {
    return (
        <View style={tw`flex-row items-center bg-white/5 rounded-2xl p-4 mb-2`}>
            <View style={tw`relative`}>
                <SmallAvatar user={listener} />

                {listener.isRequestingSpeaker && (
                    <View style={tw`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border border-white items-center justify-center`}>
                        <Ionicons name="hand-left" size={10} color="#fff" />
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
                        <View style={tw`flex-row items-center bg-sky-500/20 px-2.5 py-1 rounded-3xl`}>
                            <Ionicons name="hand-left" size={12} color="#38bdf8" />
                            <PoppinsText style={tw`text-xs ml-1.5 text-white`}>Requesting</PoppinsText>
                        </View>
                    ) : (
                        <View style={tw`flex-row items-center bg-gray-400/20 px-2.5 py-1 rounded-3xl`}>
                            <Ionicons name="person" size={12} color="#9ca3af" />
                            <PoppinsText style={tw`text-xs ml-1.5 text-white`}>Listener</PoppinsText>
                        </View>
                    )}
                </View>
            </View>

            {isHostView && (
                <View style={tw`flex-row gap-2`}>
                    {listener.isRequestingSpeaker && (
                        <TouchableOpacity
                            style={tw`w-10 h-10 rounded-full bg-emerald-500 items-center justify-center shadow-md shadow-black/30`}
                            onPress={() => onApprove(listener.userId)}
                        >
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={tw`w-10 h-10 rounded-full bg-red-500 items-center justify-center shadow-md shadow-black/30`}
                        onPress={() => onRemove(listener.userId)}
                    >
                        <Ionicons name="remove-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const ChatMessage = ({ message, currentUserId }) => {
    const isOwnMessage = message.userId === currentUserId;
    
    // ✅ Safe timestamp handling
    const time = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '';

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
                    <PoppinsText style={tw`text-[10px] text-white/60`}>{time}</PoppinsText>
                    {isOwnMessage && (
                        <Ionicons name="checkmark" size={10} color="#a78bfa" style={tw`ml-1`} />
                    )}
                </View>
            </View>
        </View>
    );
};

// ✅ FIX 1: Normalization function with requestedToSpeak preservation
const normalizeUser = (u) => {
    if (!u) return null;

    // Case 1: Full user object with profile
    if (typeof u === "object" && u.profile) {
        return {
            _id: u._id,
            name: u.profile.fullName ?? "Unknown",
            avatar: u.profile.avatar?.url ?? null,
            isConnected: u.isConnected ?? true,
            isMuted: u.isMuted ?? false,
            requestedToSpeak: u.requestedToSpeak ?? u.isRequestingSpeaker ?? false, // ✅ Preserve request state
        };
    }

    // Case 2: Already normalized user
    if (typeof u === "object" && u.name && u.avatar !== undefined) {
        return {
            ...u,
            isMuted: u.isMuted ?? false,
            requestedToSpeak: u.requestedToSpeak ?? u.isRequestingSpeaker ?? false, // ✅ Preserve request state
        };
    }

    // Case 3: Fallback for string IDs
    return {
        _id: typeof u === "string" ? u : u?._id || 'unknown',
        name: "Unknown",
        avatar: null,
        isConnected: true,
        isMuted: false,
        requestedToSpeak: false,
    };
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
        onEnableChat,
        onDisableChat,
    } = props;

    const flatListRef = useRef(null);

    const room = voiceState?.room || {};
    const instance = voiceState?.instance || {};
    const myId = currentUser?._id || null;

    // ✅ Use Redux voiceState for chatEnabled (single source of truth)
    const chatEnabled = voiceState?.chatEnabled ?? true;

    // ✅ Memoized calculations for performance
    const {
        allParticipants,
        rawSpeakers,
        sortedSpeakers,
        listeners,
        connectedParticipantsCount,
        connectedListenersCount,
        messages,
        isHost,
        isSpeaker,
        isListener,
        canSpeak,
        canModerate,
        hostUser,
        hostAvatar
    } = useMemo(() => {
        const participants = Array.isArray(instance?.participants)
            ? instance.participants
                .map(normalizeUser)
                .filter(Boolean)
            : [];

        const speakers = Array.isArray(instance?.speakers)
            ? instance.speakers
                .map(normalizeUser)
                .filter(Boolean)
            : [];

        const hostId = room?.host?._id;
        const hostSpeaker = speakers.find(s => s._id === hostId);
        const otherSpeakers = speakers.filter(s => s._id !== hostId);

        const sorted = [];
        if (hostSpeaker) sorted.push(hostSpeaker);
        sorted.push(...otherSpeakers);

        const listenerList = participants.filter(p => 
            !speakers.some(s => s._id === p._id)
        );

        const connectedParticipants = participants.filter(p => p.isConnected).length;
        const connectedListeners = listenerList.filter(p => p.isConnected).length;

        const msgList = Array.isArray(voiceState?.messages)
            ? voiceState.messages
            : [];

        const isUserHost = room?.host?._id === myId;
        const isUserSpeaker = speakers.some(u => u?._id === myId);
        const isUserListener = listenerList.some(u => u?._id === myId);

        const hostUserObj = room?.host ?? null;
        const hostAvatarUrl = hostUserObj?.profile?.avatar?.url ?? null;

        return {
            allParticipants: participants,
            rawSpeakers: speakers,
            sortedSpeakers: sorted,
            listeners: listenerList,
            connectedParticipantsCount: connectedParticipants,
            connectedListenersCount: connectedListeners,
            messages: msgList,
            isHost: isUserHost,
            isSpeaker: isUserSpeaker,
            isListener: isUserListener,
            canSpeak: isUserHost || isUserSpeaker,
            canModerate: isUserHost,
            hostUser: hostUserObj,
            hostAvatar: hostAvatarUrl,
        };
    }, [instance, room, voiceState?.messages, myId]);

    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [activePanel, setActivePanel] = useState(null);
    const [panelAnim] = useState(new Animated.Value(width));

    // Scroll to bottom on new messages
    useEffect(() => {
        if (activePanel === 'chat' && messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length, activePanel]);

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
            if (chatEnabled) {
                onDisableChat?.();
            } else {
                onEnableChat?.();
            }
        }
    };

    const handleRequestToSpeak = () => {
        onRequestToSpeak();
    };

    const handleLeaveRoom = () => {
        onLeave();
    };

    // ✅ FIX 5: Pass intended mute state to callback
    const toggleSelfMute = () => {
        const next = !isMicMuted;
        setIsMicMuted(next);
        onMuteSelf?.(next);
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
                                isHost: item._id === room?.host?._id,
                                isMuted: item.isMuted,
                                isConnected: item.isConnected,
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
                        <View style={tw`items-center p-8 mt-4 bg-blue-500/10 border-2 border-blue-500/20 border-dashed rounded-2xl mx-2`}>
                            <View style={tw`w-24 h-24 rounded-full bg-sky-200/20 items-center justify-center mb-4`}>
                                <Ionicons name="headset" size={48} color="#93c5fd" />
                            </View>
                            <PoppinsTextSemibold style={tw`text-lg text-white mb-4`}>
                                You're listening
                            </PoppinsTextSemibold>
                            <TouchableOpacity
                                style={tw`flex-row items-center bg-blue-500 px-6 py-3 rounded-3xl gap-2`}
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

            {/* Top Header - ✅ FIX 2: Fixed dynamic padding */}
            <View style={[tw`bg-black/50 border-b border-white/10`, { paddingTop: headerPadTop }]}>
                <View style={tw`flex-row items-center justify-between px-4 py-4`}>
                    <TouchableOpacity
                        style={tw`w-12 h-12 rounded-full bg-white/10 items-center justify-center`}
                        onPress={handleLeaveRoom}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={tw`flex-1 flex-row items-center mx-3`}>
                        <View style={tw`relative`}>
                            <Avatar 
                                user={{ 
                                    name: room?.host?.profile?.fullName || "Host",
                                    avatar: hostAvatar 
                                }} 
                                size="w-14 h-14" 
                                textSize="text-xl" 
                            />
                            <View style={tw`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-white items-center justify-center`}>
                                <Ionicons name="mic-circle" size={14} color="#fff" />
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
                                    {sortedSpeakers.length} speaking • {connectedListenersCount} listening
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
                                {connectedListenersCount}
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
                        {/* ✅ FIX 2: Fixed dynamic padding */}
                        <View style={[tw`flex-1`, { paddingTop: panelPadTop }]}>
                            {activePanel === 'listeners' && (
                                <>
                                    <View style={tw`flex-row items-center justify-between px-4 py-4 border-b border-white/10`}>
                                        <View style={tw`flex-row items-center gap-3`}>
                                            <Ionicons name="people" size={28} color="#fff" />
                                            <PoppinsTextBold style={tw`text-xl text-white`}>
                                                Listeners ({listeners.length})
                                            </PoppinsTextBold>
                                        </View>
                                        <TouchableOpacity
                                            style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}
                                            onPress={() => togglePanel('listeners')}
                                        >
                                            <Ionicons name="close" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {/* Speakers Section */}
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
                                                            isConnected: speaker.isConnected,
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
                                                    {connectedListenersCount < listeners.length && 
                                                        ` • ${connectedListenersCount} connected`}
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
                                                    isConnected: item.isConnected,
                                                    isRequestingSpeaker: item.requestedToSpeak, // ✅ Now works
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
                                    <View style={tw`flex-row items-center justify-between px-4 py-4 border-b border-white/10`}>
                                        <View style={tw`flex-row items-center gap-3`}>
                                            <Ionicons name="chatbubbles" size={28} color="#fff" />
                                            <PoppinsTextBold style={tw`text-xl text-white`}>
                                                Voice Chat
                                            </PoppinsTextBold>
                                            {!chatEnabled && (
                                                <View style={tw`bg-red-500/20 px-2.5 py-1 rounded-3xl`}>
                                                    <PoppinsText style={tw`text-xs text-red-300`}>
                                                        Disabled
                                                    </PoppinsText>
                                                </View>
                                            )}
                                        </View>
                                        <View style={tw`flex-row items-center gap-2`}>
                                            {canModerate && (
                                                <TouchableOpacity
                                                    style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}
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
                                                style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}
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
                                        ref={flatListRef}
                                        data={messages}
                                        // ✅ FIX 4: Safe key extraction with fallbacks
                                        keyExtractor={(item, index) => 
                                            item._id ?? item.id ?? `msg-${item.timestamp ?? Date.now()}-${index}`
                                        }
                                        contentContainerStyle={tw`p-4`}
                                        renderItem={({ item }) => (
                                            <ChatMessage
                                                message={item}
                                                currentUserId={myId}
                                            />
                                        )}
                                        ListEmptyComponent={
                                            <View style={tw`items-center p-8`}>
                                                <View style={tw`w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4`}>
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

            {/* Bottom Controls with mute toggle */}
            <View style={tw`bg-black/50 border-t border-white/10 py-4`}>
                <View style={tw`flex-row items-center justify-center gap-4 mb-3`}>
                    {/* Mute button - icon changes based on mute state */}
                    <TouchableOpacity
                        style={tw.style(
                            'w-16 h-16 rounded-full items-center justify-center shadow-lg',
                            isMicMuted ? 'bg-red-500' : 'bg-emerald-500'
                        )}
                        onPress={toggleSelfMute}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isMicMuted ? "mic-off" : "mic"}
                            size={32}
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
                            style={tw`w-14 h-14 rounded-full bg-blue-500 items-center justify-center shadow-lg`}
                            onPress={handleRequestToSpeak}
                        >
                            <Ionicons name="hand-left" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <View style={tw`w-px h-8 bg-white/20`} />

                    <TouchableOpacity
                        style={tw`flex-row items-center bg-red-500 px-6 py-3 rounded-3xl gap-2 shadow-lg`}
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
                    <Ionicons name="wifi" size={14} color="#22c55e" />
                </View>
            </View>
        </SafeAreaView>
    );
}