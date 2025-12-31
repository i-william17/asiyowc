import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';

import { fetchFeed, deletePost } from '../../store/slices/postSlice';
import PostCard from '../../components/feed/PostCard';
import FeedFilters from '../../components/feed/FeedFilters';
import CreatePostModal from '../../components/feed/CreatePostModal';
import QuoteCard from '../../components/feed/QuoteCard';
import ShimmerLoader from '../../components/ui/ShimmerLoader';

/* ==========================================================
   POST SKELETON LIST (SHIMMER FOR POSTS)
   Uses your existing <ShimmerLoader /> as a placeholder block.
   If your ShimmerLoader already looks like a post skeleton, perfect.
   If it’s a full-screen shimmer, you can create a lighter version later.
========================================================== */
const PostSkeletonList = ({ count = 3 }) => {
  return (
    <View style={{ gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={String(i)} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <ShimmerLoader />
        </View>
      ))}
    </View>
  );
};

const FeedScreen = () => {
  const dispatch = useDispatch();

  // ⚠️ Your slice (from earlier) uses: loadingFeed not loading.
  // If your store really has `loading`, keep it.
  // I’ll safely support both:
  const postsState = useSelector((state) => state.posts);
  const feed = postsState?.feed;
  const pagination = postsState?.pagination;

  const loading =
    postsState?.loading ??
    postsState?.loadingFeed ??
    false;

  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const [deletingPostId, setDeletingPostId] = useState(null);

  // ✅ Delete confirmation modal state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const hasTriggeredTopRefresh = useRef(false);
  const deleteAnim = useRef({}).current;

  /* ==========================================================
     LOAD FEED
  ========================================================== */
  const loadFeed = useCallback(
    async (pageNumber = 1) => {
      await dispatch(
        fetchFeed({
          page: pageNumber,
          limit: 10,
          type: filter !== 'all' ? filter : undefined,
        })
      );
    },
    [dispatch, filter]
  );

  useEffect(() => {
    setPage(1);
    loadFeed(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const safeFeed = useMemo(
    () => (Array.isArray(feed) ? feed.filter((p) => p && p._id) : []),
    [feed]
  );

  /* ==========================================================
     REFRESH + PAGINATION
  ========================================================== */
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(1);
    await loadFeed(1);
    setRefreshing(false);
  }, [refreshing, loadFeed]);

  const loadMore = () => {
    if (loading) return;
    if (!pagination?.pages) return;
    if (page >= pagination.pages) return;

    const nextPage = page + 1;
    setPage(nextPage);
    loadFeed(nextPage);
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY <= 0 && !refreshing && !hasTriggeredTopRefresh.current) {
      hasTriggeredTopRefresh.current = true;
      onRefresh();
    }

    if (offsetY > 40) {
      hasTriggeredTopRefresh.current = false;
    }
  };

  /* ==========================================================
     POST ACTIONS
  ========================================================== */
  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowCreateModal(true);
  };

  // ✅ Show confirm modal instead of deleting immediately
  const requestDeletePost = (postId) => {
    setPostToDelete(postId);
    setDeleteConfirmVisible(true);
  };

  // ✅ Actual delete + animation happens here
  const confirmDeletePost = useCallback(async () => {
    if (!postToDelete) return;

    const postId = postToDelete;

    if (!deleteAnim[postId]) {
      deleteAnim[postId] = new Animated.Value(1);
    }

    setDeleteConfirmVisible(false);
    setDeletingPostId(postId);

    Animated.timing(deleteAnim[postId], {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      await dispatch(deletePost(postId));
      setDeletingPostId(null);
      setPostToDelete(null);
    });
  }, [postToDelete, deleteAnim, dispatch]);

  const renderPost = ({ item }) => {
    if (!deleteAnim[item._id]) {
      deleteAnim[item._id] = new Animated.Value(1);
    }

    return (
      <Animated.View
        style={{
          opacity: deleteAnim[item._id],
          transform: [{ scale: deleteAnim[item._id] }],
        }}
      >
        <PostCard
          post={item}
          deleting={deletingPostId === item._id}
          onComment={() => console.log('COMMENT', item._id)}
          onEdit={handleEditPost}
          onDelete={() => requestDeletePost(item._id)}
          onReport={(postId) => console.log('REPORT', postId)}
        />
      </Animated.View>
    );
  };

  /* ==========================================================
     INITIAL SHIMMER (FULLSCREEN)
  ========================================================== */
  if ((loading || refreshing) && safeFeed.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <PostSkeletonList count={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* ================= DELETE CONFIRM MODAL ================= */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <Pressable
          onPress={() => setDeleteConfirmVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Pressable onPress={() => { }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                width: '100%',
                maxWidth: 420,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 20,
              }}
            >
              {/* Icon */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FEE2E2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="trash" size={26} color="#DC2626" />
              </View>

              {/* Title */}
              <Text
                style={{
                  fontFamily: 'Poppins-SemiBold',
                  fontSize: 18,
                  color: '#111827',
                  textAlign: 'center',
                }}
              >
                Delete Post?
              </Text>

              {/* Message */}
              <Text
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 20,
                }}
              >
                This action cannot be undone. The post will be permanently removed from the feed.
              </Text>

              {/* Actions */}
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: 24,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setDeleteConfirmVisible(false);
                    setPostToDelete(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
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
                  onPress={confirmDeletePost}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: '#DC2626',
                    alignItems: 'center',
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Poppins-SemiBold',
                      fontSize: 15,
                      color: '#FFFFFF',
                    }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= HEADER ================= */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="account-group-outline" size={26} color="#6A1B9A" />
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Poppins-Bold',
              marginLeft: 8,
              color: '#1f2937',
            }}
          >
            Feed
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setEditingPost(null);
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add-circle" size={36} color="#6A1B9A" />
        </TouchableOpacity>
      </View>

      {/* ================= QUOTE ================= */}
      <View style={{ paddingHorizontal: 16 }}>
        <QuoteCard />
      </View>

      {/* ================= FILTERS ================= */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <FeedFilters active={filter} onChange={setFilter} />
      </View>

      {/* ================= FEED ================= */}
      <FlatList
        data={safeFeed}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6A1B9A" />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="chatbubbles-outline" size={52} color="#9ca3af" />
              <Text
                style={{
                  marginTop: 12,
                  fontFamily: 'Poppins-Medium',
                  color: '#6b7280',
                }}
              >
                No posts yet. Be the first to share.
              </Text>
            </View>
          )
        }
        // ✅ Shimmer while pulling new posts (keeps header/filters visible)
        ListHeaderComponent={
          refreshing && safeFeed.length > 0 ? (
            <View style={{ marginBottom: 14, marginTop: 6 }}>
              <PostSkeletonList count={2} />
            </View>
          ) : null
        }
        // ✅ Shimmer while loading more pages
        ListFooterComponent={
          loading && safeFeed.length > 0 ? (
            <View style={{ marginTop: 12, marginBottom: 18 }}>
              <PostSkeletonList count={2} />
            </View>
          ) : null
        }
      />

      {/* ================= CREATE / EDIT MODAL ================= */}
      <CreatePostModal
        visible={showCreateModal}
        editingPost={editingPost}
        onClose={() => {
          setEditingPost(null);
          setShowCreateModal(false);
        }}
        onSuccess={() => {
          setPage(1);
          loadFeed(1);
        }}
      />
    </SafeAreaView>
  );
};

export default FeedScreen;
