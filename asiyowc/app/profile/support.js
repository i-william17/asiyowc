import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Image,
    Platform,
    KeyboardAvoidingView,
    useWindowDimensions,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";

import tw from "../../utils/tw";

import {
    submitSupportTicket,
    submitFeedback,
    resetSupportState,
    resetFeedbackState,
} from "../../store/slices/supportSlice";

export default function SupportScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { width } = useWindowDimensions();
    const scrollViewRef = useRef(null);
    const tabAnimation = useRef(new Animated.Value(0)).current;

    const {
        submittingSupport,
        submittingFeedback,
        supportSuccess,
        feedbackSuccess,
        error,
    } = useSelector((state) => state.support);

    const [activeTab, setActiveTab] = useState("support");
    const [focusedInput, setFocusedInput] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);

    /* ============================================================
       SIZE LIMITS
    ============================================================ */
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

    /* ============================================================
       SUPPORT FORM STATE
    ============================================================ */

    const [supportForm, setSupportForm] = useState({
        subject: "",
        message: "",
        category: "technical_issue",
        priority: "medium",
    });

    const [media, setMedia] = useState(null);
    const [mediaError, setMediaError] = useState(false);

    /* ============================================================
       FEEDBACK FORM STATE
    ============================================================ */

    const [feedbackForm, setFeedbackForm] = useState({
        rating: 0,
        experience: "good",
        message: "",
        usageDuration: "less_than_week",
        featureArea: "general",
        recommend: true,
    });

    /* ============================================================
       OPTIONS
    ============================================================ */

    const categoryOptions = [
        { value: "technical_issue", label: "Technical Issue" },
        { value: "account_problem", label: "Account Problem" },
        { value: "payment_issue", label: "Payment Issue" },
        { value: "bug_report", label: "Bug Report" },
        { value: "feature_request", label: "Feature Request" },
        { value: "security_concern", label: "Security Concern" },
        { value: "other", label: "Other" },
    ];

    const priorityOptions = [
        { value: "low", label: "Low", color: "#10B981" },
        { value: "medium", label: "Medium", color: "#F59E0B" },
        { value: "high", label: "High", color: "#F97316" },
        { value: "urgent", label: "Urgent", color: "#EF4444" },
    ];

    const experienceOptions = [
        { value: "excellent", label: "Excellent" },
        { value: "good", label: "Good" },
        { value: "average", label: "Average" },
        { value: "poor", label: "Poor" },
        { value: "terrible", label: "Terrible" },
    ];

    const usageDurationOptions = [
        { value: "first_time", label: "First time" },
        { value: "less_than_week", label: "Less than a week" },
        { value: "1_3_months", label: "1-3 months" },
        { value: "3_6_months", label: "3-6 months" },
        { value: "6_12_months", label: "6-12 months" },
        { value: "1_year_plus", label: "More than a year" },
    ];

    const featureAreaOptions = [
        { value: "community", label: "Community" },
        { value: "programs", label: "Programs" },
        // { value: "marketplace", label: "Marketplace" },
        { value: "savings_pods", label: "Savings Pods" },
        { value: "mentorship", label: "Mentorship" },
        { value: "wellness", label: "Wellness" },
        { value: "general", label: "General" },
    ];

    /* ============================================================
       ANIMATIONS
    ============================================================ */

    useEffect(() => {
        Animated.spring(tabAnimation, {
            toValue: activeTab === "support" ? 0 : 1,
            useNativeDriver: false,
            tension: 65,
            friction: 11,
        }).start();
    }, [activeTab]);

    const tabIndicatorPosition = tabAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    /* ============================================================
       SUCCESS RESET
    ============================================================ */

    useEffect(() => {
        if (supportSuccess) {
            setSupportForm({
                subject: "",
                message: "",
                category: "technical_issue",
                priority: "medium",
            });

            setMedia(null);
            setMediaError(false);

            dispatch(resetSupportState());

            // Scroll to top after successful submission
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }

        if (feedbackSuccess) {
            setFeedbackForm({
                rating: 0,
                experience: "good",
                message: "",
                usageDuration: "less_than_week",
                featureArea: "general",
                recommend: true,
            });

            dispatch(resetFeedbackState());

            // Scroll to top after successful submission
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
    }, [supportSuccess, feedbackSuccess]);

    /* ============================================================
       IMAGE PICKER WITH SIZE VALIDATION
    ============================================================ */

    const pickMedia = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== "granted") {
                alert("Camera roll permission is required to upload media.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
                allowsEditing: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            const isVideo = file.type === "video";
            const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

            let size = file.fileSize;

            /* ============================================================
               WEB FALLBACK (fileSize may not exist)
            ============================================================ */

            if (!size && Platform.OS === "web") {
                const response = await fetch(file.uri);
                const blob = await response.blob();
                size = blob.size;
            }

            /* ============================================================
               SIZE VALIDATION
            ============================================================ */

            if (size > maxSize) {
                alert(
                    isVideo
                        ? "Video must be smaller than 20MB."
                        : "Image must be smaller than 5MB."
                );
                return;
            }

            const uriParts = file.uri.split(".");
            const fileType = uriParts[uriParts.length - 1];

            setMedia({
                uri: file.uri,
                name: file.fileName || `upload.${fileType}`,
                type: file.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
                size,
            });

            setMediaError(false);

        } catch (error) {
            console.error("Media picker error:", error);
            setMediaError(true);
        }
    };

    const removeMedia = () => {
        setMedia(null);
        setMediaError(false);
    };

    /* ============================================================
       VALIDATION
    ============================================================ */

    const isSupportFormValid = () => {
        return supportForm.subject.trim().length > 0 &&
            supportForm.message.trim().length > 0;
    };

    const isFeedbackFormValid = () => {
        return feedbackForm.rating > 0;
    };

    /* ============================================================
       SUBMIT HANDLERS
    ============================================================ */

    const handleSupportSubmit = () => {
        if (!isSupportFormValid()) return;

        dispatch(
            submitSupportTicket({
                ...supportForm,
                media,
            })
        );
    };

    const handleFeedbackSubmit = () => {
        if (!isFeedbackFormValid()) return;

        dispatch(submitFeedback(feedbackForm));
    };

    /* ============================================================
       SELECTOR COMPONENT
    ============================================================ */

    const Selector = ({ label, value, options, onSelect, type }) => {
        const selectedOption = options.find(opt => opt.value === value);
        const isOpen = openDropdown === type;

        return (
            <View style={tw`mb-5`}>
                <Text style={[tw`text-xs text-slate-600 mb-1.5 tracking-wide`, { fontFamily: 'Poppins-Medium' }]}>
                    {label}
                </Text>

                <TouchableOpacity
                    onPress={() => setOpenDropdown(isOpen ? null : type)}
                    style={tw`flex-row items-center justify-between bg-slate-50 rounded-xl p-3.5 border-2 border-transparent`}
                    activeOpacity={0.7}
                >
                    <View style={tw`flex-row items-center`}>
                        {type === 'priority' && selectedOption?.color && (
                            <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: selectedOption.color }]} />
                        )}
                        <Text style={[tw`text-sm text-slate-900`, { fontFamily: 'Poppins-Regular' }]}>
                            {selectedOption?.label}
                        </Text>
                    </View>
                    <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#64748B"
                    />
                </TouchableOpacity>

                {isOpen && (
                    <View style={tw`mt-1.5 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden`}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => {
                                    onSelect(option.value);
                                    setOpenDropdown(null);
                                }}
                                style={[
                                    tw`flex-row items-center justify-between px-3.5 py-2.5`,
                                    index !== options.length - 1 && tw`border-b border-slate-100`,
                                    option.value === value && tw`bg-indigo-50`
                                ]}
                            >
                                <View style={tw`flex-row items-center`}>
                                    {type === 'priority' && option.color && (
                                        <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: option.color }]} />
                                    )}
                                    <Text style={[
                                        tw`text-sm`,
                                        option.value === value ? tw`text-indigo-600` : tw`text-slate-900`,
                                        { fontFamily: option.value === value ? 'Poppins-Medium' : 'Poppins-Regular' }
                                    ]}>
                                        {option.label}
                                    </Text>
                                </View>
                                {option.value === value && (
                                    <Ionicons name="checkmark" size={18} color="#6366F1" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={tw`flex-1 bg-slate-50`}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            {/* ============================================================
               HEADER
            ============================================================ */}

            <View style={tw`flex-row items-center px-6 pt-[50px] pb-4 bg-white border-b border-slate-100`}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`w-9 h-9 rounded-lg bg-slate-50 items-center justify-center mr-3`}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color="#1E293B" />
                </TouchableOpacity>

                <View style={tw`flex-1`}>
                    <Text style={[tw`text-xl text-slate-900`, { fontFamily: 'Poppins-SemiBold' }]}>
                        Support & Feedback
                    </Text>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={tw`flex-1`}
                contentContainerStyle={tw`px-5 pb-8 pt-4`}
                keyboardShouldPersistTaps="handled"
            >
                {/* ============================================================
                   TAB SWITCHER
                ============================================================ */}

                <View style={tw`mb-6`}>
                    <View style={tw`flex-row bg-slate-100 rounded-xl p-1 relative`}>
                        {["support", "feedback"].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => {
                                    setActiveTab(tab);
                                    setOpenDropdown(null);
                                }}
                                style={tw`flex-1 py-2.5 items-center z-10`}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    tw`text-sm`,
                                    activeTab === tab ? tw`text-slate-900` : tw`text-slate-500`,
                                    { fontFamily: activeTab === tab ? 'Poppins-SemiBold' : 'Poppins-Medium' }
                                ]}>
                                    {tab === "support" ? "Support" : "Feedback"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <Animated.View
                            style={[
                                tw`absolute w-1/2 h-full bg-white rounded-[10px] shadow-sm z-0`,
                                { left: tabIndicatorPosition }
                            ]}
                        />
                    </View>
                </View>

                {/* ============================================================
                   SUPPORT FORM
                ============================================================ */}

                {activeTab === "support" && (
                    <View style={tw`bg-white rounded-2xl p-5 shadow-sm border border-slate-100`}>

                        {/* CATEGORY SELECTOR */}
                        <Selector
                            label="Category"
                            value={supportForm.category}
                            options={categoryOptions}
                            onSelect={(value) => setSupportForm({ ...supportForm, category: value })}
                            type="category"
                        />

                        {/* PRIORITY SELECTOR */}
                        <Selector
                            label="Priority"
                            value={supportForm.priority}
                            options={priorityOptions}
                            onSelect={(value) => setSupportForm({ ...supportForm, priority: value })}
                            type="priority"
                        />

                        {/* SUBJECT FIELD */}
                        <View style={tw`mb-4`}>
                            <Text style={[
                                tw`text-xs text-slate-600 mb-1.5 tracking-wide`,
                                focusedInput === "subject" && tw`text-indigo-500`,
                                { fontFamily: 'Poppins-Medium' }
                            ]}>
                                Subject
                            </Text>
                            <TextInput
                                placeholder="Brief summary"
                                placeholderTextColor="#94A3B8"
                                value={supportForm.subject}
                                onChangeText={(text) =>
                                    setSupportForm({ ...supportForm, subject: text })
                                }
                                onFocus={() => setFocusedInput("subject")}
                                onBlur={() => setFocusedInput(null)}
                                maxLength={100}
                                style={[
                                    tw`bg-slate-50 rounded-xl px-3.5 py-3 text-sm text-slate-900 border-2`,
                                    focusedInput === "subject" ? tw`border-indigo-500 bg-white` : tw`border-transparent`,
                                    { fontFamily: 'Poppins-Regular' }
                                ]}
                            />
                        </View>

                        {/* MESSAGE FIELD */}
                        <View style={tw`mb-5`}>
                            <Text style={[
                                tw`text-xs text-slate-600 mb-1.5 tracking-wide`,
                                focusedInput === "message" && tw`text-indigo-500`,
                                { fontFamily: 'Poppins-Medium' }
                            ]}>
                                Message
                            </Text>
                            <TextInput
                                placeholder="Describe your issue..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={supportForm.message}
                                onChangeText={(text) =>
                                    setSupportForm({ ...supportForm, message: text })
                                }
                                onFocus={() => setFocusedInput("message")}
                                onBlur={() => setFocusedInput(null)}
                                style={[
                                    tw`bg-slate-50 rounded-xl px-3.5 py-3 text-sm text-slate-900 border-2 min-h-[100px]`,
                                    focusedInput === "message" ? tw`border-indigo-500 bg-white` : tw`border-transparent`,
                                    { fontFamily: 'Poppins-Regular', textAlignVertical: 'top' }
                                ]}
                                maxLength={1000}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* MEDIA UPLOAD */}
                        <View style={tw`mb-6`}>
                            <Text style={[tw`text-xs text-slate-600 mb-1.5 tracking-wide`, { fontFamily: 'Poppins-Medium' }]}>
                                Attachments (optional)
                            </Text>

                            {!media ? (
                                <TouchableOpacity
                                    onPress={pickMedia}
                                    style={tw`flex-row items-center bg-slate-50 rounded-xl p-3.5 border-2 border-dashed border-slate-200`}
                                    activeOpacity={0.7}
                                >
                                    <View style={tw`w-9 h-9 rounded-lg bg-indigo-50 items-center justify-center mr-3`}>
                                        <Ionicons name="cloud-upload-outline" size={18} color="#6366F1" />
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={[tw`text-sm text-slate-900 mb-0.5`, { fontFamily: 'Poppins-Medium' }]}>
                                            Tap to upload
                                        </Text>
                                        <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'Poppins-Regular' }]}>
                                            Images (5MB max) • Videos (20MB max)
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            ) : (
                                <View style={tw`relative rounded-xl overflow-hidden bg-slate-50`}>
                                    <Image
                                        source={{ uri: media.uri }}
                                        style={tw`w-full h-36 rounded-xl`}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        style={tw`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center`}
                                        onPress={removeMedia}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="close" size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <View style={tw`absolute bottom-2 left-2 flex-row items-center bg-black/50 px-2 py-1 rounded-full`}>
                                        <Ionicons
                                            name={media.type?.includes('video') ? "videocam" : "image"}
                                            size={10}
                                            color="#FFFFFF"
                                        />
                                        <Text style={[tw`text-[10px] text-white ml-1`, { fontFamily: 'Poppins-Medium' }]}>
                                            {media.type?.includes('video') ? 'Video' : 'Image'}
                                        </Text>
                                        {media.size && (
                                            <Text style={[tw`text-[10px] text-white ml-2`, { fontFamily: 'Poppins-Medium' }]}>
                                                {(media.size / 1024 / 1024).toFixed(1)} MB
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* ERROR MESSAGE */}
                        {error && (
                            <View style={tw`flex-row items-center bg-red-50 rounded-lg p-2.5 mb-5`}>
                                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                <Text style={[tw`text-xs text-red-500 ml-2 flex-1`, { fontFamily: 'Poppins-Regular' }]}>
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* SUBMIT BUTTON */}
                        <TouchableOpacity
                            style={[
                                tw`flex-row items-center justify-center bg-indigo-500 py-3.5 rounded-xl gap-1.5`,
                                (!isSupportFormValid() || submittingSupport) && tw`opacity-50 bg-slate-400`
                            ]}
                            onPress={handleSupportSubmit}
                            disabled={!isSupportFormValid() || submittingSupport}
                            activeOpacity={0.8}
                        >
                            {submittingSupport ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={[tw`text-sm text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
                                        Submit Ticket
                                    </Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>

                    </View>
                )}

                {/* ============================================================
                   FEEDBACK FORM
                ============================================================ */}

                {activeTab === "feedback" && (
                    <View style={tw`bg-white rounded-2xl p-5 shadow-sm border border-slate-100`}>

                        {/* STAR RATING */}
                        <View style={tw`mb-6`}>
                            <Text style={[tw`text-xs text-slate-600 mb-2 tracking-wide`, { fontFamily: 'Poppins-Medium' }]}>
                                How would you rate your experience?
                            </Text>

                            <View style={tw`flex-row justify-between mt-3 mb-1`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() =>
                                            setFeedbackForm({
                                                ...feedbackForm,
                                                rating: star,
                                            })
                                        }
                                        activeOpacity={0.7}
                                        style={tw`p-0.5`}
                                    >
                                        <Ionicons
                                            name={feedbackForm.rating >= star ? "star" : "star-outline"}
                                            size={28}
                                            color={feedbackForm.rating >= star ? "#F59E0B" : "#CBD5E1"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {feedbackForm.rating > 0 && (
                                <Text style={[tw`text-base text-slate-900 text-center mt-1`, { fontFamily: 'Poppins-Medium' }]}>
                                    {feedbackForm.rating === 1 && "Very Poor"}
                                    {feedbackForm.rating === 2 && "Poor"}
                                    {feedbackForm.rating === 3 && "Average"}
                                    {feedbackForm.rating === 4 && "Good"}
                                    {feedbackForm.rating === 5 && "Excellent"}
                                </Text>
                            )}
                        </View>

                        {/* EXPERIENCE SELECTOR */}
                        <Selector
                            label="Overall experience"
                            value={feedbackForm.experience}
                            options={experienceOptions}
                            onSelect={(value) => setFeedbackForm({ ...feedbackForm, experience: value })}
                            type="experience"
                        />

                        {/* USAGE DURATION SELECTOR */}
                        <Selector
                            label="How long have you been using the app?"
                            value={feedbackForm.usageDuration}
                            options={usageDurationOptions}
                            onSelect={(value) => setFeedbackForm({ ...feedbackForm, usageDuration: value })}
                            type="usageDuration"
                        />

                        {/* FEATURE AREA SELECTOR */}
                        <Selector
                            label="Which feature area does this feedback relate to?"
                            value={feedbackForm.featureArea}
                            options={featureAreaOptions}
                            onSelect={(value) => setFeedbackForm({ ...feedbackForm, featureArea: value })}
                            type="featureArea"
                        />

                        {/* FEEDBACK MESSAGE */}
                        <View style={tw`mb-5`}>
                            <Text style={[
                                tw`text-xs text-slate-600 mb-1.5 tracking-wide`,
                                focusedInput === "feedback" && tw`text-indigo-500`,
                                { fontFamily: 'Poppins-Medium' }
                            ]}>
                                Additional feedback
                            </Text>
                            <TextInput
                                placeholder="Share your thoughts..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={feedbackForm.message}
                                onChangeText={(text) =>
                                    setFeedbackForm({
                                        ...feedbackForm,
                                        message: text,
                                    })
                                }
                                onFocus={() => setFocusedInput("feedback")}
                                onBlur={() => setFocusedInput(null)}
                                style={[
                                    tw`bg-slate-50 rounded-xl px-3.5 py-3 text-sm text-slate-900 border-2 min-h-[100px]`,
                                    focusedInput === "feedback" ? tw`border-indigo-500 bg-white` : tw`border-transparent`,
                                    { fontFamily: 'Poppins-Regular', textAlignVertical: 'top' }
                                ]}
                                maxLength={500}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* RECOMMEND TOGGLE */}
                        <View style={tw`mb-6`}>
                            <Text style={[tw`text-xs text-slate-600 mb-2 tracking-wide`, { fontFamily: 'Poppins-Medium' }]}>
                                Would you recommend us to others?
                            </Text>

                            <View style={tw`flex-row gap-2`}>
                                <TouchableOpacity
                                    onPress={() => setFeedbackForm({ ...feedbackForm, recommend: true })}
                                    style={[
                                        tw`flex-1 py-3 rounded-xl items-center border-2`,
                                        feedbackForm.recommend
                                            ? tw`bg-indigo-50 border-indigo-500`
                                            : tw`bg-slate-50 border-transparent`
                                    ]}
                                >
                                    <Text style={[
                                        tw`text-sm`,
                                        feedbackForm.recommend ? tw`text-indigo-600` : tw`text-slate-600`,
                                        { fontFamily: feedbackForm.recommend ? 'Poppins-SemiBold' : 'Poppins-Medium' }
                                    ]}>
                                        Yes
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setFeedbackForm({ ...feedbackForm, recommend: false })}
                                    style={[
                                        tw`flex-1 py-3 rounded-xl items-center border-2`,
                                        !feedbackForm.recommend
                                            ? tw`bg-indigo-50 border-indigo-500`
                                            : tw`bg-slate-50 border-transparent`
                                    ]}
                                >
                                    <Text style={[
                                        tw`text-sm`,
                                        !feedbackForm.recommend ? tw`text-indigo-600` : tw`text-slate-600`,
                                        { fontFamily: !feedbackForm.recommend ? 'Poppins-SemiBold' : 'Poppins-Medium' }
                                    ]}>
                                        No
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ERROR MESSAGE */}
                        {error && (
                            <View style={tw`flex-row items-center bg-red-50 rounded-lg p-2.5 mb-5`}>
                                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                <Text style={[tw`text-xs text-red-500 ml-2 flex-1`, { fontFamily: 'Poppins-Regular' }]}>
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* SUBMIT BUTTON */}
                        <TouchableOpacity
                            style={[
                                tw`flex-row items-center justify-center bg-indigo-500 py-3.5 rounded-xl gap-1.5`,
                                (!isFeedbackFormValid() || submittingFeedback) && tw`opacity-50 bg-slate-400`
                            ]}
                            onPress={handleFeedbackSubmit}
                            disabled={!isFeedbackFormValid() || submittingFeedback}
                            activeOpacity={0.8}
                        >
                            {submittingFeedback ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={[tw`text-sm text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
                                        Submit Feedback
                                    </Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>

                    </View>
                )}

                {/* BOTTOM SAFE SPACE */}
                <View style={tw`h-6`} />

            </ScrollView>
        </KeyboardAvoidingView>
    );
}