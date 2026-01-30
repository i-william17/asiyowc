// components/savings/CreatePodModal.js
import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Pressable,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";
import { useDispatch, useSelector } from "react-redux";
import { createPod, fetchMyPods } from "../../store/slices/savingsSlice";

/* ============================================================
   OPTIONS WITH ICONS
============================================================ */

const CATEGORY_OPTIONS = [
    { label: "Emergency", value: "emergency", icon: "medical", color: "#EF4444", bgColor: "#FEE2E2" },
    { label: "Investment", value: "investment", icon: "trending-up", color: "#10B981", bgColor: "#D1FAE5" },
    { label: "Education", value: "education", icon: "school", color: "#3B82F6", bgColor: "#DBEAFE" },
    { label: "Business", value: "business", icon: "briefcase", color: "#8B5CF6", bgColor: "#EDE9FE" },
    { label: "Personal", value: "personal", icon: "person", color: "#F59E0B", bgColor: "#FEF3C7" },
    { label: "Group", value: "group", icon: "people", color: "#EC4899", bgColor: "#FCE7F3" },
];

const PRIVACY_OPTIONS = [
    { label: "Public", value: "public", icon: "globe", color: "#10B981", bgColor: "#D1FAE5" },
    { label: "Private", value: "private", icon: "lock-closed", color: "#3B82F6", bgColor: "#DBEAFE" },
    { label: "Invite Only", value: "invite-only", icon: "mail", color: "#8B5CF6", bgColor: "#EDE9FE" },
];

const FREQUENCY_OPTIONS = [
    { label: "Daily", value: "daily", icon: "calendar", color: "#F59E0B", bgColor: "#FEF3C7" },
    { label: "Weekly", value: "weekly", icon: "calendar", color: "#3B82F6", bgColor: "#DBEAFE" },
    { label: "Monthly", value: "monthly", icon: "calendar", color: "#10B981", bgColor: "#D1FAE5" },
];

/* ============================================================
   ENHANCED MODAL WITH HUMAN-CENTERED DESIGN
============================================================ */

