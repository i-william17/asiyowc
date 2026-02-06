import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Animated,
    Share,
    Alert
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import {
    ChevronLeft,
    Calendar,
    Clock,
    MapPin,
    Users,
    Video,
    Share2,
    Bookmark,
    BookmarkCheck,
    Ticket,
    DollarSign,
    ChevronRight,
    Star,
    CheckCircle,
    LogOut,
    Edit,
    Settings,
    Crown
} from "lucide-react-native";

import {
    fetchEventById,
    rsvpEvent,
    cancelRsvpEvent
} from "../../store/slices/eventSlice";

import ConfirmModal from "../../components/community/ConfirmModal";
import tw from "../../utils/tw";

const PURPLE = "#6A1B9A";
const PURPLE_LIGHT = "#EDE7F6";
const PURPLE_DARK = "#4A148C";

/* =====================================================
   UTILITY FUNCTIONS
===================================================== */

/* =====================================================
   JWT DECODE (native, no dependency)
===================================================== */

const decodeToken = (token) => {
    try {
        if (!token) return null;

        const base64Payload = token.split(".")[1];

        const decoded = JSON.parse(
            atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"))
        );

        return decoded;

    } catch (err) {
        console.warn("Invalid token:", err);
        return null;
    }
};


const isUserOrganizer = (event, decodedToken) => {
    if (!decodedToken || !event?.organizer) return false;
    return decodedToken.userId === event.organizer._id;
};

const isUserAttendee = (event, decoded) => {
    if (!decoded || !event?.attendees) return false;

    return event.attendees.some(
        a => a.user?.toString() === decoded.id
    );
};


