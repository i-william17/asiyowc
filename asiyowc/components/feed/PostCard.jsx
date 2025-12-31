import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Video } from 'expo-av';
import * as Network from 'expo-network';
import { decode as atob } from 'base-64';
import { secureStore } from '../../services/storage';

import {
  toggleLikePost,
  fetchComments,
  addComment,
  removeComment,
  reportPost,
} from '../../store/slices/postSlice';

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (
      payload.id ||
      payload._id ||
      payload.userId ||
      payload.sub ||
      null
    );
  } catch {
    return null;
  }
};

const PostCard = ({
  post,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onReport,
  isVisible = true,
}) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [menuVisible, setMenuVisible] = useState(false);
  const [likePending, setLikePending] = useState(false);

  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isWifi, setIsWifi] = useState(false);
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const token = await secureStore.getItem("token");
      const id = getUserIdFromToken(token);
      if (alive) setMyId(id);
    })();

    return () => {
      alive = false;
    };
  }, []);


  if (!post || !post._id) {
    console.warn('PostCard received invalid post:', post);
    return null;
  }

  const isOwner = useMemo(() => {
    const authorId = post?.author?._id || post?.author?.id;
    if (!myId || !authorId) return false;
    return String(myId) === String(authorId);
  }, [myId, post?.author?._id, post?.author?.id]);

  // ===== Local UI state for Instagram-like behavior (optimistic) =====
  const [liked, setLiked] = useState(!!post.userHasLiked);

  const [likeCount, setLikeCount] = useState(
    typeof post.likesCount === 'number' ? post.likesCount : 0
  );

  const [commentCount, setCommentCount] = useState(
    typeof post.commentsCount === 'number' ? post.commentsCount : 0
  );

  // ===== Double-tap detector =====
  const lastTapRef = useRef(0);

  // ===== Snackbar =====
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => {
      setSnackbar({ visible: false, message: '', type: 'info' });
    }, 2800);
  };

  // ===== Comments modal =====
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const [commentPosting, setCommentPosting] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState(null);

  // local like-on-comment (UI only unless you later add an API)
  const [commentLikes, setCommentLikes] = useState({}); // { [commentId]: boolean }

  // ===== Report modal =====
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Keep local states in sync when feed updates post object
  useEffect(() => {
    // Only re-sync when a *different post* is rendered
    setLiked(!!post.userHasLiked);
    setLikeCount(post.likesCount || 0);
    setCommentCount(post.commentsCount || 0);
  }, [post._id]);

  // ===== Network WiFi logic =====
  useEffect(() => {
    (async () => {
      const state = await Network.getNetworkStateAsync();
      setIsWifi(state.isConnected && state.type === Network.NetworkStateType.WIFI);
    })();
  }, []);

  useEffect(() => {
    if (post.type === 'video' && isWifi && isVisible) {
      setShouldPlay(true);
    }
  }, [isWifi, isVisible, post.type]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (!isVisible) {
      videoRef.current.pauseAsync();
      setShouldPlay(false);
    }
  }, [isVisible]);

  /* =====================================================
     LIKE (Optimistic UI + Redux)
  ===================================================== */
  const performLikeToggle = async () => {
    if (likePending) return;

    setLikePending(true);
    const nextLiked = !liked;

    // Optimistic UI (single source of truth)
    setLiked(nextLiked);
    setLikeCount(prev => Math.max(prev + (nextLiked ? 1 : -1), 0));

    try {
      const res = await dispatch(toggleLikePost(post._id)).unwrap();

      if (typeof res?.liked === 'boolean') {
        setLiked(res.liked);
      }
      if (typeof res?.likesCount === 'number') {
        setLikeCount(res.likesCount);
      }
    } catch (e) {
      // rollback
      setLiked(!nextLiked);
      setLikeCount(prev => Math.max(prev + (nextLiked ? -1 : 1), 0));
    } finally {
      setLikePending(false);
    }
  };

  const handleLikePress = () => {
    performLikeToggle();
  };

  const handleDoubleTap = () => {
    if (likePending) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      performLikeToggle();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  /* =====================================================
     COMMENTS (Redux slice)
  ===================================================== */
  const openComments = async () => {
    if (!post?._id) {
      showSnackbar('Post not ready yet', 'error');
      return;
    }

    setCommentsVisible(true);
    await loadComments(true);

    if (typeof onComment === 'function') onComment(post._id);
  };


  const closeComments = () => {
    setCommentsVisible(false);
    setReplyTo(null);
    setCommentText('');
  };

  const loadComments = async (initial = false) => {
    if (!post?._id) return;
    if (commentsLoading) return;

    if (initial) setCommentsLoading(true);
    else setCommentsRefreshing(true);

    try {
      const resAction = await dispatch(
        fetchComments({ postId: post._id })
      );

      const payload = resAction?.payload;

      const list =
        payload?.data ||
        payload?.comments ||
        (Array.isArray(payload) ? payload : []);

      setComments(
        Array.isArray(list)
          ? [...list].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
          : []
      );

    } catch (e) {
      showSnackbar('Failed to load comments', 'error');
    } finally {
      setCommentsLoading(false);
      setCommentsRefreshing(false);
    }
  };

  const submitComment = async () => {
    const text = (commentText || '').trim();
    if (!text) return;

    setCommentPosting(true);
    try {
      // ✅ Use slice
      const resAction = await dispatch(
        addComment({
          postId: post._id,
          text,
          parentCommentId: replyTo?._id || null,
        })
      );

      const created = resAction?.payload?.comment;

      if (created) {
        setComments((prev) => {
          // 🔹 Top-level comment
          if (!created.parent) {
            return [created, ...prev];
          }

          // 🔹 Reply → insert after parent
          const parentIndex = prev.findIndex(
            (c) => String(c._id) === String(created.parent)
          );

          if (parentIndex === -1) {
            return [...prev, created];
          }

          const next = [...prev];
          next.splice(parentIndex + 1, 0, created);
          return next;
        });

        setCommentCount((prev) => prev);
      }

      setCommentText('');
      setReplyTo(null);
      showSnackbar('Comment posted', 'success');
    } catch (e) {
      showSnackbar('Failed to post comment', 'error');
    } finally {
      setCommentPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!post?._id || !commentId) return;

    // Prevent double delete
    if (commentDeletingId === commentId) return;

    setCommentDeletingId(commentId);

    try {
      const resAction = await dispatch(
        removeComment({
          postId: post._id,
          commentId,
        })
      );

      // Accept both { success } or empty payload
      if (resAction?.error) {
        throw new Error('Delete failed');
      }

      setReplyTo((prev) =>
        prev && String(prev._id) === String(commentId) ? null : prev
      );

      // Remove locally
      setComments((prev) =>
        prev.filter((c) => String(c._id) !== String(commentId))
      );

      setCommentCount((prev) => Math.max(prev - 1, 0));
      showSnackbar('Comment deleted', 'success');
    } catch (e) {
      console.error('Delete comment error:', e);
      showSnackbar('Failed to delete comment', 'error');
    } finally {
      setCommentDeletingId(null);
    }
  };

  const toggleLikeCommentLocal = (commentId) => {
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const isCommentOwner = (commentAuthor) => {
    if (!myId || !commentAuthor) return false;

    const authorId =
      typeof commentAuthor === 'object'
        ? commentAuthor._id || commentAuthor.id
        : commentAuthor;

    if (!authorId) return false;

    return String(myId) === String(authorId);
  };


  /* =====================================================
     REPORT (Redux slice)
  ===================================================== */
  const openReport = () => {
    setMenuVisible(false);
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
      showSnackbar("Please enter a reason", "error");
      return;
    }

    if (reportSubmitting) return; // 🚫 prevent double submit

    setReportSubmitting(true);

    try {
      // ✅ Redux is the single source of truth
      await dispatch(
        reportPost({
          postId: post._id,
          reason,
        })
      ).unwrap(); // 🔥 IMPORTANT

      showSnackbar("Report submitted", "success");
      closeReport();
    } catch (err) {
      console.error("[submitReport]", err);
      showSnackbar("Failed to submit report", "error");
    } finally {
      setReportSubmitting(false);
    }
  };

  // ===== Avatar ring for owner =====
  const avatarWrapperStyle = useMemo(() => {
    if (!isOwner) return null;

    return {
      padding: 2.5,
      borderRadius: 999,
      borderWidth: 2.5,
      borderColor: '#D4AF37', // gold
      shadowColor: '#D4AF37',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    };
  }, [isOwner]);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      {/* ================= HEADER ================= */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        {/* Avatar (owner gets gold ring) */}
        <View style={avatarWrapperStyle || undefined}>
          <Image
            source={{
              uri:
                post.author?.avatar?.url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  post.author?.fullName || 'User'
                )}`,
            }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        </View>

        {/* Name + Time */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontFamily: 'Poppins-SemiBold',
              fontSize: 15,
              color: '#111827',
            }}
            numberOfLines={1}
          >
            {post.author?.fullName || 'Unknown User'}
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Regular',
              fontSize: 12,
              color: '#6b7280',
              marginTop: 2,
            }}
          >
            {new Date(post.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Menu */}
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={{
            padding: 6,
            borderRadius: 20,
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT (double-tap like area) ================= */}
      <Pressable onPress={handleDoubleTap}>
        {post.content?.text ? (
          <Text
            style={{
              marginTop: 14,
              fontFamily: 'Poppins-Regular',
              fontSize: 15,
              lineHeight: 23,
              color: '#1f2937',
            }}
          >
            {post.content.text}
          </Text>
        ) : null}

        {/* ================= IMAGE ================= */}
        {post.type === 'image' && post.content?.imageUrl ? (
          <Image
            source={{ uri: post.content.imageUrl }}
            style={{
              width: '100%',
              height: 230,
              borderRadius: 16,
              marginTop: 14,
              backgroundColor: '#f3f4f6',
            }}
          />
        ) : null}

        {/* ================= VIDEO ================= */}
        {post.type === 'video' && post.content?.videoUrl ? (
          <View style={{ marginTop: 14 }}>
            <Video
              ref={videoRef}
              source={{ uri: post.content.videoUrl }}
              style={{
                width: '100%',
                height: 250,
                borderRadius: 16,
                backgroundColor: '#000',
              }}
              resizeMode="cover"
              isMuted={isMuted}
              shouldPlay={shouldPlay}
              useNativeControls={false}
            />

            {!shouldPlay && (
              <TouchableOpacity
                onPress={() => {
                  setShouldPlay(true);
                  showSnackbar('Playing video', 'info');
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="play-circle"
                  size={68}
                  color="rgba(255,255,255,0.9)"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsMuted(!isMuted);
                showSnackbar(isMuted ? 'Sound on' : 'Muted', 'info');
              }}
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                backgroundColor: 'rgba(0,0,0,0.65)',
                borderRadius: 22,
                padding: 9,
              }}
            >
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </Pressable>

      {/* ================= ACTIONS ================= */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={handleLikePress}
          disabled={likePending}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 30,
            opacity: likePending ? 0.6 : 1,
          }}
        >

          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#dc2626' : '#374151'}
          />
          <Text
            style={{
              marginLeft: 6,
              fontFamily: 'Poppins-Medium',
              fontSize: 14,
              color: '#374151',
            }}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openComments}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="chatbubble-outline" size={21} color="#374151" />
          <Text
            style={{
              marginLeft: 6,
              fontFamily: 'Poppins-Medium',
              fontSize: 14,
              color: '#374151',
            }}
          >
            {commentCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= MENU MODAL ================= */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable
          onPress={() => setMenuVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingVertical: 8,
            }}
          >
            {isOwner && (
              <MenuItem
                icon="create-outline"
                label="Edit Post"
                onPress={() => {
                  setMenuVisible(false);
                  onEdit && onEdit(post);
                }}
              />
            )}

            {isOwner && (
              <MenuItem
                icon="trash-outline"
                label="Delete Post"
                danger
                onPress={() => {
                  setMenuVisible(false);
                  onDelete && onDelete(post._id);
                }}
              />
            )}

            {!isOwner && (
              <MenuItem
                icon="flag-outline"
                label="Report Post"
                danger
                onPress={openReport}
              />
            )}

            <MenuItem
              icon="chatbubble-ellipses-outline"
              label="View Comments"
              onPress={() => {
                setMenuVisible(false);
                openComments();
              }}
            />

            <MenuItem
              icon="close-outline"
              label="Cancel"
              onPress={() => setMenuVisible(false)}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ================= COMMENTS MODAL ================= */}
      <Modal visible={commentsVisible} animationType="fade" transparent>
        <Pressable
          onPress={closeComments}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            style={{ width: '100%' }}
          >
            {/* Stop backdrop close */}
            <Pressable onPress={() => { }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: 520,
                  height: 620,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 30,
                  elevation: 20,
                }}
              >
                {/* ================= HEADER ================= */}
                <View
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#F5F3FF',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 14,
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#6A1B9A" />
                    </View>

                    <View>
                      <Text
                        style={{
                          fontFamily: 'Poppins-SemiBold',
                          fontSize: 18,
                          color: '#111827',
                        }}
                      >
                        Comments
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 13,
                          color: '#6B7280',
                          marginTop: 2,
                        }}
                      >
                        {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => loadComments(false)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#F9FAFB',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="refresh" size={18} color="#6A1B9A" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={closeComments}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#F9FAFB',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="close" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ================= REPLY BANNER ================= */}
                {replyTo && (
                  <View
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      backgroundColor: '#F0F9FF',
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontFamily: 'Poppins-Medium',
                          fontSize: 12,
                          color: '#0369A1',
                          marginBottom: 4,
                        }}
                      >
                        REPLYING TO
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 13,
                          color: '#0C4A6E',
                        }}
                        numberOfLines={1}
                      >
                        "{replyTo.text}"
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setReplyTo(null)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(3,105,161,0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="close" size={18} color="#0369A1" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ================= SCROLLABLE CONTENT AREA ================= */}
                <View style={{ flex: 1, minHeight: 0 }}>
                  {/* COMMENTS LIST */}
                  <View style={{ flex: 1, minHeight: 0 }}>
                    {commentsLoading ? (
                      <View
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <ActivityIndicator size="large" color="#6A1B9A" />
                        <Text
                          style={{
                            marginTop: 16,
                            fontFamily: 'Poppins-Medium',
                            color: '#6B7280',
                          }}
                        >
                          Loading comments...
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={comments}
                        keyExtractor={(item) => String(item._id)}
                        refreshing={commentsRefreshing}
                        onRefresh={() => loadComments(false)}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        style={{ flex: 1, minHeight: 0 }}
                        contentContainerStyle={{
                          flexGrow: 1,
                          paddingVertical: 12,
                        }}
                        renderItem={({ item }) => (
                          <View
                            style={{
                              paddingVertical: 14,
                              paddingLeft: item.parent ? 48 : 24,
                              paddingRight: 24,
                              borderBottomWidth: 1,
                              borderBottomColor: '#F3F4F6',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <CommentRow
                              item={item}
                              onReply={() => setReplyTo(item)}
                              onLike={() => toggleLikeCommentLocal(item._id)}
                              liked={!!commentLikes[item._id]}
                              onDelete={handleDeleteComment}
                              commentDeletingId={commentDeletingId}
                              isOwnerCheck={isCommentOwner}
                            />
                          </View>
                        )}
                        ListEmptyComponent={
                          <View
                            style={{
                              flex: 1,
                              alignItems: 'center',
                              justifyContent: 'center',
                              paddingVertical: 40,
                              backgroundColor: '#FFFFFF',
                              minHeight: 300,
                            }}
                          >
                            <Ionicons name="chatbubbles-outline" size={44} color="#9CA3AF" />
                            <Text
                              style={{
                                marginTop: 14,
                                fontFamily: 'Poppins-Medium',
                                fontSize: 16,
                                color: '#4B5563',
                              }}
                            >
                              No comments yet
                            </Text>
                            <Text
                              style={{
                                marginTop: 6,
                                fontFamily: 'Poppins-Regular',
                                fontSize: 14,
                                color: '#9CA3AF',
                                textAlign: 'center',
                                paddingHorizontal: 40,
                              }}
                            >
                              Be the first to share your thoughts
                            </Text>
                          </View>
                        }
                        // Add ItemSeparatorComponent for better scrolling
                        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                      />
                    )}
                  </View>
                </View>

                {/* ================= COMPOSER (FIXED AT BOTTOM) ================= */}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                    <View
                      style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: commentText.trim() ? '#6A1B9A' : '#E5E7EB',
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: '#F9FAFB',
                        minHeight: 52,
                        maxHeight: 100,
                      }}
                    >
                      <TextInput
                        placeholder={replyTo ? 'Write a reply…' : 'Write a comment…'}
                        placeholderTextColor="#9CA3AF"
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 15,
                          color: '#111827',
                          padding: 0,
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={submitComment}
                      disabled={commentPosting || !commentText.trim()}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor:
                          commentPosting || !commentText.trim()
                            ? '#E5E7EB'
                            : '#6A1B9A',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {commentPosting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name="send"
                          size={22}
                          color={commentText.trim() ? '#FFFFFF' : '#9CA3AF'}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ================= REPORT MODAL ================= */}
      <Modal visible={reportVisible} animationType="slide" transparent>
        <Pressable
          onPress={closeReport}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            style={{ width: '100%' }}
          >
            {/* Stop backdrop close */}
            <Pressable onPress={() => { }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: Platform.OS === 'web' ? 500 : undefined,
                  alignSelf: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 30,
                  elevation: 20,
                }}
              >
                {/* ================= HEADER ================= */}
                <View
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 22,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#FEE2E2',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 16,
                      }}
                    >
                      <Ionicons name="flag" size={20} color="#DC2626" />
                    </View>

                    <View>
                      <Text
                        style={{
                          fontFamily: 'Poppins-SemiBold',
                          fontSize: 20,
                          color: '#111827',
                          lineHeight: 28,
                        }}
                      >
                        Report Post
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 13,
                          color: '#6B7280',
                          marginTop: 2,
                        }}
                      >
                        Help us keep the community safe
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={closeReport}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#F9FAFB',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* ================= CONTENT ================= */}
                <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                  <Text
                    style={{
                      fontFamily: 'Poppins-Medium',
                      fontSize: 15,
                      color: '#374151',
                      marginBottom: 20,
                      lineHeight: 22,
                    }}
                  >
                    Please provide details about why you're reporting this post. Your
                    report will be reviewed by our moderation team.
                  </Text>

                  {/* ================= INPUT ================= */}
                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        fontFamily: 'Poppins-Medium',
                        fontSize: 14,
                        color: '#6B7280',
                        marginBottom: 12,
                        letterSpacing: 0.5,
                      }}
                    >
                      REASON FOR REPORT
                    </Text>

                    <View
                      style={{
                        borderWidth: 1.5,
                        borderColor: reportReason.trim()
                          ? '#6A1B9A'
                          : '#E5E7EB',
                        borderRadius: 16,
                        backgroundColor: '#F9FAFB',
                        paddingHorizontal: 18,
                        paddingVertical: 16,
                        minHeight: 140,
                      }}
                    >
                      <TextInput
                        placeholder="Describe the issue in detail..."
                        placeholderTextColor="#9CA3AF"
                        value={reportReason}
                        onChangeText={setReportReason}
                        multiline
                        textAlignVertical="top"
                        maxLength={500}
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 15,
                          color: '#111827',
                          lineHeight: 22,
                          minHeight: 110,
                          padding: 0,
                        }}
                      />
                    </View>

                    <Text
                      style={{
                        fontFamily: 'Poppins-Regular',
                        fontSize: 12,
                        color: '#9CA3AF',
                        textAlign: 'right',
                        marginTop: 8,
                      }}
                    >
                      {reportReason.length}/500 characters
                    </Text>

                    {/* ================= NOTICE ================= */}
                    <View
                      style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Poppins-Regular',
                          fontSize: 13,
                          color: '#6B7280',
                          lineHeight: 20,
                        }}
                      >
                        Reports are reviewed by our moderation team and typically
                        handled within{' '}
                        <Text
                          style={{
                            fontFamily: 'Poppins-SemiBold',
                            color: '#374151',
                          }}
                        >
                          24 hours
                        </Text>
                        .
                        {'\n\n'}
                        Please submit reports responsibly. Repeated false or abusive
                        reports may lead to account restrictions.
                      </Text>
                    </View>
                  </View>

                  {/* ================= ACTIONS ================= */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={closeReport}
                      style={{
                        flex: 1,
                        paddingVertical: 16,
                        borderRadius: 14,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Poppins-SemiBold',
                          fontSize: 15,
                          color: '#4B5563',
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={submitReport}
                      disabled={reportSubmitting || !reportReason.trim()}
                      style={{
                        flex: 1,
                        paddingVertical: 16,
                        borderRadius: 14,
                        backgroundColor:
                          reportSubmitting || !reportReason.trim()
                            ? '#E5E7EB'
                            : '#DC2626',
                        alignItems: 'center',
                        shadowColor: '#DC2626',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity:
                          reportSubmitting || !reportReason.trim() ? 0 : 0.2,
                        shadowRadius: 8,
                        elevation:
                          reportSubmitting || !reportReason.trim() ? 0 : 4,
                      }}
                    >
                      {reportSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text
                          style={{
                            fontFamily: 'Poppins-SemiBold',
                            fontSize: 15,
                            color: '#FFFFFF',
                          }}
                        >
                          Submit Report
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ================= SNACKBAR ================= */}
      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            backgroundColor:
              snackbar.type === 'success'
                ? '#166534'
                : snackbar.type === 'error'
                  ? '#7f1d1d'
                  : '#111827',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 13,
              fontFamily: 'Poppins-Medium',
            }}
          >
            {snackbar.message}
          </Text>
        </View>
      )}
    </View>
  );
};
/* ================= COMMENT ROW ================= */
const CommentRow = ({
  item,
  onReply,
  onLike,
  liked,
  onDelete,
  commentDeletingId,
  isOwnerCheck,
}) => {
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    setOwner(isOwnerCheck(item.author));
  }, [item.author, isOwnerCheck]);


  const author = item.author || {};
  const profile = author.profile || {};

  const avatarUrl =
    profile?.avatar?.url ||
    profile?.avatar ||
    author?.avatar?.url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile?.fullName || 'User'
    )}`;

  const createdAt = item.createdAt
    ? new Date(item.createdAt).toLocaleString()
    : '';

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 12,
      }}
    >
      {/* AVATAR */}
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#E5E7EB',
        }}
      />

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {/* NAME + TIME */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Poppins-SemiBold',
              fontSize: 13,
              color: '#111827',
              marginRight: 8,
            }}
          >
            {profile.fullName || 'Unknown User'}
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Regular',
              fontSize: 11,
              color: '#9CA3AF',
            }}
          >
            {createdAt}
          </Text>
        </View>

        {/* COMMENT TEXT */}
        <Text
          style={{
            fontFamily: 'Poppins-Regular',
            fontSize: 14,
            color: '#1F2937',
            lineHeight: 20,
          }}
        >
          {item.text}
        </Text>

        {/* ACTIONS */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {/* LIKE */}
          <TouchableOpacity
            onPress={onLike}
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={15}
              color={liked ? '#DC2626' : '#6B7280'}
            />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: 'Poppins-Medium',
                fontSize: 12,
                color: '#6B7280',
              }}
            >
              Like
            </Text>
          </TouchableOpacity>

          {/* REPLY */}
          <TouchableOpacity
            onPress={onReply}
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
          >
            <Ionicons
              name="return-up-forward-outline"
              size={15}
              color="#6B7280"
            />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: 'Poppins-Medium',
                fontSize: 12,
                color: '#6B7280',
              }}
            >
              Reply
            </Text>
          </TouchableOpacity>

          {/* DELETE (OWNER ONLY) */}
          {owner && (
            <TouchableOpacity
              onPress={() => {
                if (commentDeletingId) return;
                onDelete(item._id);
              }}
              disabled={commentDeletingId === item._id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: commentDeletingId === item._id ? 0.6 : 1,
              }}
            >
              {commentDeletingId === item._id ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
              )}
              <Text
                style={{
                  marginLeft: 6,
                  fontFamily: 'Poppins-Medium',
                  fontSize: 12,
                  color: '#DC2626',
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

/* ================= MENU ITEM ================= */
const MenuItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 22,
    }}
  >
    <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#111827'} />
    <Text
      style={{
        marginLeft: 14,
        fontFamily: 'Poppins-Medium',
        fontSize: 15,
        color: danger ? '#dc2626' : '#111827',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default PostCard;
