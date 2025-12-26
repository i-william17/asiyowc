import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';

import { fetchFeed, likePost } from '../../store/slices/postSlice';
import PostCard from '../../components/feed/PostCard';
import FeedFilters from '../../components/feed/FeedFilters';
import CreatePostModal from '../../components/feed/CreatePostModal';
import QuoteCard from '../../components/feed/QuoteCard';
import ShimmerLoader from '../../components/ui/ShimmerLoader';

const FeedScreen = () => {
  const dispatch = useDispatch();
  const { feed, loading, pagination } = useSelector(state => state.posts);

  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // 🔹 Prevent infinite top-refresh triggering
  const hasTriggeredTopRefresh = useRef(false);

  useEffect(() => {
    loadFeed(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadFeed = async (pageNumber = 1) => {
    await dispatch(
      fetchFeed({
        page: pageNumber,
        limit: 10,
        type: filter !== 'all' ? filter : undefined
      })
    );
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(1);
    await loadFeed(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loading) return;
    if (!pagination?.pages) return;
    if (page >= pagination.pages) return;

    const nextPage = page + 1;
    setPage(nextPage);
    loadFeed(nextPage);
  };

  // 🔹 Scroll-to-top reload logic
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

  /* ================= POST ACTIONS ================= */

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowCreateModal(true);
  };

  const handleDeletePost = (postId) => {
    // hook delete thunk here later
    console.log('DELETE', postId);
  };

  const handleLike = (postId) => {
  dispatch(likePost(postId));
};


  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      onLike={() => handleLike(item._id)}
      onComment={() => console.log('COMMENT', item._id)}
      onEdit={handleEditPost}
      onDelete={handleDeletePost}
      onReport={(postId) => console.log('REPORT', postId)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* ================= HEADER ================= */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={26}
            color="#6A1B9A"
          />
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Poppins-Bold',
              marginLeft: 8,
              color: '#1f2937'
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
      {loading && (!feed || feed.length === 0) ? (
        <ShimmerLoader />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6A1B9A"
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={52}
                  color="#9ca3af"
                />
                <Text
                  style={{
                    marginTop: 12,
                    fontFamily: 'Poppins-Medium',
                    color: '#6b7280'
                  }}
                >
                  No posts yet. Be the first to share.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loading && feed.length > 0 ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#6A1B9A" />
              </View>
            ) : null
          }
        />
      )}

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