/* =====================================================
   EVENT DETAILS
===================================================== */

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const dispatch = useDispatch();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    // Modal states
    const [showRSVPModal, setShowRSVPModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { currentEvent: event, loading } = useSelector((s) => s.events);
    const token = useSelector((s) => s.auth.token);

    // Decode token once
    const decodedToken = useMemo(() => decodeToken(token), [token]);

    // User roles
    const isOrganizer = useMemo(() =>
        isUserOrganizer(event, decodedToken),
        [event, decodedToken]
    );

    const isAttendee = useMemo(() =>
        isUserAttendee(event, decodedToken) || event?.isRegistered,
        [event, decodedToken]
    );

    /* =====================================================
       FETCH
    ===================================================== */

    useEffect(() => {
        dispatch(fetchEventById(id));
    }, [id]);

    useEffect(() => {
        if (!loading && event) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [loading, event]);

    /* =====================================================
       FORMAT
    ===================================================== */

    const date = useMemo(() => {
        if (!event?.dateTime?.start) return "";
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(event.dateTime.start).toLocaleDateString('en-US', options);
    }, [event]);

    const time = useMemo(() => {
        if (!event?.dateTime?.start) return "";
        return new Date(event.dateTime.start).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }, [event]);

    const endTime = useMemo(() => {
        if (!event?.dateTime?.end) return "";
        return new Date(event.dateTime.end).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }, [event]);

    const isFree = event?.price?.isFree;

    /* =====================================================
       HANDLERS
    ===================================================== */

    const handleShare = async () => {
        try {
            const shareUrl = `https://yourapp.com/events/${id}`;
            await Share.share({
                message: `Join me at ${event.title}!`,
                url: shareUrl,
                title: event.title
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleLocationPress = () => {
        if (event.type === "virtual") {
            // Only allow access for organizer and attendees
            if (isOrganizer || isAttendee) {
                Linking.openURL(event.location?.onlineLink);
            } else {
                Alert.alert(
                    "Access Required",
                    "Please RSVP to this event to access the meeting link."
                );
            }
        } else {
            const address = `${event.location?.address}, ${event.location?.city}, ${event.location?.country}`;
            const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
            Linking.openURL(url);
        }
    };

    const handleEditEvent = () => {
        router.push(`/events/edit/${id}`);
    };

    const confirmRSVP = async () => {
        setIsProcessing(true);

        try {
            await dispatch(rsvpEvent({ eventId: id, token }));

            // 🔥 force refresh
            await dispatch(fetchEventById(id));

        } finally {
            setIsProcessing(false);
            setShowRSVPModal(false);
        }
    };


    const confirmCancelRSVP = async () => {
        setIsProcessing(true);
        try {
            await dispatch(cancelRsvpEvent({ eventId: id, token }));
            dispatch(fetchEventById(id));
            Alert.alert(
                "Success",
                "Your registration has been cancelled",
                [{ text: "OK" }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to cancel registration. Please try again.");
        } finally {
            setIsProcessing(false);
            setShowCancelModal(false);
        }
    };

    /* =====================================================
       RSVP BUTTON STATE LOGIC
    ===================================================== */

    const getRSVPButtonState = () => {
        // If user is organizer, show edit button
        if (isOrganizer) {
            return {
                showButton: true,
                isDisabled: false,
                isOrganizer: true,
                text: "Edit Event",
                icon: Edit,
                backgroundColor: "#4F46E5", // Indigo
                onPress: handleEditEvent
            };
        }

        // If user is attendee, show registered state
        if (isAttendee) {
            return {
                showButton: true,
                isDisabled: false,
                isAttendee: true,
                text: isFree ? "Registered" : "Ticket Purchased",
                icon: CheckCircle,
                backgroundColor: "#10B981", // Green
                onPress: null // No action, shows status
            };
        }

        // If user is not logged in or not registered
        return {
            showButton: true,
            isDisabled: false,
            isGuest: !token,
            text: isFree ? "RSVP Now" : `Buy Ticket - KES ${event?.price?.amount || 0}`,
            icon: null,
            backgroundColor: PURPLE,
            onPress: () => setShowRSVPModal(true)
        };
    };

    const rsvpButtonState = useMemo(() => getRSVPButtonState(), [
        isOrganizer,
        isAttendee,
        token,
        isFree,
        event
    ]);

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading || !event) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
                <ActivityIndicator size="large" color={PURPLE} />
                <Text style={[tw`mt-4 text-gray-600`, { fontFamily: "Poppins-Regular" }]}>
                    Loading event details...
                </Text>
            </View>
        );
    }

    /* =====================================================
       UI
    ===================================================== */

    return (
        <>
            <Animated.View style={[tw`flex-1 bg-gray-50`, { opacity: fadeAnim }]}>
                {/* =====================================================
           HERO IMAGE WITH GRADIENT OVERLAY
        ===================================================== */}
                <View style={tw`relative h-72`}>
                    <Image
                        source={{ uri: event.image?.url }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                    />

                    <LinearGradient
                        colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]}
                        style={tw`absolute inset-0`}
                    />

                    {/* Header Actions */}
                    <View style={tw`absolute top-12 left-4 right-4 flex-row items-center justify-between`}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={tw`w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur`}
                        >
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={tw`flex-row gap-2`}>
                            {isOrganizer && (
                                <TouchableOpacity
                                    onPress={handleEditEvent}
                                    style={tw`w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur`}
                                >
                                    <Settings size={20} color="#fff" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleShare}
                                style={tw`w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur`}
                            >
                                <Share2 size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Event Title with Organizer Badge */}
                    <View style={tw`absolute bottom-8 left-5 right-5`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            {isOrganizer && (
                                <View style={[tw`px-3 py-1 rounded-full mr-2 flex-row items-center`, { backgroundColor: "#FEF3C7" }]}>
                                    <Crown size={12} color="#D97706" style={tw`mr-1`} />
                                    <Text style={[tw`text-xs`, { color: "#D97706", fontFamily: "Poppins-SemiBold" }]}>
                                        ORGANIZER
                                    </Text>
                                </View>
                            )}
                            <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: PURPLE_LIGHT }]}>
                                <Text style={[tw`text-xs`, { color: PURPLE, fontFamily: "Poppins-SemiBold" }]}>
                                    {event.type === "virtual" ? "Virtual Event" : "In-Person"}
                                </Text>
                            </View>
                            {isFree && (
                                <View style={[tw`px-3 py-1 rounded-full ml-2`, { backgroundColor: "#D1FAE5" }]}>
                                    <Text style={[tw`text-xs`, { color: "#065F46", fontFamily: "Poppins-SemiBold" }]}>
                                        FREE
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text style={[tw`text-white text-2xl leading-8 mb-2`, { fontFamily: "Poppins-Bold" }]}>
                            {event.title}
                        </Text>

                        <View style={tw`flex-row items-center`}>
                            <Star size={16} color="#FBBF24" fill="#FBBF24" />
                            <Text style={[tw`text-white ml-1 mr-3`, { fontFamily: "Poppins-Medium" }]}>
                                {event.statistics?.rating || "New"}
                            </Text>
                            <Users size={16} color="#fff" />
                            <Text style={[tw`text-white ml-1`, { fontFamily: "Poppins-Medium" }]}>
                                {event.statistics?.registrations} attendees
                            </Text>
                        </View>
                    </View>
                </View>

                {/* =====================================================
           CONTENT CARD
        ===================================================== */}
                <View style={tw`flex-1 bg-gray-50`}>
                    <View
                        style={[
                            tw`flex-1 bg-white px-5 pt-6`,
                            {
                                borderTopLeftRadius: 32,
                                borderTopRightRadius: 32,
                                marginTop: -28
                            }
                        ]}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={tw`pb-32`}
                        >
                            {/* Organizer Card with Role Badge */}
                            <View style={tw`flex-row items-center mb-6 p-4 rounded-2xl bg-gray-50`}>
                                <View style={tw`relative`}>
                                    <Image
                                        source={{ uri: event.organizer?.profile?.avatar?.url }}
                                        style={tw`w-14 h-14 rounded-full mr-4 border-2 border-white shadow-sm`}
                                    />
                                    {isOrganizer && (
                                        <View style={tw`absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full items-center justify-center border-2 border-white`}>
                                            <Crown size={10} color="#fff" />
                                        </View>
                                    )}
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={[tw`text-gray-500 text-xs mb-1`, { fontFamily: "Poppins-Regular" }]}>
                                        {isOrganizer ? "You are hosting" : "Hosted by"}
                                    </Text>
                                    <Text style={[tw`text-gray-800 text-base mb-1`, { fontFamily: "Poppins-SemiBold" }]}>
                                        {event.organizer?.profile?.fullName}
                                    </Text>
                                    <Text style={[tw`text-gray-600 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                                        {event.organizer?.profile?.title || "Event Organizer"}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="#9CA3AF" />
                            </View>

                            {/* Event Details Grid */}
                            <View style={tw`mb-6`}>
                                <Text style={[tw`text-gray-800 text-lg mb-4`, { fontFamily: "Poppins-SemiBold" }]}>
                                    Event Details
                                </Text>

                                <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                    <DetailRow
                                        icon={Calendar}
                                        title="Date"
                                        value={date}
                                        iconColor={PURPLE}
                                    />
                                    <View style={tw`h-px bg-gray-200 my-3`} />
                                    <DetailRow
                                        icon={Clock}
                                        title="Time"
                                        value={`${time} - ${endTime}`}
                                        iconColor={PURPLE}
                                    />
                                    <View style={tw`h-px bg-gray-200 my-3`} />

                                    {/* Location/Online Link with Role-based Access */}
                                    {event.type === "virtual" ? (
                                        <TouchableOpacity
                                            onPress={handleLocationPress}
                                            disabled={!isOrganizer && !isAttendee}
                                        >
                                            <DetailRow
                                                icon={Video}
                                                title="Online Meeting"
                                                value={
                                                    isOrganizer ? "Manage Meeting" :
                                                        isAttendee ? "Click to join meeting" :
                                                            "Available after RSVP"
                                                }
                                                iconColor={
                                                    isOrganizer ? "#4F46E5" :
                                                        isAttendee ? PURPLE : "#9CA3AF"
                                                }
                                                showArrow={isOrganizer || isAttendee}
                                                disabled={!isOrganizer && !isAttendee}
                                                showAccessBadge={isOrganizer || isAttendee}
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity onPress={handleLocationPress}>
                                            <DetailRow
                                                icon={MapPin}
                                                title="Location"
                                                value={`${event.location?.city}, ${event.location?.country}`}
                                                iconColor={PURPLE}
                                                showArrow
                                            />
                                        </TouchableOpacity>
                                    )}

                                    <View style={tw`h-px bg-gray-200 my-3`} />
                                    <DetailRow
                                        icon={Users}
                                        title="Attendees"
                                        value={`${event.statistics?.registrations} registered`}
                                        iconColor={PURPLE}
                                    />
                                    <View style={tw`h-px bg-gray-200 my-3`} />
                                    <DetailRow
                                        icon={isFree ? Ticket : DollarSign}
                                        title="Price"
                                        value={isFree ? "Free" : `KES ${event.price?.amount}`}
                                        iconColor={PURPLE}
                                    />
                                </View>
                            </View>

                            {/* DESCRIPTION */}
                            <Section title="About Event">
                                <Text style={[tw`text-gray-600 leading-6 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                                    {event.description}
                                </Text>
                            </Section>

                            {/* TAGS */}
                            {event.tags?.length > 0 && (
                                <Section title="Tags">
                                    <View style={tw`flex-row flex-wrap gap-2`}>
                                        {event.tags.map((tag, i) => (
                                            <View
                                                key={i}
                                                style={[
                                                    tw`px-4 py-2 rounded-full`,
                                                    { backgroundColor: PURPLE_LIGHT }
                                                ]}
                                            >
                                                <Text style={{ color: PURPLE, fontFamily: "Poppins-Medium" }}>
                                                    {tag}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </Section>
                            )}

                            {/* AGENDA */}
                            {event.agenda?.length > 0 && (
                                <Section title="Event Agenda">
                                    <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                        {event.agenda.map((a, i) => (
                                            <View key={i} style={tw`mb-4 last:mb-0`}>
                                                <View style={tw`flex-row items-center mb-1`}>
                                                    <View style={[tw`w-2 h-2 rounded-full mr-3`, { backgroundColor: PURPLE }]} />
                                                    <Text style={[tw`text-gray-800`, { fontFamily: "Poppins-SemiBold" }]}>
                                                        {a.time}
                                                    </Text>
                                                </View>
                                                <Text style={[tw`text-gray-600 ml-5`, { fontFamily: "Poppins-Regular" }]}>
                                                    {a.title}
                                                </Text>
                                                {a.description && (
                                                    <Text style={[tw`text-gray-500 text-sm ml-5 mt-1`, { fontFamily: "Poppins-Light" }]}>
                                                        {a.description}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </Section>
                            )}

                            {/* ATTENDEE LIST (Only for Organizer) */}
                            {isOrganizer && event.attendees?.length > 0 && (
                                <Section title="Attendees">
                                    <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                        <Text style={[tw`text-gray-600 mb-3`, { fontFamily: "Poppins-Regular" }]}>
                                            {event.attendees.length} people have registered
                                        </Text>
                                        {event.attendees.slice(0, 5).map((attendee, i) => (
                                            <View key={i} style={tw`flex-row items-center mb-3 last:mb-0`}>
                                                <Image
                                                    source={{ uri: attendee.profile?.avatar?.url }}
                                                    style={tw`w-10 h-10 rounded-full mr-3`}
                                                />
                                                <View>
                                                    <Text style={[tw`text-gray-800`, { fontFamily: "Poppins-Medium" }]}>
                                                        {attendee.profile?.fullName}
                                                    </Text>
                                                    <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                                                        {attendee.profile?.email}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                        {event.attendees.length > 5 && (
                                            <Text style={[tw`text-purple-600 text-center mt-2`, { fontFamily: "Poppins-SemiBold" }]}>
                                                +{event.attendees.length - 5} more attendees
                                            </Text>
                                        )}
                                    </View>
                                </Section>
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* =====================================================
           STICKY CTA - Role-based buttons
        ===================================================== */}
                <View style={tw`absolute bottom-0 left-0 right-0 bg-white pt-4 pb-8 px-5 border-t border-gray-200`}>
                    {isOrganizer ? (
                        // Organizer View - Edit Event button
                        <TouchableOpacity
                            onPress={handleEditEvent}
                            style={[
                                tw`py-4 rounded-2xl items-center justify-center`,
                                {
                                    backgroundColor: rsvpButtonState.backgroundColor,
                                    shadowColor: rsvpButtonState.backgroundColor,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }
                            ]}
                            activeOpacity={0.9}
                        >
                            <View style={tw`flex-row items-center`}>
                                <Edit size={20} color="#fff" style={tw`mr-2`} />
                                <Text style={[tw`text-white text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                                    {rsvpButtonState.text}
                                </Text>
                            </View>
                            <Text style={[tw`text-white/80 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                                Manage your event
                            </Text>
                        </TouchableOpacity>
                    ) : isAttendee ? (
                        // Attendee View - Registered status + Leave button
                        <View style={tw`flex-row gap-3`}>
                            {/* Registered Status Button */}
                            <View style={tw`flex-1`}>
                                <View
                                    style={[
                                        tw`py-4 rounded-2xl items-center justify-center`,
                                        {
                                            backgroundColor: rsvpButtonState.backgroundColor,
                                            opacity: 0.9
                                        }
                                    ]}
                                >
                                    <View style={tw`flex-row items-center`}>
                                        <CheckCircle size={20} color="#fff" style={tw`mr-2`} />
                                        <Text style={[tw`text-white text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                                            {rsvpButtonState.text}
                                        </Text>
                                    </View>
                                    {!isFree && (
                                        <Text style={[tw`text-white/80 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                                            KES {event.price?.amount}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Leave Event Button */}
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(true)}
                                disabled={isProcessing}
                                style={[
                                    tw`py-4 rounded-2xl items-center justify-center px-6`,
                                    {
                                        backgroundColor: "#FEE2E2",
                                        opacity: isProcessing ? 0.5 : 1
                                    }
                                ]}
                                activeOpacity={0.8}
                            >
                                <View style={tw`flex-row items-center`}>
                                    <LogOut size={20} color="#DC2626" style={tw`mr-2`} />
                                    <Text style={[tw`text-red-600 text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                                        Leave
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Guest View - RSVP Button
                        <TouchableOpacity
                            onPress={rsvpButtonState.onPress}
                            disabled={isProcessing || rsvpButtonState.isDisabled}
                            style={[
                                tw`py-4 rounded-2xl items-center justify-center`,
                                {
                                    backgroundColor: rsvpButtonState.backgroundColor,
                                    shadowColor: rsvpButtonState.backgroundColor,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                    opacity: (isProcessing || rsvpButtonState.isDisabled) ? 0.5 : 1
                                }
                            ]}
                            activeOpacity={0.9}
                        >
                            <Text style={[tw`text-white text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                                {rsvpButtonState.text}
                            </Text>
                            <Text style={[tw`text-white/80 text-xs mt-1`, { fontFamily: "Poppins-Regular" }]}>
                                {event.statistics?.seatsLeft ? `${event.statistics.seatsLeft} seats left` : "Limited seats available"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* =====================================================
         MODALS
      ===================================================== */}

            {/* RSVP Confirmation Modal (Only for non-organizers) */}
            {!isOrganizer && (
                <ConfirmModal
                    visible={showRSVPModal}
                    onClose={() => setShowRSVPModal(false)}
                    onConfirm={confirmRSVP}
                    title="Confirm RSVP"
                    message={`Are you sure you want to join "${event.title}"?`}
                    confirmText={isFree ? "Join Event" : `Pay KES ${event.price?.amount}`}
                    cancelText="Cancel"
                    isLoading={isProcessing}
                    icon="check-circle"
                    iconColor={PURPLE}
                />
            )}

            {/* Cancel RSVP Confirmation Modal (Only for attendees) */}
            {isAttendee && !isOrganizer && (
                <ConfirmModal
                    visible={showCancelModal}
                    onClose={() => setShowCancelModal(false)}
                    onConfirm={confirmCancelRSVP}
                    title="Leave Event"
                    message={`Are you sure you want to leave "${event.title}"? ${!isFree ? "This action cannot be undone." : ""}`}
                    confirmText="Leave Event"
                    cancelText="Stay"
                    isLoading={isProcessing}
                    icon="alert-circle"
                    iconColor="#DC2626"
                    confirmButtonStyle={{ backgroundColor: "#DC2626" }}
                />
            )}
        </>
    );
}

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

function Section({ title, children }) {
    return (
        <View style={tw`mb-8`}>
            <Text style={[tw`mb-4 text-gray-800 text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                {title}
            </Text>
            {children}
        </View>
    );
}

function DetailRow({
    icon: Icon,
    title,
    value,
    iconColor,
    showArrow = false,
    disabled = false,
    showAccessBadge = false
}) {
    return (
        <View style={tw`flex-row items-center justify-between opacity-${disabled ? 60 : 100}`}>
            <View style={tw`flex-row items-center flex-1`}>
                <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                { backgroundColor: `${iconColor}15` }]}>
                    <Icon size={20} color={iconColor} />
                </View>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center`}>
                        <Text style={[tw`text-gray-500 text-xs mb-1`, { fontFamily: "Poppins-Regular" }]}>
                            {title}
                        </Text>
                        {showAccessBadge && (
                            <View style={[tw`ml-2 px-2 py-0.5 rounded-full`, { backgroundColor: `${iconColor}15` }]}>
                                <Text style={[tw`text-xs`, { color: iconColor, fontFamily: "Poppins-SemiBold" }]}>
                                    ✓
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[tw`text-gray-800`, { fontFamily: "Poppins-Medium" }]}>
                        {value}
                    </Text>
                </View>
            </View>
            {showArrow && <ChevronRight size={20} color="#9CA3AF" />}
        </View>
    );
}