// (tabs)/index.js  
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
  PanResponder,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';

import { fetchFeed, deletePost } from '../../store/slices/postSlice';
import PostCard from '../../components/feed/PostCard';
import FeedFilters from '../../components/feed/FeedFilters';
import CreatePostModal from '../../components/feed/CreatePostModal';
import QuoteCard from '../../components/feed/QuoteCard';
import ShimmerLoader from '../../components/ui/ShimmerLoader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ==========================================================
   POST SKELETON LIST (SHIMMER FOR POSTS)
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

/* ==========================================================
   SWIPE INDICATOR COMPONENT
========================================================== */
const SwipeIndicator = ({ progress, isVisible }) => {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.5, 1],
  });

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.swipeIndicator,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.swipeIconContainer}>
        <Ionicons name="play" size={28} color="#FFFFFF" />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          <MaterialCommunityIcons name="play-box-multiple" size={20} color="#FFFFFF" />
          <Text style={styles.swipeText}>Reels</Text>
        </View>
      </View>
      <View style={styles.swipeArrowContainer}>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ marginLeft: -8 }} />
      </View>
    </Animated.View>
  );
};

/* ==========================================================
   LOADER COMPONENT FOR FLATLIST
========================================================== */
const FlatListLoader = ({ loading, hasMore, isRefreshing }) => {
  if (!loading || isRefreshing) return null;
  
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="small" color="#6A1B9A" />
      <Text style={styles.loaderText}>Loading more posts...</Text>
    </View>
  );
};

const FeedScreen = () => {
  const dispatch = useDispatch();
  
  // ⚠️ Your slice (from earlier) uses: loadingFeed not loading.
  // If your store really has `loading`, keep it.
  // I'll safely support both:
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
  const [loadingMore, setLoadingMore] = useState(false);
  
  // ✅ Delete confirmation modal state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  // ✅ Swipe gesture state
  const [swipeProgress] = useState(new Animated.Value(0));
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
  const [swipeActive, setSwipeActive] = useState(false);

  const hasTriggeredTopRefresh = useRef(false);
  const deleteAnim = useRef({}).current;
  const flatListRef = useRef(null);
  const swipeStartX = useRef(0);
  const lastSwipeTime = useRef(0);

  /* ==========================================================
     PAN RESPONDER FOR SWIPE GESTURE
  ========================================================== */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes from left edge
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isFromLeftEdge = evt.nativeEvent.pageX < 50; // Start from left 50px
        return isHorizontalSwipe && isFromLeftEdge;
      },
      onPanResponderGrant: (evt) => {
        swipeStartX.current = evt.nativeEvent.pageX;
        lastSwipeTime.current = Date.now();
        setSwipeActive(true);
        setShowSwipeIndicator(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        const swipeDistance = gestureState.dx;
        const normalizedProgress = Math.min(Math.max(swipeDistance / 150, 0), 1);
        
        if (swipeDistance > 0) {
          swipeProgress.setValue(normalizedProgress);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;
        const swipeDuration = Date.now() - lastSwipeTime.current;
        
        // Conditions to trigger reels screen:
        // 1. Swipe distance > 80px OR
        // 2. Fast swipe (> 0.5 velocity) OR
        // 3. Long swipe (> 150px) with normal speed
        if (
          swipeDistance > 80 || 
          (swipeVelocity > 0.5 && swipeDistance > 40) ||
          (swipeDistance > 150 && swipeDuration < 500)
        ) {
          // Animate to completion and navigate
          Animated.timing(swipeProgress, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // Navigate to reels screen
            router.push('/more/reel');
            // Reset after navigation
            setTimeout(() => {
              swipeProgress.setValue(0);
              setShowSwipeIndicator(false);
              setSwipeActive(false);
            }, 300);
          });
        } else {
          // Reset swipe animation
          Animated.timing(swipeProgress, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowSwipeIndicator(false);
            setSwipeActive(false);
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(swipeProgress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowSwipeIndicator(false);
          setSwipeActive(false);
        });
      },
    })
  ).current;

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

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing) return;
    if (!pagination?.pages) return;
    if (page >= pagination.pages) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadFeed(nextPage);
    setLoadingMore(false);
  }, [loadingMore, refreshing, pagination, page, loadFeed]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* ================= SWIPE INDICATOR ================= */}
      <SwipeIndicator progress={swipeProgress} isVisible={showSwipeIndicator} />
      
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

      {/* ================= MAIN CONTENT WITH SWIPE HANDLER ================= */}
      <View 
        style={{ flex: 1 }}
        {...panResponder.panHandlers}
      >
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
          ref={flatListRef}
          data={safeFeed}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          alwaysBounceVertical
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#6A1B9A" 
              colors={['#6A1B9A']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !loading && !refreshing && (
              <View style={{ alignItems: 'center', marginTop: 40, paddingVertical: 40 }}>
                <Ionicons name="chatbubbles-outline" size={52} color="#9ca3af" />
                <Text
                  style={{
                    marginTop: 12,
                    fontFamily: 'Poppins-Medium',
                    color: '#6b7280',
                    fontSize: 16,
                  }}
                >
                  No posts yet. Be the first to share.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={{
                    marginTop: 20,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    backgroundColor: '#6A1B9A',
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 15 }}>
                    Create First Post
                  </Text>
                </TouchableOpacity>
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
          // ✅ Custom loader for loading more
          ListFooterComponent={
            <FlatListLoader 
              loading={loadingMore} 
              hasMore={page < (pagination?.pages || 1)} 
              isRefreshing={refreshing}
            />
          }
          // Extra data to trigger re-render when loading states change
          extraData={{ loadingMore, refreshing }}
        />
      </View>

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

const styles = StyleSheet.create({
  swipeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(106, 27, 154, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 100,
  },
  swipeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  swipeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginLeft: 12,
  },
  swipeArrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loaderText: {
    marginLeft: 12,
    color: '#6A1B9A',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  swipeHint: {
    position: 'absolute',
    left: 20,
    top: 100,
    backgroundColor: 'rgba(106, 27, 154, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(106, 27, 154, 0.3)',
  },
  swipeHintText: {
    color: '#6A1B9A',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
});

export default FeedScreen;