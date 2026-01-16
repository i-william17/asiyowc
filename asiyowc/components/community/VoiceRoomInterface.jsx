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

const { width, height } = Dimensions.get('window');

// Sub-components
const SpeakerCard = ({ speaker, isHostView, currentUserId, onMute }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <View style={[
            styles.speakerCard,
            speaker.isSpeaking && styles.speakerCardSpeaking,
        ]}>
            {speaker.isSpeaking && (
                <View style={styles.speakingPulse} />
            )}

            <View style={styles.speakerAvatarContainer}>
                <Image
                    source={{ uri: speaker.avatar }}
                    style={styles.speakerAvatar}
                />

                {/* Speaking indicator */}
                {speaker.isSpeaking && !speaker.isMuted && (
                    <View style={styles.speakingIndicator}>
                        <Ionicons name="pulse" size={10} color="#fff" />
                    </View>
                )}

                {/* Muted indicator */}
                {speaker.isMuted && (
                    <View style={styles.mutedIndicator}>
                        <Ionicons name="mic-off" size={10} color="#fff" />
                    </View>
                )}

                {/* Host badge */}
                {speaker.isHost && (
                    <View style={styles.hostBadge}>
                        <Ionicons name="crown" size={12} color="#fff" />
                    </View>
                )}
            </View>

            <View style={styles.speakerInfo}>
                <Text style={styles.speakerName} numberOfLines={1}>
                    {speaker.name}
                    {speaker.userId === currentUserId && ' (You)'}
                </Text>

                <View style={styles.speakerStatus}>
                    {speaker.isSpeaking ? (
                        <View style={[styles.statusBadge, styles.speakingBadge]}>
                            <Ionicons name="radio-button-on" size={10} color="#22c55e" />
                            <Text style={styles.statusText}>Speaking</Text>
                        </View>
                    ) : speaker.isMuted ? (
                        <View style={[styles.statusBadge, styles.mutedBadge]}>
                            <Ionicons name="mic-off" size={10} color="#ef4444" />
                            <Text style={styles.statusText}>Muted</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, styles.activeBadge]}>
                            <Ionicons name="mic" size={10} color="#3b82f6" />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Host actions */}
            {isHostView && speaker.userId !== currentUserId && (
                <TouchableOpacity
                    style={[
                        styles.muteButton,
                        speaker.isMuted ? styles.unmuteButton : styles.muteButtonRed
                    ]}
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
        <View style={styles.listenerCard}>
            <View style={styles.listenerAvatarContainer}>
                <Image
                    source={{ uri: listener.avatar }}
                    style={styles.listenerAvatar}
                />

                {/* Requesting indicator */}
                {listener.isRequestingSpeaker && (
                    <View style={styles.requestingIndicator}>
                        <Ionicons name="hand-left" size={8} color="#fff" />
                    </View>
                )}
            </View>

            <View style={styles.listenerInfo}>
                <Text style={styles.listenerName} numberOfLines={1}>
                    {listener.name}
                    {listener.userId === currentUserId && ' (You)'}
                </Text>

                <View style={styles.listenerStatus}>
                    {listener.isRequestingSpeaker ? (
                        <View style={[styles.statusBadge, styles.requestingBadge]}>
                            <Ionicons name="hand-left" size={10} color="#38bdf8" />
                            <Text style={styles.statusText}>Requesting to speak</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, styles.listenerBadge]}>
                            <Ionicons name="person" size={10} color="#9ca3af" />
                            <Text style={styles.statusText}>Listener</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Host actions */}
            {isHostView && (
                <View style={styles.listenerActions}>
                    {listener.isRequestingSpeaker && (
                        <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => onApprove(listener.userId)}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.removeButton}
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
        <View style={[
            styles.chatMessageContainer,
            isOwnMessage ? styles.chatMessageRight : styles.chatMessageLeft
        ]}>
            {!isOwnMessage && (
                <Text style={styles.chatMessageUser}>{message.userName}</Text>
            )}
            <View style={[
                styles.chatMessageBubble,
                isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
            ]}>
                <Text style={styles.chatMessageText}>{message.message}</Text>
                <View style={[
                    styles.chatMessageTime,
                    isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                    <Text style={styles.chatTimeText}>{time}</Text>
                    {isOwnMessage && (
                        <Ionicons name="checkmark" size={12} color="#a78bfa" style={{ marginLeft: 4 }} />
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

    console.group("🎙️ VoiceRoomInterface Render");
    console.log("voiceId:", voiceId);
    console.log("currentUser:", currentUser);
    console.log("currentUser._id:", currentUser?._id);
    console.log("voiceState:", voiceState);
    console.log("voiceState.room:", voiceState?.room);
    console.log("voiceState.instance:", voiceState?.instance);
    console.log("participants:", voiceState?.instance?.participants);
    console.log("speakers:", voiceState?.instance?.speakers);
    console.log("messages:", voiceState?.messages);
    console.groupEnd();

    /* =====================================================
       HARD GUARDS (MUST COME FIRST)
    ===================================================== */

    // if (!currentUser || !currentUser._id) {
    //     return (
    //         <SafeAreaView style={styles.container}>
    //             <Text style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
    //                 Loading user…
    //             </Text>
    //         </SafeAreaView>
    //     );
    // }

    // if (!voiceState || !voiceState.room || !voiceState.instance) {
    //     return (
    //         <SafeAreaView style={styles.container}>
    //             <Text style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
    //                 Joining voice room…
    //             </Text>
    //         </SafeAreaView>
    //     );
    // }

    /* =====================================================
       SAFE DERIVATIONS (NOW IT IS SAFE)
    ===================================================== */

    const room = voiceState?.room || {};
    const instance = voiceState?.instance || {};

    // if (!instance) {
    //     return (
    //         <View style={styles.loading}>
    //             <Text>Joining live room…</Text>
    //         </View>
    //     );
    // }

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

    const speakers = Array.isArray(instance?.speakers)
        ? instance.speakers
            .map(normalizeUser)
            .filter(Boolean)
        : [];

    const listeners = Array.isArray(instance?.participants)
        ? instance.participants
            .map(normalizeUser)
            .filter(Boolean)
        : [];

    const messages = Array.isArray(voiceState?.messages)
        ? voiceState.messages
        : [];

    const isHost = room?.host?._id === myId;

    const isSpeaker = speakers.some(u => u?._id === myId);

    const isListener = listeners.some(u => u?._id === myId);

    const canSpeak = isHost || isSpeaker;
    const canModerate = isHost;

    const hostUser = room?.host ?? null;
    const hostAvatar = hostUser?.profile?.avatar?.url ?? null;
    console.log("Host user derived:", hostUser);

    const [activePanel, setActivePanel] = useState(null); // 'listeners' or 'chat'
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [panelAnim] = useState(new Animated.Value(width));

    const togglePanel = (panel) => {
        if (activePanel === panel) {
            // Close panel
            Animated.timing(panelAnim, {
                toValue: width,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setActivePanel(null);
            });
        } else {
            // Open panel
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
                data={speakers}
                keyExtractor={(item) => item._id}
                numColumns={numColumns}
                contentContainerStyle={styles.speakersGrid}
                renderItem={({ item }) => (
                    <View style={styles.speakerCardWrapper}>
                        <SpeakerCard
                            speaker={{
                                userId: item._id,
                                name: item.name,
                                avatar: item.avatar,
                                isHost: item._id === room?.host?._id,
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
                        <View style={styles.requestToSpeakContainer}>
                            <View style={styles.listenerIconContainer}>
                                <Ionicons name="headset" size={40} color="#93c5fd" />
                            </View>
                            <Text style={styles.listenerText}>You're listening</Text>
                            <TouchableOpacity
                                style={styles.requestButton}
                                onPress={handleRequestToSpeak}
                            >
                                <Ionicons name="hand-left" size={20} color="#fff" />
                                <Text style={styles.requestButtonText}>Request to Speak</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

            {/* Top Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleLeaveRoom}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.roomInfo}>
                        <View style={styles.hostContainer}>
                            <Image
                                source={{ uri: hostAvatar }}
                                style={styles.hostAvatar}
                            />
                            <View style={styles.hostCrown}>
                                <Ionicons name="crown" size={12} color="#fff" />
                            </View>
                        </View>

                        <View style={styles.roomDetails}>
                            {/* FIX 1: Changed {name} to {room?.title} */}
                            <Text style={styles.roomName} numberOfLines={1}>
                                {room?.title ?? "Live Voice Room"}
                            </Text>
                            <View style={styles.roomStatus}>
                                <View style={styles.liveBadge}>
                                    <Ionicons name="radio" size={10} color="#f87171" />
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                                <Text style={styles.participantCount}>
                                    {speakers.length} speaking • {listeners.length} listening
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.panelButtons}>
                        <TouchableOpacity
                            style={[
                                styles.panelButton,
                                activePanel === 'listeners' && styles.panelButtonActive
                            ]}
                            onPress={() => togglePanel('listeners')}
                        >
                            <Ionicons
                                name="people"
                                size={24}
                                color={activePanel === 'listeners' ? '#fff' : '#d1d5db'}
                            />
                            <Text style={[
                                styles.panelButtonText,
                                activePanel === 'listeners' && styles.panelButtonTextActive
                            ]}>
                                {listeners.length}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.panelButton,
                                activePanel === 'chat' && styles.panelButtonActive,
                                !chatEnabled && styles.panelButtonDisabled
                            ]}
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
                            <Text style={[
                                styles.panelButtonText,
                                activePanel === 'chat' && styles.panelButtonTextActive,
                                !chatEnabled && styles.panelButtonTextDisabled
                            ]}>
                                {messages.length}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Main Content - Speakers Grid */}
            <View style={styles.mainContent}>
                {renderSpeakersGrid()}
            </View>

            {/* Side Panel */}
            {activePanel && (
                <Animated.View
                    style={[
                        styles.sidePanel,
                        {
                            transform: [{ translateX: panelAnim }]
                        }
                    ]}
                >
                    <View style={styles.panelContent}>
                        {activePanel === 'listeners' && (
                            <>
                                <View style={styles.panelHeader}>
                                    <View style={styles.panelTitleContainer}>
                                        <Ionicons name="people" size={24} color="#fff" />
                                        <Text style={styles.panelTitle}>
                                            Listeners ({listeners.length})
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.closePanelButton}
                                        onPress={() => togglePanel('listeners')}
                                    >
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.panelSubtitle}>
                                    People currently listening in the room
                                </Text>

                                <FlatList
                                    data={listeners}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={styles.listenersList}
                                    renderItem={({ item }) => (
                                        <ListenerCard
                                            listener={{
                                                userId: item._id,
                                                // FIX 2: Use normalized name and avatar
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
                                />
                            </>
                        )}

                        {activePanel === 'chat' && (
                            <>
                                <View style={styles.panelHeader}>
                                    <View style={styles.panelTitleContainer}>
                                        <Ionicons name="chatbubbles" size={24} color="#fff" />
                                        <Text style={styles.panelTitle}>Voice Chat</Text>
                                        {!chatEnabled && (
                                            <View style={styles.chatDisabledBadge}>
                                                <Text style={styles.chatDisabledText}>Disabled</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.chatHeaderActions}>
                                        {canModerate && (
                                            <TouchableOpacity
                                                style={styles.chatToggleButton}
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
                                            style={styles.closePanelButton}
                                            onPress={() => togglePanel('chat')}
                                        >
                                            <Ionicons name="close" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Text style={styles.panelSubtitle}>
                                    Messages disappear when room ends
                                </Text>

                                <FlatList
                                    data={messages}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={styles.chatMessages}
                                    inverted={false}
                                    // FIX 3: Fixed variable name from 'id' to 'myId'
                                    renderItem={({ item }) => (
                                        <ChatMessage
                                            message={item}
                                            currentUserId={myId}
                                        />
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyChat}>
                                            <View style={styles.emptyChatIcon}>
                                                <Ionicons name="chatbubble" size={40} color="#9ca3af" />
                                            </View>
                                            <Text style={styles.emptyChatTitle}>No messages yet</Text>
                                            <Text style={styles.emptyChatText}>
                                                {chatEnabled
                                                    ? "Be the first to send a message!"
                                                    : "Chat is currently disabled by the host"
                                                }
                                            </Text>
                                        </View>
                                    }
                                />

                                {chatEnabled && (
                                    <View style={styles.chatInputContainer}>
                                        <TextInput
                                            style={styles.chatInput}
                                            value={chatInput}
                                            onChangeText={setChatInput}
                                            placeholder="Type a message..."
                                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                            maxLength={200}
                                            multiline={false}
                                        />
                                        <TouchableOpacity
                                            style={[
                                                styles.sendButton,
                                                !chatInput.trim() && styles.sendButtonDisabled
                                            ]}
                                            onPress={handleSendMessage}
                                            disabled={!chatInput.trim()}
                                        >
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                            <Text style={styles.sendButtonText}>Send</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </Animated.View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                <View style={styles.controlsRow}>
                    {/* Mic Control */}
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            styles.micButton,
                            isMicMuted ? styles.micButtonMuted : styles.micButtonActive
                        ]}
                        onPress={() => onMuteSelf()}

                    >
                        <Ionicons
                            name={isMicMuted ? "mic-off" : "mic"}
                            size={28}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    {/* Output Control */}
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            styles.outputButton,
                            isOutputMuted && styles.outputButtonMuted
                        ]}
                        onPress={() => setIsOutputMuted(!isOutputMuted)}
                    >
                        <Ionicons
                            name={isOutputMuted ? "volume-mute" : "volume-high"}
                            size={24}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    {/* Request to Speak (for listeners) */}
                    {!canSpeak && (
                        <TouchableOpacity
                            style={[styles.controlButton, styles.requestButton]}
                            onPress={handleRequestToSpeak}
                        >
                            <Ionicons name="hand-left" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <View style={styles.controlDivider} />

                    {/* Leave Room */}
                    <TouchableOpacity
                        style={[styles.controlButton, styles.leaveButton]}
                        onPress={handleLeaveRoom}
                    >
                        <Ionicons name="exit" size={20} color="#fff" />
                        <Text style={styles.leaveButtonText}>Leave</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Bar */}
                <View style={styles.statusBar}>
                    <View style={[
                        styles.statusIndicator,
                        isMicMuted ? styles.statusIndicatorMuted : styles.statusIndicatorActive
                    ]} />
                    <Text style={styles.statusText}>
                        {isMicMuted ? 'Microphone muted' : 'Microphone active'}
                        {isOutputMuted && ' • Output muted'}
                        {isHost && ' • You are the host'}
                    </Text>
                    <Ionicons name="wifi" size={16} color="#22c55e" />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e1b4b',
    },
    header: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    hostContainer: {
        position: 'relative',
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    hostCrown: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#f59e0b',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomDetails: {
        marginLeft: 12,
        flex: 1,
    },
    roomName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    roomStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    liveText: {
        fontSize: 12,
        color: '#fca5a5',
        fontWeight: '600',
        marginLeft: 4,
    },
    participantCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    panelButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    panelButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    panelButtonActive: {
        backgroundColor: '#3b82f6',
    },
    panelButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    panelButtonText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    panelButtonTextActive: {
        color: '#fff',
    },
    panelButtonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.4)',
    },
    mainContent: {
        flex: 1,
    },
    speakersGrid: {
        padding: 16,
    },
    speakerCardWrapper: {
        flex: 1,
        minWidth: 120,
        maxWidth: 150,
        margin: 8,
    },
    speakerCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    speakerCardSpeaking: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    speakingPulse: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    speakerAvatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    speakerAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    speakingIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mutedIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hostBadge: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f59e0b',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    speakerInfo: {
        alignItems: 'center',
        width: '100%',
    },
    speakerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    speakerStatus: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    speakingBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
    mutedBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    activeBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    requestingBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
    },
    listenerBadge: {
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
    },
    statusText: {
        fontSize: 10,
        marginLeft: 4,
    },
    muteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    unmuteButton: {
        backgroundColor: '#10b981',
    },
    muteButtonRed: {
        backgroundColor: '#ef4444',
    },
    requestToSpeakContainer: {
        alignItems: 'center',
        padding: 24,
        marginTop: 16,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        borderStyle: 'dashed',
        borderRadius: 16,
        marginHorizontal: 8,
    },
    listenerIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(147, 197, 253, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    listenerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    requestButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    sidePanel: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: Math.min(width * 0.9, 400),
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 24,
    },
    panelContent: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 40,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    panelTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    panelTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    panelSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    chatDisabledBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    chatDisabledText: {
        fontSize: 12,
        color: '#fca5a5',
    },
    chatHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatToggleButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closePanelButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listenersList: {
        padding: 16,
    },
    listenerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    listenerAvatarContainer: {
        position: 'relative',
    },
    listenerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    requestingIndicator: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#3b82f6',
        borderWidth: 1,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listenerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    listenerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    listenerStatus: {
        flexDirection: 'row',
    },
    listenerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    approveButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    chatMessages: {
        padding: 16,
    },
    chatMessageContainer: {
        marginBottom: 12,
    },
    chatMessageLeft: {
        alignItems: 'flex-start',
    },
    chatMessageRight: {
        alignItems: 'flex-end',
    },
    chatMessageUser: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
        marginBottom: 4,
        marginLeft: 8,
    },
    chatMessageBubble: {
        padding: 12,
        borderRadius: 16,
        maxWidth: '80%',
    },
    ownMessageBubble: {
        backgroundColor: '#4f46e5',
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomLeftRadius: 4,
    },
    chatMessageText: {
        fontSize: 14,
        color: '#fff',
    },
    chatMessageTime: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ownMessageTime: {
        justifyContent: 'flex-end',
    },
    otherMessageTime: {
        justifyContent: 'flex-start',
    },
    chatTimeText: {
        fontSize: 10,
    },
    emptyChat: {
        alignItems: 'center',
        padding: 40,
    },
    emptyChatIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyChatTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    emptyChatText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
    },
    chatInputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    chatInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 14,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    bottomControls: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 16,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 12,
    },
    controlButton: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 999,
    },
    micButton: {
        width: 64,
        height: 64,
    },
    micButtonActive: {
        backgroundColor: '#10b981',
    },
    micButtonMuted: {
        backgroundColor: '#ef4444',
    },
    outputButton: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    outputButtonMuted: {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
    },
    requestButton: {
        width: 56,
        height: 56,
        backgroundColor: '#3b82f6',
    },
    controlDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    leaveButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusIndicatorActive: {
        backgroundColor: '#10b981',
    },
    statusIndicatorMuted: {
        backgroundColor: '#ef4444',
    },
    statusText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
});