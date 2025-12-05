import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Easing,
    Modal,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";

import { programService } from "../../../services/program";
import tw from "../../../utils/tw";

const { height } = Dimensions.get("window");

const LearnScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const videoRef = useRef(null);
    const confettiRef = useRef(null);
    const confettiProgramRef = useRef(null);

    const [program, setProgram] = useState(null);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingComplete, setMarkingComplete] = useState(false);

    // 🎉 Modal states
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showProgramModal, setShowProgramModal] = useState(false);

    // ---- Load Animations ----
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        Animated.timing(slideUp, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, []);

    // -------------------------------------------
    // LOAD PROGRAM — FETCH ALL PROGRESS STATES
    // -------------------------------------------
    useEffect(() => {
        const load = async () => {
            try {
                const res = await programService.getProgram(id);
                const data = res.data || res;

                const programData = data.program;
                const userProgress = data.userProgress || {};

                const completedModules = userProgress.completedModules || [];
                const progressValue = userProgress.progress ?? 0;

                // Save full program
                setProgram({
                    ...programData,
                    userProgress: {
                        completedModules,
                        progress: progressValue,
                    },
                });

                // Auto continue where the user left off
                if (completedModules.length > 0) {
                    setCurrentModuleIndex(completedModules.length);
                }

            } catch (err) {
                console.log("❌ LOAD ERROR:", err?.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);


    if (loading || !program)
        return (
            <View style={tw`flex-1 items-center justify-center`}>
                <Text style={{ fontFamily: "Poppins-Medium" }}>Loading course...</Text>
            </View>
        );

    const modules = program.modules || [];
    const currentModule = modules[currentModuleIndex];

    const completedList = program?.userProgress?.completedModules || [];
    const completedModuleOrders = completedList.map((m) => m.moduleOrder);

    const progress = program?.userProgress?.progress ?? 0;

    // --------------------------------------------------
    // MARK MODULE COMPLETE HANDLER
    // --------------------------------------------------
    const markModuleComplete = async () => {
        try {
            setMarkingComplete(true);

            const result = await programService.completeModule(
                program._id,
                currentModule.order
            );

            const { completedModules, progress, isCompleted } = result;

            // Update program state instantly
            setProgram((prev) => ({
                ...prev,
                userProgress: {
                    ...(prev?.userProgress || {}),
                    completedModules,
                    progress,
                },
            }));

            // 🎉 Fire confetti + show modal for module completion
            setShowModuleModal(true);
            confettiRef.current?.start();

            // If program is done → final celebration!
            if (isCompleted) {
                setTimeout(() => {
                    setShowProgramModal(true);
                    confettiProgramRef.current?.start();
                }, 500);
            }

            // Move to next module automatically
            if (!isCompleted && currentModuleIndex < modules.length - 1) {
                setCurrentModuleIndex((prev) => prev + 1);
            }
        } catch (err) {
            console.log("❌ COMPLETE ERROR:", err?.response?.data || err.message);
        } finally {
            setMarkingComplete(false);
        }
    };

    // --------------------------------------------------
    // If all modules are done
    // --------------------------------------------------
    if (!currentModule)
        return (
            <View style={tw`flex-1 items-center justify-center p-4`}>
                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 22,
                        color: "#4B5563",
                    }}
                >
                    🎉 You have completed all modules!
                </Text>

                <TouchableOpacity
                    style={tw`mt-6 bg-purple-600 px-6 py-3 rounded-xl`}
                    onPress={() => router.push(`/program/${id}`)}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 16,
                        }}
                    >
                        Back to Program
                    </Text>
                </TouchableOpacity>
            </View>
        );

    return (
        <View style={tw`flex-1 bg-white`}>

            {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}
            <Animated.View
                style={[
                    tw`px-4 py-8 bg-purple-700 flex-row items-center justify-between`,
                    {
                        paddingTop: 65,
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUp }],
                    },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>

                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 20,
                        color: "#fff",
                        textAlign: "center",
                        flex: 1,
                    }}
                >
                    {program.title}
                </Text>

                <View style={{ width: 28 }} />
            </Animated.View>

            {/* --------------------------------------------------
          VIDEO PLAYER
      -------------------------------------------------- */}
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUp }],
                }}
            >
                <View
                    style={{
                        width: "100%",
                        height: height * 0.28,
                        backgroundColor: "#000",
                        borderBottomLeftRadius: 25,
                        borderBottomRightRadius: 25,
                        overflow: "hidden",
                    }}
                >
                    <Video
                        ref={videoRef}
                        style={{ width: "100%", height: "100%" }}
                        source={{ uri: currentModule.videoUrl }}
                        useNativeControls
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>

                        {/* --------------------------------------------------
          PROGRESS BAR
      -------------------------------------------------- */}
            <View style={tw`px-6 mt-4`}>
                <Text style={{ fontFamily: "Poppins-Medium", marginBottom: 4 }}>
                    Progress: {progress}%
                </Text>

                <View style={tw`h-3 bg-gray-200 rounded-full overflow-hidden`}>
                    <View
                        style={[
                            tw`h-full bg-purple-600`,
                            { width: `${progress}%` },
                        ]}
                    />
                </View>
            </View>


            {/* --------------------------------------------------
          MODULE CONTENT
      -------------------------------------------------- */}
            <Animated.ScrollView
                style={{
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUp }],
                }}
                showsVerticalScrollIndicator={false}
            >
                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 22,
                        color: "#1F2937",
                        marginBottom: 10,
                    }}
                >
                    {currentModule.title}
                </Text>

                <Text
                    style={{
                        fontFamily: "Poppins-Regular",
                        fontSize: 15,
                        lineHeight: 22,
                        color: "#6B7280",
                    }}
                >
                    {currentModule.description}
                </Text>

                {/* --------------------------------------------------
            NAVIGATION BUTTONS
        -------------------------------------------------- */}
                <View style={tw`flex-row justify-between mt-8`}>
                    {/* PREVIOUS */}
                    <TouchableOpacity
                        disabled={currentModuleIndex === 0}
                        onPress={() => setCurrentModuleIndex((prev) => prev - 1)}
                        style={[
                            tw`px-5 py-3 rounded-xl`,
                            currentModuleIndex === 0
                                ? tw`bg-gray-300`
                                : tw`bg-gray-100 shadow-sm`,
                        ]}
                    >
                        <Text style={{ fontFamily: "Poppins-Medium", color: "#374151" }}>
                            Previous
                        </Text>
                    </TouchableOpacity>

                    {/* MARK COMPLETE */}
                    <TouchableOpacity
                        onPress={markModuleComplete}
                        disabled={markingComplete || completedModuleOrders.includes(currentModule.order)}
                        style={[
                            tw`px-6 py-3 rounded-xl shadow-md`,
                            completedModuleOrders.includes(currentModule.order)
                                ? tw`bg-green-600`
                                : tw`bg-purple-600`,
                        ]}
                    >
                        <Text
                            style={{
                                fontFamily: "Poppins-SemiBold",
                                color: "#fff",
                            }}
                        >
                            {completedModuleOrders.includes(currentModule.order)
                                ? "Completed ✓"
                                : markingComplete
                                    ? "Saving..."
                                    : "Mark Complete"}
                        </Text>
                    </TouchableOpacity>

                    {/* NEXT */}
                    <TouchableOpacity
                        disabled={currentModuleIndex === modules.length - 1}
                        onPress={() => setCurrentModuleIndex((prev) => prev + 1)}
                        style={[
                            tw`px-5 py-3 rounded-xl`,
                            currentModuleIndex === modules.length - 1
                                ? tw`bg-gray-300`
                                : tw`bg-purple-100`,
                        ]}
                    >
                        <Text style={{ fontFamily: "Poppins-Medium", color: "#6D28D9" }}>
                            Next
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* --------------------------------------------------
            MODULE OUTLINE LIST
        -------------------------------------------------- */}
                <Text
                    style={{
                        fontFamily: "Poppins-Bold",
                        fontSize: 18,
                        color: "#1F2937",
                        marginTop: 30,
                        marginBottom: 10,
                    }}
                >
                    Module Outline
                </Text>

                {modules.map((m, index) => (
                    <TouchableOpacity
                        key={m._id}
                        onPress={() => setCurrentModuleIndex(index)}
                        style={[
                            tw`p-4 rounded-xl mb-3 border flex-row items-center justify-between`,
                            index === currentModuleIndex
                                ? tw`bg-purple-100 border-purple-400`
                                : tw`bg-gray-50 border-gray-200`,
                        ]}
                    >
                        <Text
                            style={{
                                fontFamily: "Poppins-SemiBold",
                                fontSize: 15,
                                color: "#374151",
                            }}
                        >
                            {index + 1}. {m.title}
                        </Text>

                        {/* GREEN CHECK FROM BACKEND */}
                        {completedModuleOrders.includes(m.order) && (
                            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                        )}
                    </TouchableOpacity>
                ))}
            </Animated.ScrollView>

            {/* --------------------------------------------------
          MODULE COMPLETION MODAL
      -------------------------------------------------- */}
            <Modal visible={showModuleModal} transparent animationType="fade">
                <View style={tw`flex-1 items-center justify-center bg-black/50`}>
                    <View style={tw`bg-white p-8 rounded-2xl items-center w-4/5`}>
                        <Text
                            style={{
                                fontFamily: "Poppins-Bold",
                                fontSize: 22,
                                color: "#4B5563",
                            }}
                        >
                            🎉 Module Completed!
                        </Text>

                        <TouchableOpacity
                            style={tw`mt-6 bg-purple-600 px-6 py-3 rounded-xl`}
                            onPress={() => setShowModuleModal(false)}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontFamily: "Poppins-SemiBold",
                                }}
                            >
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ConfettiCannon
                    ref={confettiRef}
                    count={120}
                    origin={{ x: 200, y: -20 }}
                    fadeOut={true}
                    autoStart={false}
                />
            </Modal>

            {/* --------------------------------------------------
          PROGRAM COMPLETION MODAL (100%)
      -------------------------------------------------- */}
            <Modal visible={showProgramModal} transparent animationType="fade">
                <View style={tw`flex-1 items-center justify-center bg-black/50`}>
                    <View style={tw`bg-white p-8 rounded-2xl items-center w-4/5`}>
                        <Text
                            style={{
                                fontFamily: "Poppins-Bold",
                                fontSize: 22,
                                color: "#4B5563",
                                textAlign: "center",
                            }}
                        >
                            🏆 Congratulations!
                            You completed the entire program!
                        </Text>

                        <TouchableOpacity
                            style={tw`mt-6 bg-green-600 px-6 py-3 rounded-xl`}
                            onPress={() => {
                                setShowProgramModal(false);
                                router.push(`/program/${id}`);
                            }}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontFamily: "Poppins-SemiBold",
                                }}
                            >
                                View Certificate
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ConfettiCannon
                    ref={confettiProgramRef}
                    count={200}
                    origin={{ x: 200, y: -20 }}
                    fadeOut={true}
                    autoStart={false}
                />
            </Modal>
        </View>
    );
};

export default LearnScreen;