export default function CreatePodModal({
    visible,
    onClose,
}) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        targetAmount: "",
        currency: "KES",
        category: "group",
        privacy: "invite-only",
        frequency: "monthly",
        contributionAmount: "",
        deadline: "",
    });

    const dispatch = useDispatch();
    const token = useSelector((state) => state.auth.token);
    const creating = useSelector((state) => state.savings.creating);

    const [activeStep, setActiveStep] = useState(1); // 1, 2, or 3
    const totalSteps = 3;

    const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const isValid =
        form.name.trim().length >= 3 &&
        Number(form.targetAmount) > 0;

    const handleCreate = async () => {
        if (!isValid || creating) return;

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            goal: {
                targetAmount: Number(form.targetAmount),
                currency: form.currency,
                deadline: form.deadline || null,
            },
            category: form.category,
            settings: {
                privacy: form.privacy,
            },
            contributionSettings: {
                frequency: form.frequency,
                amount: form.contributionAmount
                    ? Number(form.contributionAmount)
                    : null,
            },
        };

        const res = await dispatch(createPod({ payload, token }));

        if (res.meta.requestStatus === "fulfilled") {
            dispatch(fetchMyPods(token)); // refresh list
            onClose?.();
        }
    };


    const getCategoryIcon = (value) => {
        const cat = CATEGORY_OPTIONS.find(o => o.value === value);
        return cat ? cat.icon : "people";
    };

    const getFrequencyIcon = (value) => {
        const freq = FREQUENCY_OPTIONS.find(o => o.value === value);
        return freq ? freq.icon : "calendar";
    };

    const getPrivacyIcon = (value) => {
        const priv = PRIVACY_OPTIONS.find(o => o.value === value);
        return priv ? priv.icon : "lock-closed";
    };

    // Calculate monthly contribution based on target and deadline
    const calculateMonthlyContribution = () => {
        if (!form.targetAmount || !form.deadline) return null;

        const target = Number(form.targetAmount);
        const deadline = new Date(form.deadline);
        const today = new Date();

        const monthsDiff = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * 30)));

        return Math.ceil(target / monthsDiff);
    };

    const suggestedMonthly = calculateMonthlyContribution();

    return (
        <Modal visible={visible} transparent animationType="slide">
            <Pressable style={tw`flex-1 bg-black/50`} onPress={onClose}>
                <Pressable
                    style={[
                        tw`absolute bottom-0 left-0 right-0 bg-white`,
                        {
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            maxHeight: Platform.OS === 'ios' ? '90%' : '95%'
                        }
                    ]}
                    onPress={() => { }}
                >
                    {/* ENHANCED HEADER WITH PROGRESS */}
                    <View style={[
                        tw`px-6 pt-6 pb-4`,
                        { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }
                    ]}>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <View>
                                <Text style={[tw`text-xl`, { fontFamily: "Poppins-Bold", color: "#111827" }]}>
                                    Create Savings Pod
                                </Text>
                                <Text style={[
                                    tw`text-sm mt-1`,
                                    { fontFamily: "Poppins-Regular", color: "#6B7280" }
                                ]}>
                                    Start your financial journey with friends
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                style={[
                                    tw`w-10 h-10 rounded-full items-center justify-center`,
                                    { backgroundColor: '#F3F4F6' }
                                ]}
                            >
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* PROGRESS STEPS */}
                        <View style={tw`flex-row items-center`}>
                            {[1, 2, 3].map((step) => (
                                <React.Fragment key={step}>
                                    <View style={tw`flex-row items-center`}>
                                        <View style={[
                                            tw`w-8 h-8 rounded-full items-center justify-center`,
                                            activeStep >= step
                                                ? { backgroundColor: '#6A1B9A' }
                                                : { backgroundColor: '#E5E7EB' }
                                        ]}>
                                            <Text style={{
                                                fontFamily: "Poppins-SemiBold",
                                                color: activeStep >= step ? '#FFFFFF' : '#9CA3AF',
                                                fontSize: 14
                                            }}>
                                                {step}
                                            </Text>
                                        </View>
                                        {step < totalSteps && (
                                            <View style={[
                                                tw`h-0.5 mx-2 flex-1`,
                                                activeStep > step
                                                    ? { backgroundColor: '#6A1B9A' }
                                                    : { backgroundColor: '#E5E7EB' }
                                            ]} />
                                        )}
                                    </View>
                                </React.Fragment>
                            ))}
                        </View>

                        {/* STEP LABELS */}
                        <View style={tw`flex-row justify-between mt-2`}>
                            <Text style={{
                                fontFamily: "Poppins-Medium",
                                color: activeStep === 1 ? '#6A1B9A' : '#9CA3AF',
                                fontSize: 12
                            }}>Basic Info</Text>
                            <Text style={{
                                fontFamily: "Poppins-Medium",
                                color: activeStep === 2 ? '#6A1B9A' : '#9CA3AF',
                                fontSize: 12
                            }}>Settings</Text>
                            <Text style={{
                                fontFamily: "Poppins-Medium",
                                color: activeStep === 3 ? '#6A1B9A' : '#9CA3AF',
                                fontSize: 12
                            }}>Review</Text>
                        </View>
                    </View>

                    <ScrollView
                        contentContainerStyle={tw`px-6 pb-10 pt-4`}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* STEP 1: BASIC INFO */}
                        {activeStep === 1 && (
                            <View>
                                {/* POD NAME WITH ICON */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-3`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#F3E8FF' }
                                        ]}>
                                            <Ionicons name="cube" size={20} color="#6A1B9A" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Pod Name
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                What's your savings goal called?
                                            </Text>
                                        </View>
                                    </View>
                                    <TextInput
                                        placeholder="e.g., Emergency Fund, Wedding Savings"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.name}
                                        onChangeText={(t) => update("name", t)}
                                        style={[
                                            enhancedInputStyle,
                                            form.name.length >= 3 && { borderColor: '#10B981' }
                                        ]}
                                    />
                                    {form.name.length > 0 && (
                                        <Text style={{
                                            fontFamily: "Poppins-Regular",
                                            color: form.name.length >= 3 ? '#10B981' : '#EF4444',
                                            fontSize: 12,
                                            marginTop: 4
                                        }}>
                                            {form.name.length >= 3 ? '✓ Good name!' : 'Name too short (min 3 chars)'}
                                        </Text>
                                    )}
                                </View>

                                {/* DESCRIPTION */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-3`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#E0F2FE' }
                                        ]}>
                                            <Ionicons name="document-text" size={20} color="#0EA5E9" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Description
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                What are you saving for?
                                            </Text>
                                        </View>
                                    </View>
                                    <TextInput
                                        placeholder="Briefly describe your savings goal..."
                                        placeholderTextColor="#9CA3AF"
                                        value={form.description}
                                        onChangeText={(t) => update("description", t)}
                                        multiline
                                        numberOfLines={3}
                                        style={[enhancedInputStyle, tw`h-32 text-left`]}
                                    />
                                </View>

                                {/* TARGET AMOUNT WITH CURRENCY */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-3`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#DCFCE7' }
                                        ]}>
                                            <Ionicons name="flag" size={20} color="#10B981" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Target Amount
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                How much do you want to save?
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[
                                        tw`flex-row items-center rounded-2xl overflow-hidden`,
                                        {
                                            borderWidth: 1,
                                            borderColor: Number(form.targetAmount) > 0 ? '#10B981' : '#E5E7EB',
                                            backgroundColor: '#F9FAFB'
                                        }
                                    ]}>
                                        <View style={[
                                            tw`px-4 py-4 items-center justify-center`,
                                            { backgroundColor: '#6A1B9A', minWidth: 80 }
                                        ]}>
                                            <Text style={{
                                                fontFamily: "Poppins-Bold",
                                                color: "#FFFFFF",
                                                fontSize: 16
                                            }}>
                                                KES
                                            </Text>
                                        </View>
                                        <TextInput
                                            placeholder="0"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="number-pad"
                                            value={form.targetAmount}
                                            onChangeText={(t) => update("targetAmount", t)}
                                            style={[
                                                tw`flex-1 px-4 py-4`,
                                                { fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#111827" }
                                            ]}
                                        />
                                    </View>
                                    {form.targetAmount && Number(form.targetAmount) > 0 && (
                                        <View style={tw`mt-3 p-3 rounded-xl bg-green-50 border border-green-100`}>
                                            <Text style={{
                                                fontFamily: "Poppins-Medium",
                                                color: "#065F46",
                                                fontSize: 13,
                                                textAlign: 'center'
                                            }}>
                                                🎯 Goal set: KES {Number(form.targetAmount).toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* NEXT BUTTON */}
                                <TouchableOpacity
                                    onPress={() => setActiveStep(2)}
                                    disabled={!form.name.trim() || !form.targetAmount}
                                    style={[
                                        tw`py-4 rounded-2xl mt-4`,
                                        form.name.trim() && form.targetAmount
                                            ? stepButtonStyle
                                            : tw`bg-gray-200`
                                    ]}
                                >
                                    <Text style={{
                                        textAlign: "center",
                                        fontFamily: "Poppins-SemiBold",
                                        color: form.name.trim() && form.targetAmount ? "#FFFFFF" : "#9CA3AF",
                                        fontSize: 16
                                    }}>
                                        Continue to Settings
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 2: SETTINGS */}
                        {activeStep === 2 && (
                            <View>
                                {/* CATEGORY SELECTION */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-4`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#F3E8FF' }
                                        ]}>
                                            <Ionicons name={getCategoryIcon(form.category)} size={20} color="#6A1B9A" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Category
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                What type of savings is this?
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={tw`flex-row flex-wrap justify-between`}>
                                        {CATEGORY_OPTIONS.map((o) => {
                                            const active = o.value === form.category;
                                            return (
                                                <TouchableOpacity
                                                    key={o.value}
                                                    onPress={() => update("category", o.value)}
                                                    style={[
                                                        tw`flex-row items-center mb-3 p-3 rounded-xl`,
                                                        {
                                                            width: '48%',
                                                            backgroundColor: active ? o.bgColor : '#F9FAFB',
                                                            borderWidth: 1,
                                                            borderColor: active ? o.color : '#E5E7EB'
                                                        }
                                                    ]}
                                                >
                                                    <View style={[
                                                        tw`w-8 h-8 rounded-lg items-center justify-center mr-2`,
                                                        { backgroundColor: active ? o.color : '#E5E7EB' }
                                                    ]}>
                                                        <Ionicons name={o.icon} size={16} color={active ? "#FFFFFF" : "#6B7280"} />
                                                    </View>
                                                    <Text style={{
                                                        fontFamily: "Poppins-Medium",
                                                        color: active ? o.color : "#374151",
                                                        fontSize: 13
                                                    }}>
                                                        {o.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* PRIVACY SETTINGS */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-4`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#E0F2FE' }
                                        ]}>
                                            <Ionicons name={getPrivacyIcon(form.privacy)} size={20} color="#0EA5E9" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Privacy
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                Who can see and join this pod?
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={tw`flex-row justify-between`}>
                                        {PRIVACY_OPTIONS.map((o) => {
                                            const active = o.value === form.privacy;
                                            return (
                                                <TouchableOpacity
                                                    key={o.value}
                                                    onPress={() => update("privacy", o.value)}
                                                    style={[
                                                        tw`items-center p-3 rounded-xl`,
                                                        {
                                                            width: '30%',
                                                            backgroundColor: active ? o.bgColor : '#F9FAFB',
                                                            borderWidth: 1,
                                                            borderColor: active ? o.color : '#E5E7EB'
                                                        }
                                                    ]}
                                                >
                                                    <View style={[
                                                        tw`w-10 h-10 rounded-full items-center justify-center mb-2`,
                                                        { backgroundColor: active ? o.color : '#E5E7EB' }
                                                    ]}>
                                                        <Ionicons name={o.icon} size={20} color={active ? "#FFFFFF" : "#6B7280"} />
                                                    </View>
                                                    <Text style={{
                                                        fontFamily: "Poppins-Medium",
                                                        color: active ? o.color : "#374151",
                                                        fontSize: 12,
                                                        textAlign: 'center'
                                                    }}>
                                                        {o.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* FREQUENCY & AMOUNT */}
                                <View style={tw`mb-6`}>
                                    <View style={tw`flex-row items-center mb-4`}>
                                        <View style={[
                                            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                                            { backgroundColor: '#DCFCE7' }
                                        ]}>
                                            <Ionicons name={getFrequencyIcon(form.frequency)} size={20} color="#10B981" />
                                        </View>
                                        <View>
                                            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                                                Contribution Plan
                                            </Text>
                                            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#6B7280" }]}>
                                                How often will you save?
                                            </Text>
                                        </View>
                                    </View>

                                    {/* FREQUENCY SELECTION */}
                                    <View style={tw`flex-row mb-4`}>
                                        {FREQUENCY_OPTIONS.map((o) => {
                                            const active = o.value === form.frequency;
                                            return (
                                                <TouchableOpacity
                                                    key={o.value}
                                                    onPress={() => update("frequency", o.value)}
                                                    style={[
                                                        tw`flex-1 items-center p-3 mx-1 rounded-xl`,
                                                        {
                                                            backgroundColor: active ? o.bgColor : '#F9FAFB',
                                                            borderWidth: 1,
                                                            borderColor: active ? o.color : '#E5E7EB'
                                                        }
                                                    ]}
                                                >
                                                    <Text style={{
                                                        fontFamily: "Poppins-SemiBold",
                                                        color: active ? o.color : "#374151",
                                                        fontSize: 14
                                                    }}>
                                                        {o.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* SUGGESTED AMOUNT */}
                                    <View style={tw`mb-4`}>
                                        <Text style={[tw`mb-2`, { fontFamily: "Poppins-Medium", color: "#374151" }]}>
                                            Suggested Contribution (Optional)
                                        </Text>
                                        <TextInput
                                            placeholder="Enter amount or leave blank"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="number-pad"
                                            value={form.contributionAmount}
                                            onChangeText={(t) => update("contributionAmount", t)}
                                            style={enhancedInputStyle}
                                        />
                                        {suggestedMonthly && form.targetAmount && (
                                            <TouchableOpacity
                                                onPress={() => update("contributionAmount", suggestedMonthly.toString())}
                                                style={tw`mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100`}
                                            >
                                                <Text style={{
                                                    fontFamily: "Poppins-Medium",
                                                    color: "#1E40AF",
                                                    fontSize: 13,
                                                    textAlign: 'center'
                                                }}>
                                                    💡 Suggested: KES {suggestedMonthly.toLocaleString()} monthly
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* DEADLINE */}
                                    <View>
                                        <Text style={[tw`mb-2`, { fontFamily: "Poppins-Medium", color: "#374151" }]}>
                                            Target Date (Optional)
                                        </Text>
                                        <TextInput
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.deadline}
                                            onChangeText={(t) => update("deadline", t)}
                                            style={enhancedInputStyle}
                                        />
                                        {form.deadline && (
                                            <Text style={{
                                                fontFamily: "Poppins-Regular",
                                                color: "#6B7280",
                                                fontSize: 12,
                                                marginTop: 4
                                            }}>
                                                Target date: {form.deadline}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* NAVIGATION BUTTONS */}
                                <View style={tw`flex-row mt-4`}>
                                    <TouchableOpacity
                                        onPress={() => setActiveStep(1)}
                                        style={[
                                            tw`flex-1 py-3 rounded-xl mr-2`,
                                            { backgroundColor: '#F3F4F6' }
                                        ]}
                                    >
                                        <Text style={{
                                            textAlign: "center",
                                            fontFamily: "Poppins-SemiBold",
                                            color: "#374151",
                                            fontSize: 14
                                        }}>
                                            Back
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setActiveStep(3)}
                                        style={[tw`flex-1 py-3 rounded-xl ml-2`, stepButtonStyle]}
                                    >
                                        <Text style={{
                                            textAlign: "center",
                                            fontFamily: "Poppins-SemiBold",
                                            color: "#FFFFFF",
                                            fontSize: 14
                                        }}>
                                            Review & Create
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* STEP 3: REVIEW */}
                        {activeStep === 3 && (
                            <View>
                                <View style={tw`items-center mb-6`}>
                                    <View style={[
                                        tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
                                        { backgroundColor: '#F3E8FF' }
                                    ]}>
                                        <Ionicons name="checkmark-circle" size={40} color="#6A1B9A" />
                                    </View>
                                    <Text style={[tw`text-xl`, { fontFamily: "Poppins-Bold", color: "#111827" }]}>
                                        Ready to Create!
                                    </Text>
                                    <Text style={[
                                        tw`text-center mt-2`,
                                        { fontFamily: "Poppins-Regular", color: "#6B7280" }
                                    ]}>
                                        Review your savings pod details below
                                    </Text>
                                </View>

                                {/* SUMMARY CARD */}
                                <View style={[
                                    tw`p-5 rounded-2xl mb-6`,
                                    { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }
                                ]}>
                                    <SummaryItem
                                        icon="cube"
                                        title="Pod Name"
                                        value={form.name}
                                        color="#6A1B9A"
                                    />
                                    <SummaryItem
                                        icon="flag"
                                        title="Target Amount"
                                        value={`KES ${Number(form.targetAmount).toLocaleString()}`}
                                        color="#10B981"
                                    />
                                    <SummaryItem
                                        icon={getCategoryIcon(form.category)}
                                        title="Category"
                                        value={CATEGORY_OPTIONS.find(o => o.value === form.category)?.label || 'Group'}
                                        color="#F59E0B"
                                    />
                                    <SummaryItem
                                        icon={getPrivacyIcon(form.privacy)}
                                        title="Privacy"
                                        value={PRIVACY_OPTIONS.find(o => o.value === form.privacy)?.label || 'Private'}
                                        color="#3B82F6"
                                    />
                                    <SummaryItem
                                        icon={getFrequencyIcon(form.frequency)}
                                        title="Frequency"
                                        value={FREQUENCY_OPTIONS.find(o => o.value === form.frequency)?.label || 'Monthly'}
                                        color="#8B5CF6"
                                    />
                                    {form.contributionAmount && (
                                        <SummaryItem
                                            icon="cash"
                                            title="Suggested Contribution"
                                            value={`KES ${Number(form.contributionAmount).toLocaleString()}`}
                                            color="#EC4899"
                                        />
                                    )}
                                    {form.deadline && (
                                        <SummaryItem
                                            icon="calendar"
                                            title="Target Date"
                                            value={form.deadline}
                                            color="#EF4444"
                                        />
                                    )}
                                </View>

                                {/* INSIGHTS */}
                                <View style={[
                                    tw`p-4 rounded-2xl mb-6`,
                                    { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FBBF24' }
                                ]}>
                                    <Text style={[tw`mb-2`, { fontFamily: "Poppins-SemiBold", color: "#92400E" }]}>
                                        🎯 Your Savings Plan
                                    </Text>
                                    <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: "#92400E" }]}>
                                        You're creating a <Text style={{ fontFamily: "Poppins-SemiBold" }}>
                                            {form.privacy === 'public' ? 'public' : form.privacy === 'private' ? 'private' : 'invite-only'}
                                        </Text> savings pod to save
                                        <Text style={{ fontFamily: "Poppins-SemiBold" }}> KES {Number(form.targetAmount).toLocaleString()}</Text>
<Text>
  {form.deadline ? ` by ${form.deadline}` : ' with no set deadline'}
</Text>
                                    </Text>
                                </View>

                                {/* FINAL ACTION BUTTONS */}
                                <View style={tw`flex-row`}>
                                    <TouchableOpacity
                                        onPress={() => setActiveStep(2)}
                                        style={[
                                            tw`flex-1 py-4 rounded-xl mr-2`,
                                            { backgroundColor: '#F3F4F6' }
                                        ]}
                                    >
                                        <Text style={{
                                            textAlign: "center",
                                            fontFamily: "Poppins-SemiBold",
                                            color: "#374151",
                                            fontSize: 14
                                        }}>
                                            Edit Details
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        disabled={!isValid || creating}
                                        onPress={handleCreate}
                                        activeOpacity={0.85}
                                        style={[
                                            tw`flex-1 py-4 rounded-xl ml-2`,
                                            isValid ? createButtonStyle : tw`bg-gray-300`
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                textAlign: "center",
                                                fontFamily: "Poppins-SemiBold",
                                                color: isValid ? "#FFFFFF" : "#6B7280",
                                                fontSize: 16
                                            }}
                                        >
                                            {creating ? "Creating..." : "Create Pod"}

                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

/* ============================================================
   ENHANCED UI COMPONENTS
============================================================ */

const SummaryItem = ({ icon, title, value, color }) => (
    <View style={tw`flex-row items-center py-3 border-b border-gray-100 last:border-b-0`}>
        <View style={[
            tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
            { backgroundColor: `${color}15` }
        ]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={tw`flex-1`}>
            <Text style={[tw`text-sm`, { fontFamily: "Poppins-Medium", color: "#6B7280" }]}>
                {title}
            </Text>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-SemiBold", color: "#111827" }]}>
                {value}
            </Text>
        </View>
    </View>
);

const enhancedInputStyle = [
    tw`px-4 py-3 rounded-xl bg-gray-50 text-gray-900`,
    {
        fontFamily: "Poppins-Medium",
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
];

const stepButtonStyle = {
    backgroundColor: '#6A1B9A',
    shadowColor: '#6A1B9A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
};

const createButtonStyle = {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
};