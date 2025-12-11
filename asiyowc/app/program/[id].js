import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchProgram,
  enrollProgram,
  leaveProgram,
  buyProgram,
  deleteProgramReview,
  deleteProgramComment,
} from "../../store/slices/programsSlice";

import { programService } from "../../services/program";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import AchievementBadge from "../../components/programs/AchievementBadge";
import tw from "../../utils/tw";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/* -----------------------------------------------
   SAFE HELPERS
----------------------------------------------- */
const getSafeUri = (value) => {
  if (typeof value === "string" && value.trim() !== "") return value;
  return "https://ui-avatars.com/api/?background=7C3AED&color=fff&name=User";
};

const getName = (profile) => {
  if (!profile) return "User";
  return profile.fullName || "User";
};

const ProgramDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const programId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const dispatch = useDispatch();

  const { program, loading } = useSelector((state) => state.programs);

  const isEnrolled = program?.isEnrolled || false;
  const userProgress = program?.userProgress?.progress || 0;
  const isCompleted = userProgress === 100;

  const hasCertificate =
    program?.userProgress?.certificateIssued === true ||
    program?.participantData?.certificateIssued === true;


  /* -----------------------------------------------
     LOCAL STATES
  ----------------------------------------------- */
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [activeReply, setActiveReply] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /* SNACKBAR */
  const [snack, setSnack] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const showSnack = (msg, type = "success") => {
    setSnack({ visible: true, message: msg, type });

    setTimeout(() => {
      setSnack({ visible: false, message: "", type });
    }, 3000);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  /* -----------------------------------------------
     LOAD PROGRAM
  ----------------------------------------------- */
  useEffect(() => {
    if (!programId) return;

    const load = async () => {
      await dispatch(fetchProgram(programId));
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    };

    load();
  }, [programId, dispatch, fadeAnim]);

  const refreshProgram = async () => {
    await dispatch(fetchProgram(programId));
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshProgram();
    } finally {
      setRefreshing(false);
    }
  };


  /* -----------------------------------------------
     ENROLL
  ----------------------------------------------- */
  const handleEnroll = async () => {
    try {
      if (!program) return;

      if (isEnrolled) {
        return router.push(`/program/learn/${program._id}`);
      }

      await dispatch(enrollProgram(program._id));
      await refreshProgram();
      showSnack("Successfully enrolled!", "success");
    } catch (e) {
      showSnack("Failed to enroll. Please try again.", "error");
    }
  };

  const handleUnenroll = async () => {
    try {
      await dispatch(leaveProgram(program._id));
      await refreshProgram();
      showSnack("You have left the program.", "success");
    } catch (e) {
      showSnack("Failed to unenroll.", "error");
    }
  };

  const handleBuyProgram = async () => {
    try {
      const res = await programService.buyProgram(program._id);

      if (res.success) {
        showSnack("Waiting for M-Pesa confirmation…", "success");
        return;
      }
      showSnack("Failed to initiate payment", "error");
    } catch (err) {
      showSnack("Payment error", "error");
    }
  };


  /* -----------------------------------------------
     REVIEWS
  ----------------------------------------------- */
  const submitReview = async () => {
    try {
      await programService.addReview(program._id, { rating, reviewText });
      setShowReviewModal(false);
      setRating(0);
      setReviewText("");
      await refreshProgram();
      showSnack("Your review has been submitted!", "success");
    } catch (e) {
      showSnack("Failed to submit review.", "error");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await dispatch(
        deleteProgramReview({ programId: program._id, reviewId })
      ).unwrap();
      showSnack("Review deleted.", "success");
      await refreshProgram();
    } catch (e) {
      showSnack("Failed to delete review.", "error");
    }
  };

  /* -----------------------------------------------
     COMMENTS
  ----------------------------------------------- */
  const submitComment = async () => {
    try {
      await programService.addComment(program._id, {
        text: commentText,
        parent: null,
      });
      setCommentText("");
      await refreshProgram();
      showSnack("Comment posted!", "success");
    } catch (e) {
      showSnack("Failed to post comment.", "error");
    }
  };

  const submitReply = async (parentId) => {
    try {
      await programService.addComment(program._id, {
        text: replyText,
        parent: parentId,
      });
      setReplyText("");
      setActiveReply(null);
      await refreshProgram();
      showSnack("Reply posted!", "success");
    } catch (e) {
      showSnack("Failed to post reply.", "error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await dispatch(
        deleteProgramComment({ programId: program._id, commentId })
      ).unwrap();
      showSnack("Comment deleted.", "success");
      await refreshProgram();
    } catch (e) {
      showSnack("Failed to delete comment.", "error");
    }
  };

  /* -----------------------------------------------
     LOADING / FAILURE HANDLER
  ----------------------------------------------- */
  if (loading && !program) return <ShimmerLoader />;

  if (!program) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text style={{ fontFamily: "Poppins-Medium", color: "red" }}>
          Failed to load program.
        </Text>
      </View>
    );
  }

  /* -----------------------------------------------
     UI VALUES + STATS
  ----------------------------------------------- */
  const duration =
    program?.duration?.value && program?.duration?.unit
      ? `${program.duration.value} ${program.duration.unit}`
      : "Duration unavailable";

  const priceLabel =
    program?.price?.amount > 0 ? `KES ${program.price.amount}` : "Free Program";

  const translateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -90],
    extrapolate: "clamp",
  });

  const scale = scrollY.interpolate({
    inputRange: [-200, 0],
    outputRange: [1.35, 1],
    extrapolate: "clamp",
  });

  const topLevelComments = program.comments?.filter((c) => !c.parent) || [];
  const replies = program.comments?.filter((c) => c.parent) || [];
  const getReplies = (id) => replies.filter((r) => r.parent === id);

  // ----- Rating & Discussion Stats -----
  const totalReviews = program.reviews?.length || 0;
  const totalComments = program.comments?.length || 0;

  const totalRating = totalReviews
    ? program.reviews.reduce(
      (sum, r) => sum + (typeof r.rating === "number" ? r.rating : 0),
      0
    )
    : 0;

  const averageRating = totalReviews ? totalRating / totalReviews : 0;

  /* ---------------------------------------------------------
      REUSABLE OVERVIEW ITEM
----------------------------------------------------------- */
  const OverviewItem = ({ label, value, icon }) => (
    <View style={tw`flex-row items-center mb-3`}>
      <Ionicons name={icon} size={20} color="#7C3AED" />
      <Text
        style={{
          fontFamily: "Poppins-Medium",
          marginLeft: 10,
          fontSize: 14,
          color: "#374151",
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          fontFamily: "Poppins-Regular",
          marginLeft: 6,
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        {value || "—"}
      </Text>
    </View>
  );


  /* -----------------------------------------------
     RENDER
  ----------------------------------------------- */
  return (
    <View style={tw`flex-1 bg-white`}>
      {/* HEADER IMAGE */}
      <Animated.View
        style={{
          height: SCREEN_HEIGHT * 0.34,
          overflow: "hidden",
          transform: [{ translateY }],
        }}
      >
        <Animated.Image
          source={{ uri: getSafeUri(program?.image) }}
          style={{ width: "100%", height: "100%", transform: [{ scale }] }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={tw`absolute top-12 left-4 bg-black/40 rounded-full p-3`}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {/* CONTENT */}
      <Animated.ScrollView
        style={{ opacity: fadeAnim, marginTop: -25 }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
            colors={["#7C3AED"]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >


        {/* MAIN DETAILS */}
        <View style={tw`p-6 bg-white rounded-t-3xl`}>
          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 26 }}>
            {program.title}
          </Text>

          <Text
            style={{
              fontFamily: "Poppins-Medium",
              color: "#9333EA",
              marginTop: 6,
            }}
          >
            {program.category} • {duration}
          </Text>

          {/* BADGES */}
          <View style={tw`mt-4 flex-row flex-wrap`}>
            <AchievementBadge
              label={priceLabel}
              type={program.price.amount > 0 ? "paid" : "free"}
              size="sm"
            />
            {program.featured && (
              <AchievementBadge label="Featured" type="gold" size="sm" />
            )}
            {isCompleted && (
              <AchievementBadge label="Completed" type="completed" size="sm" />
            )}
          </View>

          {/* ⭐ SUMMARY BELOW TAGS */}
          <View style={tw`mt-3`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 14,
                color: "#111827",
              }}
            >
              ⭐ {averageRating.toFixed(1)} / 5
            </Text>
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 12,
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              {totalReviews} review{totalReviews !== 1 ? "s" : ""} •{" "}
              {totalComments} comment{totalComments !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* DESCRIPTION */}
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              marginTop: 12,
              color: "#4B5563",
            }}
          >
            {program.shortDescription ||
              (program.description
                ? program.description.slice(0, 500) + "..."
                : "")}
          </Text>

          {/* ENROLL BUTTON — ONLY FOR FREE PROGRAMS */}
          {program.price.amount === 0 && !isCompleted && !hasCertificate && (
            <TouchableOpacity
              onPress={handleEnroll}
              style={tw`mt-6 bg-purple-600 p-4 rounded-2xl flex-row justify-center`}
            >
              <Ionicons name="school" size={22} color="#fff" />
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  marginLeft: 8,
                  color: "#fff",
                }}
              >
                {isEnrolled ? "Continue Program" : "Enroll Now"}
              </Text>
            </TouchableOpacity>
          )}



          {/* BUY BUTTON */}
          {/* BUY BUTTON — ONLY FOR PAID PROGRAMS */}
          {program.price.amount > 0 && !isEnrolled && !hasCertificate && (
            <TouchableOpacity
              onPress={handleBuyProgram}
              style={tw`bg-green-700 p-4 mt-4 rounded-2xl`}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                Buy Program (M-Pesa)
              </Text>
            </TouchableOpacity>
          )}



          {/* UNENROLL BUTTON */}
          {isEnrolled && !isCompleted && (
            <TouchableOpacity
              onPress={handleUnenroll}
              style={tw`mt-3 bg-red-500 p-4 rounded-2xl flex-row justify-center`}
            >
              <Ionicons name="close-circle" size={22} color="#fff" />
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  marginLeft: 8,
                  color: "#fff",
                }}
              >
                Unenroll
              </Text>
            </TouchableOpacity>
          )}


          {/* CERTIFICATE BUTTON */}
          {hasCertificate && (
            <View style={tw`mt-4`}>
              {/* VIEW CERTIFICATE */}
              <TouchableOpacity
                onPress={() => router.push(`/program/certificate/${program._id}`)}
                style={tw`bg-green-600 p-3 rounded-xl mb-3`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                    color: "white",
                  }}
                >
                  View Certificate 🎓
                </Text>
              </TouchableOpacity>

              {/* CONTINUE PROGRAM */}
              {isEnrolled && (
                <TouchableOpacity
                  onPress={() => router.push(`/program/learn/${program._id}`)}
                  style={tw`bg-purple-600 p-3 rounded-xl`}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      textAlign: "center",
                      color: "white",
                    }}
                  >
                    Continue Program
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}



          {/* PROGRESS BAR */}
          {isEnrolled && !isCompleted && (
            <View style={tw`mt-4`}>
              <View style={tw`h-2 bg-gray-200 rounded-full`}>
                <View
                  style={{
                    width: `${userProgress}%`,
                    height: "100%",
                    backgroundColor: "#7C3AED",
                    borderRadius: 10,
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                {Math.round(userProgress)}% completed
              </Text>
            </View>
          )}
        </View>

        {/* ABOUT */}
        <View style={tw`px-6 pb-12`}>
          <Text
            style={{ fontFamily: "Poppins-Bold", fontSize: 18 }}
          >
            About this Program
          </Text>

          <Text
            style={{
              fontFamily: "Poppins-Regular",
              marginTop: 10,
              color: "#111827",
            }}
          >
            {program.description}
          </Text>
        </View>

        {/* OVERVIEW SECTION */}
        <View style={tw`px-6 py-4`}>
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 20,
              marginBottom: 10,
              color: "#111827",
            }}
          >
            Course Overview
          </Text>

          <View style={tw`bg-gray-50 p-4 rounded-2xl border border-gray-100`}>
            <OverviewItem
              label="Category"
              value={program?.category}
              icon="layers"
            />
            <OverviewItem
              label="Difficulty"
              value={program?.difficulty}
              icon="barbell"
            />
            <OverviewItem
              label="Modules"
              value={`${program?.modules?.length || 0} modules`}
              icon="reader"
            />
            <OverviewItem label="Duration" value={duration} icon="time" />
            <OverviewItem
              label="Start Date"
              value={program?.startDate?.split("T")[0]}
              icon="calendar"
            />
            <OverviewItem
              label="End Date"
              value={program?.endDate?.split("T")[0]}
              icon="calendar-outline"
            />
            <OverviewItem
              label="Language"
              value={program?.metadata?.languages?.join(", ") || "English"}
              icon="chatbubbles"
            />
            <OverviewItem
              label="Certificate"
              value={"Yes"}
              icon="ribbon"
            />
            <OverviewItem
              label="Enrolled Learners"
              value={program?.participants?.length || 0}
              icon="people"
            />
          </View>
        </View>

        {/* WHAT YOU’LL LEARN */}
        {program?.learningOutcomes?.length > 0 && (
          <View style={tw`px-6 py-6`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 18,
                marginBottom: 10,
                color: "#1F2937",
              }}
            >
              What You’ll Learn
            </Text>

            {program.learningOutcomes.map((item, idx) => (
              <View key={idx} style={tw`flex-row items-start mb-2`}>
                <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 14,
                    color: "#4B5563",
                    marginLeft: 8,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* REQUIREMENTS */}
        {program?.requirements?.length > 0 && (
          <View style={tw`px-6 py-6`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 18,
                marginBottom: 10,
                color: "#1F2937",
              }}
            >
              Requirements
            </Text>

            {program.requirements.map((req, idx) => (
              <View key={idx} style={tw`flex-row items-start mb-2`}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 14,
                    color: "#4B5563",
                    marginLeft: 8,
                  }}
                >
                  {typeof req === "string"
                    ? req
                    : req?.title || req?.description || JSON.stringify(req)}
                </Text>
              </View>
            ))}
          </View>
        )}


        {/* MODULE LIST */}
        <View style={tw`px-6 py-6`}>
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 18,
              marginBottom: 12,
              color: "#1F2937",
            }}
          >
            Program Modules
          </Text>

          {program?.modules?.map((mod, idx) => (
            <View
              key={idx}
              style={tw`bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100`}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Poppins-Medium",
                  color: "#111827",
                }}
              >
                {mod.title}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontFamily: "Poppins-Regular",
                  color: "#6B7280",
                }}
              >
                {mod.description}
              </Text>
            </View>
          ))}
        </View>

        {/* REVIEWS */}
        <View style={tw`px-6 py-6`}>
          <Text
            style={{ fontFamily: "Poppins-Bold", fontSize: 18 }}
          >
            Student Reviews
          </Text>

          {isEnrolled && (
            <TouchableOpacity
              onPress={() => setShowReviewModal(true)}
              style={tw`bg-purple-600 p-3 rounded-xl w-40 mt-3`}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                Write a Review
              </Text>
            </TouchableOpacity>
          )}

          {program.reviews?.length > 0 ? (
            program.reviews.map((rev) => (
              <View
                key={rev._id}
                style={tw`mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200`}
              >
                <View style={tw`flex-row items-center`}>
                  <Image
                    source={{ uri: getSafeUri(rev?.user?.profile?.avatar?.url) }}
                    style={tw`w-10 h-10 rounded-full`}
                  />
                  <View style={tw`ml-3 flex-1`}>
                    <Text
                      style={{
                        fontFamily: "Poppins-SemiBold",
                        color: "#111827",
                      }}
                    >
                      {getName(rev?.user?.profile)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins-Regular",
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* DELETE ICON */}
                  <TouchableOpacity
                    onPress={() => handleDeleteReview(rev._id)}
                    style={tw`absolute top-3 right-3`}
                  >
                    <Ionicons name="trash" size={18} color="red" />
                  </TouchableOpacity>
                </View>

                <View style={tw`flex-row mt-2`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < rev.rating ? "star" : "star-outline"}
                      size={18}
                      color="#FACC15"
                    />
                  ))}
                </View>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    marginTop: 6,
                    color: "#374151",
                  }}
                >
                  {rev.reviewText}
                </Text>
              </View>
            ))
          ) : (
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                color: "#6B7280",
                marginTop: 10,
              }}
            >
              No reviews yet.
            </Text>
          )}
        </View>

        {/* COMMENTS */}
        <View style={tw`px-6 pb-32`}>
          <Text
            style={{ fontFamily: "Poppins-Bold", fontSize: 18 }}
          >
            Discussion Forum
          </Text>

          <TextInput
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            style={tw`border border-gray-300 rounded-xl p-3 mt-4`}
          />

          <TouchableOpacity
            onPress={submitComment}
            style={tw`bg-purple-600 rounded-xl p-3 items-center mt-2`}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                color: "#fff",
              }}
            >
              Post Comment
            </Text>
          </TouchableOpacity>

          {/* Comment List */}
          {topLevelComments.map((c) => (
            <View key={c._id} style={tw`mt-6`}>
              <View style={tw`flex-row`}>
                <Image
                  source={{ uri: getSafeUri(c?.user?.profile?.avatar?.url) }}
                  style={tw`w-9 h-9 rounded-full`}
                />

                <View style={tw`ml-3 flex-1`}>
                  <View style={tw`flex-row justify-between`}>
                    <Text
                      style={{
                        fontFamily: "Poppins-SemiBold",
                        color: "#111827",
                      }}
                    >
                      {getName(c?.user?.profile)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleDeleteComment(c._id)}
                      style={tw`absolute top-3 right-3`}
                    >
                      <Ionicons name="trash" size={16} color="red" />
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      fontFamily: "Poppins-Regular",
                      color: "#374151",
                      marginTop: 4,
                    }}
                  >
                    {c.text}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setActiveReply(c._id)}
                    style={tw`mt-2`}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        color: "#7C3AED",
                      }}
                    >
                      Reply
                    </Text>
                  </TouchableOpacity>

                  {/* REPLY BOX */}
                  {activeReply === c._id && (
                    <View style={tw`mt-2`}>
                      <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write a reply..."
                        style={tw`border border-gray-300 rounded-xl p-2`}
                      />

                      <TouchableOpacity
                        onPress={() => submitReply(c._id)}
                        style={tw`bg-purple-600 rounded-xl p-2 items-center mt-2`}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins-SemiBold",
                            color: "#fff",
                          }}
                        >
                          Post Reply
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Replies */}
                  {getReplies(c._id).map((r) => (
                    <View key={r._id} style={tw`mt-3 ml-8`}>
                      <View style={tw`flex-row justify-between`}>
                        <View style={tw`flex-row flex-1`}>
                          <Image
                            source={{
                              uri: getSafeUri(r?.user?.profile?.avatar),
                            }}
                            style={tw`w-8 h-8 rounded-full`}
                          />

                          <View style={tw`ml-2 flex-1`}>
                            <Text
                              style={{
                                fontFamily: "Poppins-SemiBold",
                                color: "#111827",
                              }}
                            >
                              {getName(r?.user?.profile)}
                            </Text>
                            <Text
                              style={{
                                fontFamily: "Poppins-Regular",
                                marginTop: 4,
                                color: "#374151",
                              }}
                            >
                              {r.text}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleDeleteComment(r._id)}
                        >
                          <Ionicons name="trash" size={16} color="red" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <View
          style={tw`absolute inset-0 bg-black/40 justify-center items-center px-6`}
        >
          <View style={tw`bg-white w-full p-6 rounded-3xl`}>
            <Text
              style={{ fontFamily: "Poppins-Bold", fontSize: 20 }}
            >
              Write a Review
            </Text>

            <View style={tw`flex-row mt-4`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setRating(i + 1)}>
                  <Ionicons
                    name={i < rating ? "star" : "star-outline"}
                    size={30}
                    color="#FACC15"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Share your experience..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              style={tw`border border-gray-300 rounded-xl p-3 h-28 mt-4`}
            />

            <View style={tw`flex-row justify-between mt-4`}>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={tw`px-4 py-3 bg-gray-200 rounded-xl`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: "#111827",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitReview}
                style={tw`px-4 py-3 bg-purple-600 rounded-xl`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    color: "#fff",
                  }}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* SNACKBAR */}
      {snack.visible && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            alignSelf: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 20,
            backgroundColor: snack.type === "success" ? "#16A34A" : "#DC2626",
          }}
        >
          <Text
            style={{
              color: "white",
              fontFamily: "Poppins-SemiBold",
            }}
          >
            {snack.message}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ProgramDetailsScreen;
