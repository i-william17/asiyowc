// asiyowc/app/more/reel.js

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  FlatList,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { fetchFeed } from "../../store/slices/postSlice";
import ReelItem from "../../components/reels/ReelItem";

/* =============================================================================
   CONSTANTS
============================================================================= */

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
  Dimensions.get("window");

const HEADER_HEIGHT = 90;

/* =============================================================================
   SCREEN
============================================================================= */

export default function ReelsScreen() {
  const dispatch = useDispatch();
  const { feed, loadingFeed } = useSelector((s) => s.posts);

  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const flatListRef = useRef(null);
  const currentPageRef = useRef(1);
  const loadingRef = useRef(false);

  /* =============================================================================
     DATA
  ============================================================================= */

  const videoPosts = useMemo(
    () =>
      feed.filter(
        (p) =>
          p?.content?.videoUrl &&
          p.content.videoUrl.trim() !== ""
      ),
    [feed]
  );

  /* =============================================================================
     LOADERS
  ============================================================================= */

  const loadReels = useCallback(
    async (page = 1) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (page === 1) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      try {
        await dispatch(
          fetchFeed({
            type: "video",
            limit: 10,
            page,
            sort: "newest",
          })
        );

        currentPageRef.current = page;
        setHasMore(videoPosts.length < feed.length);
      } finally {
        loadingRef.current = false;
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [dispatch, feed.length, videoPosts.length]
  );

  useFocusEffect(
    useCallback(() => {
      if (!videoPosts.length) loadReels();
    }, [])
  );

  const onRefresh = async () => {
    if (refreshing) return;
    currentPageRef.current = 1;
    await loadReels(1);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    await loadReels(currentPageRef.current + 1);
  };

  /* =============================================================================
     NAVIGATION HANDLERS
  ============================================================================= */

  const handleNextReel = useCallback(() => {
    if (activeIndex < videoPosts.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  }, [activeIndex, videoPosts.length]);

  const handlePrevReel = useCallback(() => {
    if (activeIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex - 1,
        animated: true,
      });
    }
  }, [activeIndex]);

  /* =============================================================================
     VIEWABILITY
  ============================================================================= */

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const idx = viewableItems[0].index;
      if (idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 80,
    waitForInteraction: false,
  }).current;

  /* =============================================================================
     RENDERERS
  ============================================================================= */

  const renderHeader = () => (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        paddingTop: 50,
        paddingHorizontal: 16,
        backgroundColor: "rgba(0,0,0,0.35)",
        zIndex: 50,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={{ color: "#fff", fontFamily: "Poppins-Bold", fontSize: 20 }}>
          Reels
        </Text>

        <View style={{ width: 40, height: 40 }} />
      </View>
    </View>
  );

  const renderItem = ({ item, index }) => (
    <ReelItem
      post={item}
      isActive={index === activeIndex}
      onNextReel={handleNextReel}
      onPrevReel={handlePrevReel}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={{ height: 100, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  };

  /* =============================================================================
     LOADING STATE
  ============================================================================= */

  if (loadingFeed && !videoPosts.length) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <StatusBar hidden />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: "#fff", marginTop: 16, fontFamily: "Poppins-Regular" }}>
          Loading reels…
        </Text>
      </View>
    );
  }

  /* =============================================================================
     EMPTY STATE
  ============================================================================= */

  if (!loadingFeed && videoPosts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <StatusBar hidden />
        <Ionicons name="videocam-off" size={64} color="#666" />
        <Text style={{ color: "#fff", marginTop: 16, fontFamily: "Poppins-SemiBold", fontSize: 18 }}>
          No reels yet
        </Text>
        <Text style={{ color: "#999", marginTop: 8, fontFamily: "Poppins-Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 40 }}>
          Create your first reel to get started
        </Text>
      </View>
    );
  }

  /* =============================================================================
     MAIN
  ============================================================================= */

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      <FlatList
        ref={flatListRef}
        data={videoPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={3}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      {/* Pagination dots */}
      {videoPosts.length > 1 && (
        <View style={{ position: "absolute", top: 90, left: 0, right: 0, flexDirection: "row", justifyContent: "center", zIndex: 40 }}>
          {videoPosts.map((_, i) => (
            <View
              key={i}
              style={{
                height: 4,
                marginHorizontal: 2,
                borderRadius: 2,
                backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.3)",
                width: i === activeIndex ? 32 : 16,
              }}
            />
          ))}
        </View>
      )}

      {/* Back button (alternative) */}
      <TouchableOpacity
        onPress={() => router.push('../../(tabs)/index')}
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 100,
        }}
      >
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        color: "#fff",
        fontFamily: "Poppins-Bold",
        fontSize: 20,
        zIndex: 100,
      }}>
        Reels
      </Text>
    </View>
  );
}