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
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import { clearVoiceChatToast } from "../../store/slices/communitySlice";
import LoadingBlock from './LoadingBlock';
import tw from "../../utils/tw";

const { height } = Dimensions.get('window');

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
const SpeakerCard = ({ speaker, isHostView, currentUserId, onMute, onModerate }) => {
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
                <View style={tw`absolute top-3 right-3 flex-row gap-2`}>
                    <TouchableOpacity
                        style={tw.style(
                            'w-10 h-10 rounded-full items-center justify-center shadow-md shadow-black/30',
                            speaker.isMuted ? 'bg-emerald-500' : 'bg-red-500'
                        )}
                        onPress={onMute}
                    >
                        <Ionicons
                            name={speaker.isMuted ? "mic" : "mic-off"}
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={tw`w-10 h-10 rounded-full bg-amber-500 items-center justify-center shadow-md shadow-black/30`}
                        onPress={() => onModerate(speaker.userId, speaker.name, true)}
                    >
                        <Ionicons name="settings" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const ListenerCard = ({ listener, isHostView, currentUserId, onApprove, onModerate, isRequesting }) => {
    return (
        <View style={tw`flex-row items-center bg-white/5 rounded-2xl p-4 mb-2`}>
            <View style={tw`relative`}>
                <SmallAvatar user={listener} />

                {isRequesting && (
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
                    {isRequesting ? (
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
                    {isRequesting && (
                        <TouchableOpacity
                            style={tw`w-10 h-10 rounded-full bg-emerald-500 items-center justify-center shadow-md shadow-black/30`}
                            onPress={() => onApprove(listener.userId)}
                        >
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={tw`w-10 h-10 rounded-full bg-red-500 items-center justify-center shadow-md shadow-black/30`}
                        onPress={() => onModerate(listener.userId, listener.name, false)}
                    >
                        <Ionicons name="remove-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

// ✅ UPGRADED: ChatMessage with Host/Speaker badges
const ChatMessage = ({ message, currentUserId }) => {
    const isOwnMessage = message.userId === currentUserId;

    // Safe timestamp handling
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
                <View style={tw`flex-row items-center ml-2 mb-1`}>
                    <PoppinsTextSemibold style={tw`text-xs text-white/80 mr-2`}>
                        {message.userName}
                    </PoppinsTextSemibold>

                    {message.role === "host" && (
                        <View style={tw`bg-amber-500 px-2 py-0.5 rounded-full`}>
                            <PoppinsText style={tw`text-[10px] text-white`}>
                                HOST
                            </PoppinsText>
                        </View>
                    )}

                    {message.role === "speaker" && (
                        <View style={tw`bg-violet-600 px-2 py-0.5 rounded-full`}>
                            <PoppinsText style={tw`text-[10px] text-white`}>
                                SPEAKER
                            </PoppinsText>
                        </View>
                    )}
                </View>
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

// Confirm Modal Component for Speaker Requests
const ConfirmModal = ({ visible, title, message, confirmText, cancelText = "Decline", onConfirm, onCancel }) => {
    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={tw`flex-1 bg-black/70 justify-center items-center p-4`}>
                <View style={tw`bg-gray-900 rounded-3xl w-full max-w-sm border border-white/10`}>
                    <View style={tw`p-6 items-center`}>
                        <View style={tw`w-16 h-16 rounded-full bg-blue-500/20 items-center justify-center mb-4`}>
                            <Ionicons name="hand-left" size={32} color="#3b82f6" />
                        </View>

                        <PoppinsTextBold style={tw`text-xl text-white mb-2 text-center`}>
                            {title}
                        </PoppinsTextBold>

                        <PoppinsText style={tw`text-sm text-white/70 mb-6 text-center`}>
                            {message}
                        </PoppinsText>

                        <View style={tw`flex-row gap-3 w-full`}>
                            <TouchableOpacity
                                style={tw`flex-1 bg-red-500 py-4 rounded-2xl items-center`}
                                onPress={onCancel}
                            >
                                <PoppinsTextSemibold style={tw`text-white`}>
                                    {cancelText}
                                </PoppinsTextSemibold>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={tw`flex-1 bg-emerald-500 py-4 rounded-2xl items-center`}
                                onPress={onConfirm}
                            >
                                <PoppinsTextSemibold style={tw`text-white`}>
                                    {confirmText}
                                </PoppinsTextSemibold>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Moderation Modal Component
const ModerationModal = ({ visible, target, onClose, onDemote, onKick }) => {
    if (!visible || !target) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={tw`flex-1 bg-black/70 justify-center items-center p-4`}>
                <View style={tw`bg-gray-900 rounded-3xl w-full max-w-sm border border-white/10 p-6`}>
                    <View style={tw`items-center mb-4`}>
                        <View style={tw`w-16 h-16 rounded-full bg-amber-500/20 items-center justify-center mb-4`}>
                            <Ionicons name="settings" size={32} color="#f59e0b" />
                        </View>

                        <PoppinsTextBold style={tw`text-xl text-white mb-2 text-center`}>
                            Moderate User
                        </PoppinsTextBold>

                        <PoppinsText style={tw`text-sm text-white/70 mb-6 text-center`}>
                            Select an action for {target.name}
                        </PoppinsText>
                    </View>

                    {/* If Speaker → show Demote */}
                    {target.isSpeaker && (
                        <TouchableOpacity
                            style={tw`bg-amber-500 py-4 rounded-2xl items-center mb-3`}
                            onPress={() => {
                                onDemote?.(target.userId);
                                onClose();
                            }}
                        >
                            <PoppinsTextSemibold style={tw`text-white`}>
                                Demote to Listener
                            </PoppinsTextSemibold>
                        </TouchableOpacity>
                    )}

                    {/* Kick */}
                    <TouchableOpacity
                        style={tw`bg-red-500 py-4 rounded-2xl items-center mb-3`}
                        onPress={() => {
                            onKick?.(target.userId);
                            onClose();
                        }}
                    >
                        <PoppinsTextSemibold style={tw`text-white`}>
                            Kick Out
                        </PoppinsTextSemibold>
                    </TouchableOpacity>

                    {/* Cancel */}
                    <TouchableOpacity
                        style={tw`bg-white/10 py-4 rounded-2xl items-center`}
                        onPress={onClose}
                    >
                        <PoppinsTextSemibold style={tw`text-white`}>
                            Cancel
                        </PoppinsTextSemibold>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ✅ FIX #4: Safer Avatar Normalization
const normalizeUser = (u) => {
    if (!u) return null;

    // Case 1: Full user object with profile
    if (typeof u === "object" && u.profile) {
        return {
            _id: u._id,
            name: u.profile.fullName ?? "Unknown",
            avatar:
                typeof u.profile.avatar === "string"
                    ? u.profile.avatar
                    : u.profile.avatar?.url ?? null,
            isConnected: u.isConnected ?? true,
            isMuted: u.isMuted ?? false,
            // 🔴 REMOVED: requestedToSpeak - now from Redux voiceRequests only
        };
    }

    // Case 2: Already normalized user
    if (typeof u === "object" && u.name && u.avatar !== undefined) {
        return {
            ...u,
            isMuted: u.isMuted ?? false,
            // 🔴 REMOVED: requestedToSpeak - now from Redux voiceRequests only
        };
    }

    // Case 3: Fallback for string IDs
    return {
        _id: typeof u === "string" ? u : u?._id || 'unknown',
        name: "Unknown",
        avatar: null,
        isConnected: true,
        isMuted: false,
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
        onRemoveUser,
        onMuteUser,
        onUnmuteUser,
        onSendChatMessage,
        onMuteSelf,
        onLeave,
        onEnableChat,
        onDisableChat,
        onDeclineSpeaker,
        // ✅ NEW PROPS for output mute control
        isOutputMuted,
        onToggleOutputMute,
    } = props;

    // ✅ NEW: Redux dispatch and toast selector
    const dispatch = useDispatch();
    const chatToasts = useSelector(s => s.community.chatToasts || []);

    // ✅ FIX #2: Dynamic width for rotation support
    const { width } = useWindowDimensions();
    const [columns, setColumns] = useState(4);

    useEffect(() => {
        let next;

        if (width < 400) next = 2;
        else if (width < 600) next = 3;
        else if (width < 900) next = 4;
        else next = 6;

        setColumns(prev => (prev !== next ? next : prev));
    }, [width]);

    const flatListRef = useRef(null);

    // ✅ Toast animation and state
    const [visibleToast, setVisibleToast] = useState(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    // ✅ Toast effect
    useEffect(() => {
        if (!chatToasts.length) return;

        const latest = chatToasts[chatToasts.length - 1];
        setVisibleToast(latest);

        Animated.timing(toastAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                dispatch(clearVoiceChatToast(latest._id));
                setVisibleToast(null);
            });
        }, 6000);

        return () => clearTimeout(timer);
    }, [chatToasts]);

    // ✅ FIX #1: Stable Animated value using useRef
    const panelAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        panelAnim.setValue(width);
    }, []);

    const room = voiceState?.room || {};
    const instance = voiceState?.instance || {};
    const myId = currentUser?._id || null;

    // Get voice requests from Redux (ephemeral state)
    const voiceRequests = useSelector(s => s.community.voiceRequests || []);

    // Track current pending speaker request
    const [pendingRequest, setPendingRequest] = useState(null);

    // Track moderation target
    const [moderationTarget, setModerationTarget] = useState(null);

    // Use Redux voiceState for chatEnabled (single source of truth)
    const chatEnabled = voiceState?.chatEnabled ?? true;

    // Memoized calculations for performance - MUST come BEFORE the effect that uses isHost
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

        // ✅ FIX #5: Safer Host Avatar Extraction
        const hostAvatarUrl =
            typeof hostUserObj?.profile?.avatar === "string"
                ? hostUserObj.profile.avatar
                : hostUserObj?.profile?.avatar?.url ?? null;

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
    }, [
        instance?.participants,
        instance?.speakers,
        room?.host,
        voiceState?.messages,
        myId
    ]);

    // ✅ FIX #3: Fix Stale Closure in Pending Request Effect
    useEffect(() => {
        if (!isHost) return;

        if (!voiceRequests.length) {
            setPendingRequest(null);
            return;
        }

        const first = voiceRequests[0];

        setPendingRequest(prev =>
            !prev || prev.userId !== first.userId
                ? first
                : prev
        );
    }, [voiceRequests, isHost]);

    // Use props.isMuted as single source of truth for mic
    const isMicMuted = props.isMuted ?? false;

    // ✅ FIX #7: Output mute is now controlled by LiveKit (removed local state)
    const [chatInput, setChatInput] = useState('');
    const [activePanel, setActivePanel] = useState(null);

    // Update panelAnim when width changes (for rotation)
    useEffect(() => {
        if (activePanel) {
            // If panel is open, animate to new width position
            Animated.timing(panelAnim, {
                toValue: 0,
                duration: 0, // Instant position correction
                useNativeDriver: true,
            }).start();
        } else {
            // Reset to off-screen position
            panelAnim.setValue(width);
        }
    }, [width, activePanel]);

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

    // ✅ FIX #6: Prevent Double Request-To-Speak Spam
    const handleRequestToSpeak = () => {
        if (!isListener) return;

        const alreadyRequested = voiceRequests.some(
            r => String(r.userId) === String(myId)
        );

        if (alreadyRequested) return;

        onRequestToSpeak?.();
    };

    const handleLeaveRoom = () => {
        onLeave();
    };

    // Let LiveKit be source of truth for mute state
    const toggleSelfMute = () => {
        const next = !isMicMuted;
        onMuteSelf?.(next);
    };

    const renderSpeakersGrid = () => {
        const numColumns =
            width < 400 ? 2 :
                width < 600 ? 3 :
                    width < 900 ? 4 : 6;

        return (
            <FlatList
                key={`speakers-grid-${columns}`}
                data={sortedSpeakers}
                keyExtractor={(item) => item._id}
                numColumns={columns}
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
                            onModerate={(userId, name, isSpeaker) =>
                                setModerationTarget({ userId, name, isSpeaker })
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

            {/* Top Header */}
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

                        {/* ✅ FIX #1: Allow Host To Open Chat Even When Disabled */}
                        <TouchableOpacity
                            style={tw.style(
                                'w-12 h-12 rounded-full items-center justify-center',
                                activePanel === 'chat' ? 'bg-blue-500' : 'bg-white/10',
                                !chatEnabled && !canModerate && 'bg-white/5'
                            )}
                            onPress={() => togglePanel('chat')}
                            disabled={!chatEnabled && !canModerate}
                        >
                            <Ionicons
                                name="chatbubbles"
                                size={24}
                                color={
                                    activePanel === 'chat' ? '#fff' :
                                        !chatEnabled && !canModerate ? '#6b7280' : '#d1d5db'
                                }
                            />
                            <PoppinsText
                                style={[
                                    tw`text-xs mt-0.5`,
                                    activePanel === 'chat'
                                        ? { color: '#fff' }
                                        : !chatEnabled && !canModerate
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

            {/* ✅ NEW: Bottom Floating Toast (Google Meet Style) */}
            {visibleToast && (
                <Animated.View
                    style={[
                        tw`absolute left-4 right-4 bg-black/80 border border-white/10 rounded-2xl flex-row items-center p-3`,
                        {
                            bottom: 110,
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [20, 0],
                                    }),
                                },
                            ],
                            zIndex: 10001,
                            elevation: 30,
                        },
                    ]}
                >
                    <SmallAvatar
                        user={{
                            name: visibleToast.userName,
                            avatar: visibleToast.avatar,
                        }}
                    />

                    <View style={tw`flex-1 ml-3`}>
                        <View style={tw`flex-row items-center`}>
                            <PoppinsTextSemibold style={tw`text-xs text-white mr-2`}>
                                {visibleToast.userName}
                            </PoppinsTextSemibold>

                            {visibleToast.role === "host" && (
                                <View style={tw`bg-amber-500 px-2 py-0.5 rounded-full`}>
                                    <PoppinsText style={tw`text-[9px] text-white`}>
                                        HOST
                                    </PoppinsText>
                                </View>
                            )}

                            {visibleToast.role === "speaker" && (
                                <View style={tw`bg-violet-600 px-2 py-0.5 rounded-full`}>
                                    <PoppinsText style={tw`text-[9px] text-white`}>
                                        SPEAKER
                                    </PoppinsText>
                                </View>
                            )}
                        </View>

                        <PoppinsText
                            style={tw`text-xs text-white/80 mt-0.5`}
                            numberOfLines={1}
                        >
                            {visibleToast.message}
                        </PoppinsText>
                    </View>
                </Animated.View>
            )}

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
                                                        }}
                                                        isRequesting={false}
                                                        isHostView={isHost}
                                                        currentUserId={myId}
                                                        onApprove={() => onApproveSpeaker(speaker._id)}
                                                        onModerate={(userId, name, isSpeaker) =>
                                                            setModerationTarget({ userId, name, isSpeaker })
                                                        }
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
                                        renderItem={({ item }) => {
                                            // ✅ Check if this listener has a pending request
                                            const hasRequest = voiceRequests.some(
                                                r => String(r.userId) === String(item._id)
                                            );

                                            return (
                                                <ListenerCard
                                                    listener={{
                                                        userId: item._id,
                                                        name: item.name,
                                                        avatar: item.avatar,
                                                        isConnected: item.isConnected,
                                                    }}
                                                    isRequesting={hasRequest}
                                                    isHostView={isHost}
                                                    currentUserId={myId}
                                                    onApprove={() => onApproveSpeaker(item._id)}
                                                    onModerate={(userId, name, isSpeaker) =>
                                                        setModerationTarget({ userId, name, isSpeaker: false })
                                                    }
                                                />
                                            );
                                        }}
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
                                        // ✅ FIX #3: Safer keyExtractor - uses index as stable fallback
                                        keyExtractor={(item, index) =>
                                            item._id ?? item.id ?? `msg-${index}`
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
                                        <View
                                            style={[
                                                tw`border-t border-white/10`,
                                                {
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 12,
                                                },
                                            ]}
                                        >
                                            <View style={tw`flex-row items-center`}>
                                                <TextInput
                                                    style={[
                                                        {
                                                            flex: 1,
                                                            minHeight: 44,
                                                            backgroundColor: "rgba(255,255,255,0.08)",
                                                            borderWidth: 1,
                                                            borderColor: "rgba(255,255,255,0.15)",
                                                            borderRadius: 24,
                                                            paddingHorizontal: 14,
                                                            paddingVertical: 10,
                                                            fontFamily: "Poppins-Regular",
                                                            color: "#fff",
                                                            marginRight: 8, // 🔥 Instead of gap
                                                        },
                                                    ]}
                                                    value={chatInput}
                                                    onChangeText={setChatInput}
                                                    placeholder="Type a message..."
                                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                                    maxLength={200}
                                                    multiline={false}
                                                />

                                                <TouchableOpacity
                                                    style={[
                                                        {
                                                            height: 44,
                                                            paddingHorizontal: 16,
                                                            borderRadius: 24,
                                                            backgroundColor: "#7c3aed", // violet-600 exact
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                            flexShrink: 0, // 🔥 Prevent shrink distortion
                                                            opacity: chatInput.trim() ? 1 : 0.5,
                                                        },
                                                    ]}
                                                    onPress={handleSendMessage}
                                                    disabled={!chatInput.trim()}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ✅ FIX #2: Properly Decline Speaker Request */}
            {isHost && (
                <ConfirmModal
                    visible={Boolean(pendingRequest)}
                    title="Speaker Request"
                    message={
                        pendingRequest
                            ? `${pendingRequest.participant?.profile?.fullName || "User"} wants to speak`
                            : ""
                    }
                    confirmText="Approve"
                    cancelText="Decline"
                    onCancel={() => {
                        if (!pendingRequest) return;
                        onDeclineSpeaker?.(pendingRequest.userId);
                        setPendingRequest(null); // closes immediately
                    }}
                    onConfirm={() => {
                        if (!pendingRequest) return;
                        onApproveSpeaker?.(pendingRequest.userId);
                        // 🔴 REMOVED: dispatch(voiceSpeakerApproved(...))
                        // Only backend call, Redux will sync via voice:instance:sync
                        setPendingRequest(null); // closes immediately
                    }}
                />
            )}

            {/* Moderation Modal - Pure actions, no Redux mutations */}
            <ModerationModal
                visible={Boolean(moderationTarget)}
                target={moderationTarget}
                onClose={() => setModerationTarget(null)}
                onDemote={(userId) => {
                    onDemoteSpeaker?.(userId);
                    // No Redux dispatch - wait for backend sync
                }}
                onKick={(userId) => {
                    onRemoveUser?.(userId);
                    // No Redux dispatch - wait for backend sync
                }}
            />

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

                    {/* ✅ FIX #7: Output mute controlled by LiveKit */}
                    <TouchableOpacity
                        style={tw.style(
                            'w-14 h-14 rounded-full bg-white/10 items-center justify-center',
                            isOutputMuted && 'bg-red-500/30'
                        )}
                        onPress={() => onToggleOutputMute?.()}
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