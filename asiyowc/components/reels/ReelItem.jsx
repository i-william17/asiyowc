// asiyowc/components/reels/ReelItem.jsx

import React, { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import {
  View,
  Text,
  Dimensions,
  Pressable,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";

import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { 
  toggleLikePost, 
  fetchComments, 
  addComment, 
  removeComment,
  reportPost 
} from "../../store/slices/postSlice";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
  Dimensions.get("window");

/* ================= UTIL ================= */

const timeAgo = (date) => {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

/* ================= COMMENT ROW COMPONENT ================= */
const CommentRow = ({ item, onReply, onDelete, commentDeletingId, isOwnerCheck }) => {
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    setOwner(isOwnerCheck(item.author));
  }, [item.author, isOwnerCheck]);

  const author = item.author || {};
  const profile = author.profile || {};
  
  const avatarUrl = profile?.avatar?.url || 
                    profile?.avatar || 
                    author?.avatar?.url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      profile?.fullName || 'User'
                    )}`;
  
  const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';

  return (
    <View style={styles.commentContainer}>
      <Image
        source={{ uri: avatarUrl }}
        style={styles.commentAvatar}
      />
      
      <View style={{ flex: 1 }}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentName}>
            {profile.fullName || 'Unknown User'}
          </Text>
          <Text style={styles.commentTime}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.commentText}>
          {item.text}
        </Text>
        
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={onReply}
            style={styles.commentActionButton}
          >
            <Ionicons name="return-up-forward-outline" size={15} color="#6B7280" />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
          
          {owner && (
            <TouchableOpacity
              onPress={() => onDelete(item._id)}
              disabled={commentDeletingId === item._id}
              style={styles.commentActionButton}
            >
              {commentDeletingId === item._id ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
              )}
              <Text style={[styles.commentActionText, { color: '#DC2626' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

/* ================= MAIN COMPONENT ================= */

export const ReelItem = ({ post, isActive }) => {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  
  // Video states
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  
  // Like animation
  const lastTap = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  
  // Comment modal states
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState(null);
  
  // Report modal states
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  
  // Local UI states (optimistic updates)
  const [liked, setLiked] = useState(!!post?.userHasLiked);
  const [likeCount, setLikeCount] = useState(post?.likesCount || 0);
  const [commentCount, setCommentCount] = useState(post?.commentsCount || 0);
  
  // User info
  const { user } = useSelector((state) => state.auth);
  const isOwner = useMemo(() => {
    const authorId = post?.author?._id || post?.author?.id;
    const userId = user?._id || user?.id;
    return authorId && userId && String(authorId) === String(userId);
  }, [user, post?.author]);

  /* ===== ACTIVE STATE ===== */
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  /* ===== HEART ANIMATION ===== */
  const animateHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* ===== LIKE FUNCTIONALITY ===== */
  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    
    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => Math.max(prev + (newLiked ? 1 : -1), 0));
    
    try {
      const result = await dispatch(toggleLikePost(post._id)).unwrap();
      
      if (typeof result?.liked === 'boolean') {
        setLiked(result.liked);
      }
      if (typeof result?.likesCount === 'number') {
        setLikeCount(result.likesCount);
      }
      
      if (newLiked) {
        animateHeart();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Rollback on error
      setLiked(!newLiked);
      setLikeCount(prev => Math.max(prev + (newLiked ? -1 : 1), 0));
    } finally {
      setLiking(false);
    }
  };

  /* ===== TAP HANDLERS ===== */
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleLike();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => setMuted((m) => !m), 250);
    }
  };

  /* ===== COMMENTS FUNCTIONS ===== */
  const openComments = async () => {
    setCommentsVisible(true);
    await loadComments();
  };

  const closeComments = () => {
    setCommentsVisible(false);
    setReplyTo(null);
    setCommentText('');
  };

  const loadComments = async () => {
    if (!post?._id || commentsLoading) return;
    
    setCommentsLoading(true);
    try {
      const resAction = await dispatch(fetchComments({ postId: post._id }));
      const payload = resAction?.payload;
      const list = payload?.data || payload?.comments || [];
      
      setComments(
        Array.isArray(list)
          ? [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : []
      );
    } catch (error) {
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    const text = (commentText || '').trim();
    if (!text) return;
    
    setCommentPosting(true);
    try {
      const resAction = await dispatch(
        addComment({
          postId: post._id,
          text,
          parentCommentId: replyTo?._id || null,
        })
      );
      
      const created = resAction?.payload?.comment;
      if (created) {
        setComments(prev => {
          if (!created.parent) {
            return [created, ...prev];
          }
          
          const parentIndex = prev.findIndex(
            c => String(c._id) === String(created.parent)
          );
          
          if (parentIndex === -1) return [...prev, created];
          
          const next = [...prev];
          next.splice(parentIndex + 1, 0, created);
          return next;
        });
        
        setCommentCount(prev => prev + 1);
      }
      
      setCommentText('');
      setReplyTo(null);
    } catch (error) {
      Alert.alert("Error", "Failed to post comment");
    } finally {
      setCommentPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!post?._id || !commentId || commentDeletingId === commentId) return;
    
    setCommentDeletingId(commentId);
    try {
      await dispatch(removeComment({ postId: post._id, commentId }));
      setComments(prev => prev.filter(c => String(c._id) !== String(commentId)));
      setCommentCount(prev => Math.max(prev - 1, 0));
      setReplyTo(prev => prev && String(prev._id) === String(commentId) ? null : prev);
    } catch (error) {
      Alert.alert("Error", "Failed to delete comment");
    } finally {
      setCommentDeletingId(null);
    }
  };

  const isCommentOwner = (commentAuthor) => {
    const userId = user?._id || user?.id;
    if (!userId || !commentAuthor) return false;
    
    const authorId = typeof commentAuthor === 'object' 
      ? commentAuthor._id || commentAuthor.id 
      : commentAuthor;
    
    return authorId && String(userId) === String(authorId);
  };

  /* ===== REPORT FUNCTIONS ===== */
  const openReport = () => {
    setReportVisible(true);
    setReportReason('');
  };

  const closeReport = () => {
    setReportVisible(false);
    setReportReason('');
  };

  const submitReport = async () => {
    const reason = (reportReason || "").trim();
    if (!reason) {
      Alert.alert("Error", "Please enter a reason");
      return;
    }
    
    if (reportSubmitting) return;
    
    setReportSubmitting(true);
    try {
      await dispatch(reportPost({ postId: post._id, reason })).unwrap();
      Alert.alert("Success", "Report submitted successfully");
      closeReport();
    } catch (error) {
      Alert.alert("Error", "Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  /* ===== DATA ===== */
  const avatar =
    post?.author?.profile?.avatar?.url ||
    post?.author?.avatar?.url ||
    null;

  const fullName =
    post?.author?.profile?.fullName ||
    post?.author?.fullName ||
    "Unknown";

  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      {/* VIDEO */}
      <Pressable
        onPress={handleTap}
        onLongPress={() => setPaused(true)}
        onPressOut={() => isActive && setPaused(false)}
        style={StyleSheet.absoluteFill}
      >
        <Video
          ref={videoRef}
          source={{ uri: post?.content?.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !paused}
          isLooping
          isMuted={muted}
          volume={1.0}
          onLoad={() => setLoading(false)}
          onError={() => Alert.alert("Video error")}
        />

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loaderText}>Loading…</Text>
          </View>
        )}

        {/* MUTE ICON */}
        <View style={styles.muteIcon}>
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={22}
            color="#fff"
          />
        </View>

        {/* PAUSE OVERLAY */}
        {paused && isActive && (
          <View style={styles.pauseOverlay}>
            <Ionicons name="pause" size={72} color="#ffffffcc" />
          </View>
        )}
      </Pressable>

      {/* HEART ANIMATION */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heart,
          {
            opacity: heartOpacity,
            transform: [{ scale: heartScale }],
          },
        ]}
      >
        <Ionicons name="heart" size={140} color="#EF4444" />
      </Animated.View>

      {/* USER STRIP */}
      <View style={styles.userStrip}>
        <Image
          source={
            avatar
              ? { uri: avatar }
              : require("../../assets/images/image-placeholder.png")
          }
          style={styles.avatar}
        />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.time}>{timeAgo(post?.createdAt)}</Text>
        </View>
      </View>

      {/* RIGHT SIDE ACTIONS */}
      <View style={styles.actionsContainer}>
        {/* LIKE */}
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
          disabled={liking}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={36}
            color={liked ? "#EF4444" : "#fff"}
          />
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>
        
        {/* COMMENTS */}
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={openComments}
        >
          <Ionicons name="chatbubble-outline" size={32} color="#fff" />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </TouchableOpacity>
        
        {/* SHARE */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="paper-plane-outline" size={32} color="#fff" />
          <Text style={styles.actionCount}>Share</Text>
        </TouchableOpacity>
        
        {/* REPORT */}
        {!isOwner && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={openReport}
          >
            <Ionicons name="flag-outline" size={28} color="#fff" />
            <Text style={styles.actionCount}>Report</Text>
          </TouchableOpacity>
        )}
        
        {/* MENU */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="ellipsis-vertical" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* COMMENTS MODAL */}
      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.commentsModal}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comments</Text>
                <TouchableOpacity onPress={closeComments}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {/* REPLY BANNER */}
              {replyTo && (
                <View style={styles.replyBanner}>
                  <Text style={styles.replyText}>
                    Replying to: {replyTo.text}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* COMMENTS LIST */}
              <View style={styles.commentsListContainer}>
                {commentsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                ) : (
                  <FlatList
                    data={comments}
                    keyExtractor={(item) => String(item._id)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.commentsListContent}
                    renderItem={({ item }) => (
                      <CommentRow
                        item={item}
                        onReply={() => setReplyTo(item)}
                        onDelete={handleDeleteComment}
                        commentDeletingId={commentDeletingId}
                        isOwnerCheck={isCommentOwner}
                      />
                    )}
                    ListEmptyComponent={
                      <View style={styles.emptyComments}>
                        <Ionicons name="chatbubbles-outline" size={44} color="#9CA3AF" />
                        <Text style={styles.emptyCommentsText}>
                          No comments yet
                        </Text>
                      </View>
                    }
                  />
                )}
              </View>
              
              {/* COMMENT INPUT */}
              <View style={styles.commentInputContainer}>
                <TextInput
                  placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                  placeholderTextColor="#9CA3AF"
                  value={commentText}
                  onChangeText={setCommentText}
                  style={styles.commentInput}
                  multiline
                />
                <TouchableOpacity
                  onPress={submitComment}
                  disabled={commentPosting || !commentText.trim()}
                  style={[
                    styles.commentSubmit,
                    (!commentText.trim() || commentPosting) && styles.commentSubmitDisabled
                  ]}
                >
                  {commentPosting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* REPORT MODAL */}
      <Modal
        visible={reportVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.reportModal}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Post</Text>
                <TouchableOpacity onPress={closeReport}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {/* CONTENT */}
              <View style={styles.reportContent}>
                <Text style={styles.reportDescription}>
                  Please tell us why you're reporting this post. Your report is anonymous.
                </Text>
                
                <TextInput
                  placeholder="Enter your reason..."
                  placeholderTextColor="#9CA3AF"
                  value={reportReason}
                  onChangeText={setReportReason}
                  style={styles.reportInput}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
                
                <Text style={styles.charCount}>
                  {reportReason.length}/500 characters
                </Text>
              </View>
              
              {/* ACTIONS */}
              <View style={styles.reportActions}>
                <TouchableOpacity
                  onPress={closeReport}
                  style={styles.reportButtonSecondary}
                >
                  <Text style={styles.reportButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={submitReport}
                  disabled={reportSubmitting || !reportReason.trim()}
                  style={[
                    styles.reportButtonPrimary,
                    (!reportReason.trim() || reportSubmitting) && styles.reportButtonDisabled
                  ]}
                >
                  {reportSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.reportButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: "#000",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#fff",
    marginTop: 12,
    fontFamily: "Poppins-Regular",
  },
  muteIcon: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 10,
    borderRadius: 30,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  heart: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -70 }, { translateY: -70 }],
  },
  userStrip: {
    position: "absolute",
    bottom: 24,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1f2937",
  },
  name: {
    color: "#fff",
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  time: {
    color: "#9CA3AF",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  actionsContainer: {
    position: "absolute",
    right: 16,
    bottom: 100,
    alignItems: "center",
    gap: 24,
  },
  actionButton: {
    alignItems: "center",
    marginBottom: 8,
  },
  actionCount: {
    color: "#fff",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    marginTop: 4,
  },
  
  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  keyboardView: {
    flex: 1,
  },
  commentsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  reportModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    marginTop: Platform.OS === 'ios' ? 44 : 0,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  replyText: {
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  commentsListContainer: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyCommentsText: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    maxHeight: 100,
  },
  commentSubmit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  commentSubmitDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
  },
  reportContent: {
    flex: 1,
    paddingTop: 20,
  },
  reportDescription: {
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  reportInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
  },
  reportButtonPrimary: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reportButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reportButtonDisabled: {
    backgroundColor: 'rgba(220, 38, 38, 0.5)',
  },
  reportButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  
  // COMMENT ROW STYLES
  commentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1f2937',
    marginRight: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentName: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginRight: 8,
  },
  commentTime: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    marginLeft: 6,
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
});

export default memo(ReelItem);