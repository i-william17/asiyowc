import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { decode as atob } from "base-64";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from "expo-network";
import { REACTION_CATEGORIES } from "../../constants/reactions";
import { connectSocket } from "../../services/socket";

import tw from "../../utils/tw";
import {
  fetchHubDetail,
  fetchHubUpdates,
  createHubUpdate,
  joinHub,
  leaveHub,
  addHubUpdate,
  removeHubUpdate,
  deleteHub,
  updateHubUpdateReactions,
  reactHubUpdate,
  reportContent,
} from "../../store/slices/communitySlice";

import LoadingBlock from "./LoadingBlock";
import EmptyState from "./EmptyState";

/* =====================================================
   CONSTANTS
===================================================== */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_TEXT_LENGTH = 150; // For show more/less
const MAX_MEDIA_WIDTH = Platform.OS === "web" ? 420 : Dimensions.get("window").width * 0.75;
const isWeb = Platform.OS === "web";

// ✅ Fixed grid width calculation: 7 columns × 44px + 6 gaps × 6px = 344px
const EMOJI_GRID_WIDTH = 344;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const REACTION_SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

/* =====================================================
   JWT HELPERS
===================================================== */
const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.id || payload._id || payload.userId || "");
  } catch {
    return null;
  }
};

/* =====================================================
   DATE HELPERS - Same as GroupChatInterface
===================================================== */
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   CUSTOM ALERT COMPONENT
===================================================== */
const CustomAlert = ({ visible, title, message, type = "info", onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const getIconConfig = () => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: "#10B981" };
      case "error":
        return { name: "alert-circle", color: "#EF4444" };
      case "warning":
        return { name: "warning", color: "#F59E0B" };
      default:
        return { name: "information-circle", color: "#6A1B9A" };
    }
  };

  const icon = getIconConfig();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={tw`flex-1 justify-center items-center px-6`}>
        <Animated.View
          style={[
            tw`bg-white rounded-2xl p-5 shadow-2xl max-w-sm w-full`,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name={icon.name} size={28} color={icon.color} />
            <Text style={[tw`flex-1 ml-3`, { fontFamily: "Poppins-SemiBold", fontSize: 18, color: "#1F2937" }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} style={tw`p-1`}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={[tw`ml-[44px]`, { fontFamily: "Poppins-Regular", fontSize: 14, color: "#4B5563" }]}>
            {message}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* =====================================================
   CONFIRM MODAL COMPONENT
===================================================== */
const ConfirmModal = ({ visible, title, message, confirmText = "Confirm", destructive, onCancel, onConfirm }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
        <Animated.View
          style={[
            tw`bg-white rounded-3xl p-6 w-full max-w-sm`,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={tw`w-16 h-16 rounded-full ${destructive ? 'bg-red-100' : 'bg-purple-100'} items-center justify-center self-center mb-4`}>
            <Ionicons
              name={destructive ? "warning-outline" : "information-circle-outline"}
              size={32}
              color={destructive ? "#EF4444" : "#6A1B9A"}
            />
          </View>

          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: "#1F2937", textAlign: "center", marginBottom: 8 }}>
            {title}
          </Text>

          <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#4B5563", textAlign: "center", marginBottom: 24 }}>
            {message}
          </Text>

          <View style={tw`flex-row`}>
            <TouchableOpacity
              onPress={onCancel}
              style={tw`flex-1 py-4 rounded-xl border-2 border-gray-200 mr-2`}
            >
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#4B5563" }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={tw`flex-1 py-4 rounded-xl ${destructive ? 'bg-red-600' : 'bg-[#6A1B9A]'} ml-2`}
            >
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#fff" }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* =====================================================
   FILE SIZE VALIDATOR
===================================================== */
const validateFileSize = async (asset, type) => {
  try {
    let size;

    if (Platform.OS === "web") {
      size = asset.file?.size;
    } else {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }
      size = fileInfo.size;
    }

    if (!size) {
      throw new Error("Could not determine file size");
    }

    if (type.startsWith("image/") && size > MAX_IMAGE_SIZE) {
      throw new Error(`Image size must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
    }

    if (type.startsWith("video/") && size > MAX_VIDEO_SIZE) {
      throw new Error(`Video size must be less than ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`);
    }

    return size;
  } catch (error) {
    throw new Error(error.message || "Failed to validate file size");
  }
};

export default function HubInterface({ hubId }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const router = useRouter();
  const listRef = useRef(null);
  const socketRef = useRef(null);
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedUpdates, setExpandedUpdates] = useState({});
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [showUpdateMenu, setShowUpdateMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [isWifi, setIsWifi] = useState(false);
  const visibleVideoIdRef = useRef(null);
  const [videoStatuses, setVideoStatuses] = useState({});
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");
  const touchStartX = useRef(0);

  // 🟣 NEW STATE FOR REACTION MODAL (styled like GroupChat)
  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedReactionUpdate, setSelectedReactionUpdate] = useState(null);

  // 🟣 NEW STATE FOR DELETE CONFIRMATION
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // 🟣 NEW STATE FOR PINNED HIGHLIGHT
  const [highlightedId, setHighlightedId] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info"
  });

  // Use refs object for multiple videos (fixes web issue)
  const videoRefs = useRef({});
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const menuScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (showUpdateMenu) {
      Animated.spring(menuScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      menuScaleAnim.setValue(0.95);
    }
  }, [showUpdateMenu]);

  // Reset emoji picker search when closed
  useEffect(() => {
    if (!emojiPickerVisible) {
      setEmojiSearch("");
      setActiveCategory("popular");
    }
  }, [emojiPickerVisible]);

  const {
    selectedHub,
    hubUpdates,
    loadingDetail,
    hubUpdatesPage,
    hubUpdatesHasMore,
    hubUpdatesLoading,
  } = useSelector((s) => s.community);

  const { token } = useSelector((s) => s.auth);
  const myId = getUserIdFromToken(token);
  const isMember = selectedHub?.isMember;

  const isModerator = selectedHub?.moderators?.some((m) => {
    const id = m?._id || m;
    return String(id) === String(myId);
  });

  /* ===========================
     🟣 NEW: PINNED UPDATE SELECTOR
  =========================== */
  const pinnedUpdate = selectedHub?.pinnedUpdateFull || null;

  /* ===========================
     HELPER FUNCTIONS FOR REACTIONS - FIX 1
  =========================== */
  const getTotalReactions = (reactions = []) =>
    reactions.reduce(
      (sum, r) => sum + (r.count ?? r.users?.length ?? 0),
      0
    );

  const formatCount = (n = 0) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  /* ===========================
     FETCH HUB
  =========================== */
  useEffect(() => {
    if (!hubId) return;
    dispatch(fetchHubDetail(hubId));
    dispatch(fetchHubUpdates({
      hubId,
      page: 1,
      limit: 20,
      append: false
    }));

  }, [hubId, dispatch]);

  /* ===========================
     WIFI DETECTION
  =========================== */
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsWifi(state.type === Network.NetworkStateType.WIFI);
    };

    checkNetwork();
  }, []);

  /* ===========================
     SOCKET CONNECTION - FIXED
  =========================== */
  useEffect(() => {
    if (!token || !hubId) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.emit("hub:join", { hubId });

    const onNew = ({ hubId: incomingHubId, update }) => {
      if (String(incomingHubId) !== String(hubId)) return;
      dispatch(addHubUpdate(update));
    };

    const onPin = ({ hubId: incomingHubId, pinnedUpdate }) => {
      if (String(incomingHubId) !== String(hubId)) return;

      dispatch({
        type: "community/updatePinnedUpdate",
        payload: pinnedUpdate || null,
      });
    };

    const onDelete = ({ hubId: incomingHubId, updateId }) => {
      if (incomingHubId && String(incomingHubId) !== String(hubId)) return;
      dispatch(removeHubUpdate(String(updateId)));
    };

    const onReaction = ({ hubId: incomingHubId, updateId, reactions }) => {
      if (String(incomingHubId) !== String(hubId)) return;

      dispatch(
        updateHubUpdateReactions({
          updateId,
          reactions,
        })
      );
    };

    socket.on("hub:update:new", onNew);
    socket.on("hub:update:pin", onPin);
    socket.on("hub:update:delete", onDelete);
    socket.on("hub:update:reaction", onReaction);

    return () => {
      socket.emit("hub:leave", { hubId });
      socket.off("hub:update:new", onNew);
      socket.off("hub:update:pin", onPin);
      socket.off("hub:update:delete", onDelete);
      socket.off("hub:update:reaction", onReaction);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [hubId, token, dispatch]);

  /* ===========================
     MENU ANIMATION
  =========================== */
  useEffect(() => {
    if (showMenu) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenu]);

  /* ===========================
     VIEWABILITY CONFIG FOR AUTO PAUSE
  =========================== */
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 70,
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const visible = viewableItems.find(
      (v) => v.item?.type === "video"
    );

    if (visible) {
      visibleVideoIdRef.current = visible.item._id;
    } else {
      visibleVideoIdRef.current = null;
    }
  }).current;

  /* ===========================
     DEDUPLICATE UPDATES
  =========================== */
  const uniqueUpdates = useMemo(() => {
    const map = new Map();

    (hubUpdates || []).forEach((u) => {
      if (u?._id) {
        map.set(String(u._id), u);
      }
    });

    return Array.from(map.values());
  }, [hubUpdates]);

  /* ===========================
     DATE GROUPING
  =========================== */
  const updatesWithDates = useMemo(() => {
    const sorted = [...uniqueUpdates].sort(
      (a, b) =>
        new Date(a.createdAt || a.timestamp) -
        new Date(b.createdAt || b.timestamp)
    );

    const result = [];
    let lastDate = null;

    sorted.forEach((update) => {
      const updateDate = new Date(update.createdAt || update.timestamp);

      if (!lastDate || !isSameDay(updateDate, lastDate)) {
        result.push({
          _id: `date-${updateDate.toISOString().slice(0, 10)}`,
          itemType: "date",
          label: formatDateLabel(updateDate),
        });
        lastDate = updateDate;
      }

      result.push({
        ...update,
        itemType: "update",
      });
    });

    return result;
  }, [uniqueUpdates]);

  /* ===========================
     SWIPE HANDLER FOR CATEGORY NAVIGATION
  =========================== */
  const categoryIndex = REACTION_CATEGORIES.findIndex(
    (c) => c.key === activeCategory
  );

  const handleSwipe = (direction) => {
    if (direction === "left" && categoryIndex < REACTION_CATEGORIES.length - 1) {
      setActiveCategory(REACTION_CATEGORIES[categoryIndex + 1].key);
    }

    if (direction === "right" && categoryIndex > 0) {
      setActiveCategory(REACTION_CATEGORIES[categoryIndex - 1].key);
    }
  };

  /* ===========================
     🟣 NEW: SCROLL TO PINNED UPDATE HANDLER
  =========================== */
  const scrollToPinnedUpdate = () => {
    if (!pinnedUpdate?._id || !listRef.current) return;

    const reversedData = [...updatesWithDates].reverse();

    const index = reversedData.findIndex(
      (item) =>
        item.itemType === "update" &&
        String(item._id) === String(pinnedUpdate._id)
    );

    if (index === -1) return;

    setHighlightedId(pinnedUpdate._id);

    setTimeout(() => {
      setHighlightedId(null);
    }, 2000);

    listRef.current.scrollToIndex({
      index,
      animated: true,
    });

    // 🔥 After initial scroll, adjust to true center
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // force center again
      });
    }, 250);
  };

  /* ===========================
     DATE TAG COMPONENT
  =========================== */
  const DateTag = React.memo(function DateTag({ label }) {
    return (
      <View style={tw`my-4 items-center`}>
        <View style={tw`px-4 py-1 bg-gray-200 rounded-full`}>
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 12,
              color: "#374151",
            }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  });

  const showAlert = (title, message, type = "info") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const toggleExpand = (id) => {
    setExpandedUpdates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openUpdateMenu = (update) => {
    setSelectedUpdate(update);
    setShowUpdateMenu(true);
  };

  const closeContextMenu = () => {
    setShowUpdateMenu(false);
  };

  // 🟣 Helper function to get user's full name
  const getUserFullName = (user) => {
    return user?.profile?.fullName || user?.fullName || "User";
  };

  // 🟣 Helper function to get user avatar
  const getUserAvatar = (user) => {
    return user?.profile?.avatar?.url || user?.avatar?.url || null;
  };

  // 🟣 Close reaction modal
  const closeReactionModal = () => {
    setReactionModalVisible(false);
    setSelectedReactionUpdate(null);
  };

  /* ===========================
     🟣 NEW: PIN UPDATE HANDLER
  =========================== */
  const handlePinUpdate = () => {
    if (!selectedUpdate?._id) return;

    socketRef.current?.emit("hub:update:pin", {
      hubId,
      updateId: selectedUpdate._id,
    });

    closeContextMenu();
  };

  /* ===========================
     🟣 NEW: DELETE UPDATE HANDLER
  =========================== */
  const confirmDeleteUpdate = () => {
    if (!selectedUpdate?._id) {
      setConfirmDeleteVisible(false);
      return;
    }

    socketRef.current?.emit(
      "hub:update:delete",
      {
        hubId,
        updateId: selectedUpdate._id,
      },
      (res) => {
        if (!res?.success) {
          showAlert("Error", res?.message || "Delete failed", "error");
        } else {
          showAlert("Success", "Update deleted successfully", "success");
        }

        setConfirmDeleteVisible(false);
        setSelectedUpdate(null);
      }
    );
  };


  /* ===========================
     HANDLE TEXT POST
  =========================== */
  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const textToSend = trimmed;
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticUpdate = {
      _id: optimisticId,
      type: "text",
      content: { text: textToSend },
      author: {
        _id: myId,
        profile: {
          fullName: "You",
          avatar: null
        }
      },
      createdAt: new Date().toISOString(),
      pending: true,
      itemType: "update",
      reactions: []
    };

    dispatch(addHubUpdate(optimisticUpdate));
    setMessage("");

    try {
      setIsSending(true);

      const formData = new FormData();
      formData.append("text", textToSend);

      await dispatch(createHubUpdate({ hubId, formData })).unwrap();

    } catch (error) {
      dispatch(removeHubUpdate(optimisticId));
      showAlert("Error", error?.message || "Failed to send update", "error");
    } finally {
      setIsSending(false);
    }
  };

  /* ===========================
     PROGRESS SIMULATION FUNCTIONS
  =========================== */
  const startProgress = () => {
    setUploadProgress(0);
    setShowUploadProgress(true);

    let fake = 0;

    const interval = setInterval(() => {
      fake += 8;
      if (fake >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
      } else {
        setUploadProgress(fake);
      }
    }, 200);

    return interval;
  };

  const stopProgress = (interval) => {
    clearInterval(interval);
    setUploadProgress(100);

    setTimeout(() => {
      setShowUploadProgress(false);
      setUploadProgress(0);
    }, 600);
  };

  /* ===========================
     HANDLE MEDIA SELECTION
  =========================== */
  const handleMediaSelect = async (type) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showAlert(
          "Permission needed",
          `Please grant permission to access ${type}s`,
          "error"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          type === "image"
            ? ImagePicker.MediaTypeOptions.Images
            : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1, // No compression for better quality
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        setSelectedMedia(asset);
        setMediaType(type);
        setShowMediaOptions(false);
        setShowPreview(true);
      }
    } catch (error) {
      console.log("Picker error:", error);
      showAlert("Error", `Failed to pick ${type}`, "error");
    }
  };

  /* ===========================
     HANDLE MEDIA POST
  =========================== */
  const handleMediaPost = async () => {
    if (!selectedMedia || isSending) return;

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticUpdate = {
      _id: optimisticId,
      type: mediaType,
      content: {
        caption: caption || null,
        ...(mediaType === 'image'
          ? { imageUrl: selectedMedia.uri }
          : { videoUrl: selectedMedia.uri })
      },
      author: {
        _id: myId,
        profile: {
          fullName: "You",
          avatar: null
        }
      },
      createdAt: new Date().toISOString(),
      pending: true,
      itemType: "update",
      reactions: []
    };

    dispatch(addHubUpdate(optimisticUpdate));

    const progressInterval = startProgress();

    try {
      setIsSending(true);

      const formData = new FormData();

      if (caption.trim()) {
        formData.append("caption", caption);
      }

      const filename = selectedMedia.uri.split('/').pop() || `media.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
      const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

      formData.append("file", {
        uri: selectedMedia.uri,
        name: filename,
        type: mimeType,
      });

      await dispatch(
        createHubUpdate({
          hubId,
          formData,
        })
      ).unwrap();

      stopProgress(progressInterval);

      setSelectedMedia(null);
      setMediaType(null);
      setCaption("");
      setShowPreview(false);
      setIsPlaying(false);

      showAlert("Success", "Media posted successfully", "success");
    } catch (error) {
      clearInterval(progressInterval);
      setShowUploadProgress(false);
      setUploadProgress(0);
      dispatch(removeHubUpdate(optimisticId));
      showAlert("Error", error?.message || "Failed to post media", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleJoinHub = async () => {
    try {
      await dispatch(joinHub(hubId)).unwrap();
      setShowMenu(false);
      showAlert("Success", "You have joined the hub!", "success");
    } catch (error) {
      showAlert("Error", "Failed to join hub", "error");
    }
  };

  const handleLeaveHub = () => {
    setShowDeleteConfirm(true);
  };

  const confirmLeaveHub = async () => {
    try {
      await dispatch(leaveHub(hubId)).unwrap();
      setShowMenu(false);
      setShowDeleteConfirm(false);
      showAlert("Success", "You have left the hub", "success");
      socketRef.current?.emit("hub:leave", { hubId });
      router.back();
    } catch (error) {
      showAlert("Error", "Failed to leave hub", "error");
    }
  };

  const handleDeleteHub = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHub = async () => {
    try {
      await dispatch(deleteHub(hubId)).unwrap();
      setShowMenu(false);
      setShowDeleteConfirm(false);
      showAlert("Success", "Hub has been deleted", "success");
      router.back();
    } catch (error) {
      showAlert("Error", "Failed to delete hub", "error");
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      showAlert("Error", "Please select a reason for reporting", "error");
      return;
    }

    try {
      await dispatch(
        reportContent({
          targetType: "hub",
          targetId: hubId,
          reason: reportDetails?.trim()
            ? `${reportReason} — ${reportDetails}`
            : reportReason,
        })
      ).unwrap();

      console.log("Report:". reportContent);
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");

      showAlert(
        "Thank You",
        "Your report has been submitted. Our moderators will review it shortly.",
        "success"
      );
    } catch (error) {
      showAlert(
        "Error",
        error || "Failed to submit report",
        "error"
      );
    }
  };

  /* ===========================
     REACTION HANDLERS - FIXED
  =========================== */
  const handleReaction = (updateId, emoji) => {
    if (!socketRef.current || !hubId || !updateId) return;

    socketRef.current.emit(
      "hub:update:reaction",
      { hubId, updateId, emoji },
      (res) => {
        if (res && res.success === false) {
          showAlert(
            "Error",
            res.message || "Failed to react",
            "error"
          );
        }
      }
    );
  };

  /* ===========================
     FIX 1: FLATTEN REACTIONS FOR MODAL
  =========================== */
  const flattenedReactions = useMemo(() => {
    if (!selectedReactionUpdate?.reactions) return [];

    const flat = [];

    selectedReactionUpdate.reactions.forEach((r) => {
      r.users?.forEach((u) => {
        flat.push({
          emoji: r.emoji,
          user: u,
          createdAt: r.createdAt || u.createdAt
        });
      });
    });

    return flat;
  }, [selectedReactionUpdate]);

  /* ===========================
   🟣 REACTION MODAL LOGS ONLY
=========================== */

  // useEffect(() => {
  //   if (!reactionModalVisible) return;

  //   console.log("🟣 MODAL OPENED");
  //   console.log("Selected Update:", selectedReactionUpdate);
  //   console.log("Update ID:", selectedReactionUpdate?._id);
  //   console.log("Raw Reactions:", selectedReactionUpdate?.reactions);
  //   console.log("My ID:", myId);
  // }, [reactionModalVisible]);

  // useEffect(() => {
  //   if (!reactionModalVisible) return;

  //   console.log("🔵 Flattened Reactions:", flattenedReactions);
  //   console.log("Flattened Count:", flattenedReactions?.length);
  // }, [flattenedReactions, reactionModalVisible]);

  /* ===========================
     RENDER UPDATE - PREMIUM VERSION WITH REACTIONS AND HIGHLIGHT
  =========================== */
  const renderUpdate = ({ item: update }) => {
    // 🟣 FIX 1: Check if current user reacted - using users array structure
    const isMine = update.reactions?.some((r) =>
      r.users?.some(
        (u) => String(u?._id || u) === String(myId)
      )
    );

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => openUpdateMenu(update)}
        style={[
          tw`mb-4`,
          highlightedId === update._id && {
            backgroundColor: "#F3E8FF",
            borderRadius: 20,
            padding: 6,
          }
        ]}
      >
        <View style={tw`flex-row items-start`}>
          {/* Avatar */}
          <Image
            source={{
              uri:
                update.author?.profile?.avatar?.url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  update.author?.profile?.fullName || "Moderator"
                )}&background=6A1B9A&color=fff`,
            }}
            style={tw`w-9 h-9 rounded-full mr-3 mt-1`}
          />

          {/* Bubble - WhatsApp style width limit */}
          <View
            style={{
              flex: 1,
              maxWidth: isWeb ? 700 : "85%",
              alignSelf: "flex-start",
            }}
          >

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 14,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 6,
              }}
            >
              {/* Name with Announcement Badge */}
              <View style={tw`flex-row items-center mb-2`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 13,
                    color: "#6A1B9A",
                  }}
                >
                  {update.author?.profile?.fullName || "Moderator"}
                </Text>

                {selectedHub?.moderators?.some(
                  (m) => String(m?._id || m) === String(update.author?._id)
                ) && (
                    <Ionicons
                      name="megaphone-outline"
                      size={14}
                      color="#FFD700"
                      style={{ marginLeft: 6 }}
                    />
                  )}

                {update.pending && (
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 4 }}>
                    (sending...)
                  </Text>
                )}
              </View>

              {/* TEXT with Show More/Less */}
              {update.type === "text" && update.content?.text && (
                <>
                  <Text
                    style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 14,
                      color: "#374151",
                    }}
                    numberOfLines={expandedUpdates[update._id] ? undefined : 4}
                  >
                    {update.content.text}
                  </Text>

                  {update.content.text.length > MAX_TEXT_LENGTH && (
                    <TouchableOpacity onPress={() => toggleExpand(update._id)}>
                      <Text
                        style={{
                          fontFamily: "Poppins-SemiBold",
                          color: "#6A1B9A",
                          marginTop: 4,
                          fontSize: 12,
                        }}
                      >
                        {expandedUpdates[update._id] ? "Show less" : "Show more"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* IMAGE - Web safe with proper sizing */}
              {update.type === "image" && update.content?.imageUrl && (
                <>
                  <View
                    style={{
                      marginTop: 8,
                      maxWidth: MAX_MEDIA_WIDTH,
                      alignSelf: isWeb ? "center" : "flex-start",
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: "#000",
                    }}
                  >
                    {isWeb ? (
                      <img
                        src={update.content.imageUrl}
                        style={{
                          width: "100%",
                          maxWidth: MAX_MEDIA_WIDTH,
                          height: "auto",
                          borderRadius: 16,
                          display: "block",
                        }}
                      />
                    ) : (
                      <Image
                        source={{ uri: update.content.imageUrl }}
                        style={{
                          width: "100%",
                          height: undefined,
                          aspectRatio: 1,
                        }}
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  {/* Caption with Show More/Less */}
                  {update.content.caption && (
                    <>
                      <Text
                        style={{
                          fontFamily: "Poppins-Regular",
                          fontSize: 14,
                          color: "#374151",
                          marginTop: 8,
                        }}
                        numberOfLines={expandedUpdates[`${update._id}-caption`] ? undefined : 2}
                      >
                        {update.content.caption}
                      </Text>

                      {update.content.caption.length > MAX_TEXT_LENGTH && (
                        <TouchableOpacity onPress={() => toggleExpand(`${update._id}-caption`)}>
                          <Text
                            style={{
                              fontFamily: "Poppins-SemiBold",
                              color: "#6A1B9A",
                              marginTop: 2,
                              fontSize: 12,
                            }}
                          >
                            {expandedUpdates[`${update._id}-caption`] ? "Show less" : "Show more"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              )}

              {/* VIDEO - Premium with all features and web fixes */}
              {update.type === "video" && update.content?.videoUrl && (
                <>
                  <View
                    style={{
                      marginTop: 8,
                      maxWidth: MAX_MEDIA_WIDTH,
                      alignSelf: isWeb ? "center" : "flex-start",
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: "#000",
                    }}
                  >
                    {/* Use HTML5 video for web, Expo Video for native */}
                    {isWeb ? (
                      <video
                        src={update.content.videoUrl}
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: 16,
                          display: "block",
                        }}
                        controls
                        muted
                        playsInline
                        loop
                      />
                    ) : (
                      <>
                        <Video
                          ref={(ref) => {
                            if (ref) videoRefs.current[update._id] = ref;
                          }}
                          source={{ uri: update.content.videoUrl }}
                          style={{
                            width: "100%",
                            height: undefined,
                            aspectRatio:
                              videoStatuses[update._id]?.naturalSize?.width &&
                                videoStatuses[update._id]?.naturalSize?.height
                                ? videoStatuses[update._id].naturalSize.width /
                                videoStatuses[update._id].naturalSize.height
                                : 1,
                          }}
                          resizeMode={ResizeMode.CONTAIN}
                          shouldPlay={
                            isWifi &&
                            visibleVideoIdRef.current === update._id
                          }
                          isMuted
                          isLooping
                          useNativeControls={false}
                          onPlaybackStatusUpdate={(status) => {
                            if (!status.isLoaded) return;

                            setVideoStatuses((prev) => ({
                              ...prev,
                              [update._id]: status,
                            }));
                          }}
                        />

                        {/* TAP TO PAUSE/PLAY OVERLAY - Fixed for native */}
                        <TouchableOpacity
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          activeOpacity={0.7}
                          onPress={async () => {
                            const ref = videoRefs.current[update._id];
                            if (!ref) return;

                            const status = videoStatuses[update._id];
                            if (!status) return;

                            if (status.isPlaying) {
                              await ref.pauseAsync();
                            } else {
                              await ref.playAsync();
                            }
                          }}
                        >
                          {!videoStatuses[update._id]?.isPlaying && (
                            <View style={{
                              backgroundColor: "rgba(0,0,0,0.5)",
                              borderRadius: 40,
                              width: 60,
                              height: 60,
                              justifyContent: "center",
                              alignItems: "center",
                            }}>
                              <Ionicons name="play" size={30} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* PROGRESS BAR */}
                        {videoStatuses[update._id]?.durationMillis && (
                          <View style={tw`absolute bottom-0 left-0 right-0 h-1 bg-black/40`}>
                            <View
                              style={{
                                height: "100%",
                                width: `${(videoStatuses[update._id].positionMillis /
                                  videoStatuses[update._id].durationMillis) *
                                  100
                                  }%`,
                                backgroundColor: "#6A1B9A",
                              }}
                            />
                          </View>
                        )}

                        {/* MUTE BUTTON */}
                        <TouchableOpacity
                          style={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            padding: 8,
                            borderRadius: 20,
                          }}
                          onPress={async () => {
                            const ref = videoRefs.current[update._id];
                            if (!ref) return;

                            const current = videoStatuses[update._id]?.isMuted;
                            await ref.setIsMutedAsync(!current);
                          }}
                        >
                          <Ionicons
                            name={
                              videoStatuses[update._id]?.isMuted
                                ? "volume-mute"
                                : "volume-high"
                            }
                            size={18}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* Caption with Show More/Less */}
                  {update.content.caption && (
                    <>
                      <Text
                        style={{
                          fontFamily: "Poppins-Regular",
                          fontSize: 14,
                          color: "#374151",
                          marginTop: 8,
                        }}
                        numberOfLines={expandedUpdates[`${update._id}-caption`] ? undefined : 2}
                      >
                        {update.content.caption}
                      </Text>

                      {update.content.caption.length > MAX_TEXT_LENGTH && (
                        <TouchableOpacity onPress={() => toggleExpand(`${update._id}-caption`)}>
                          <Text
                            style={{
                              fontFamily: "Poppins-SemiBold",
                              color: "#6A1B9A",
                              marginTop: 2,
                              fontSize: 12,
                            }}
                          >
                            {expandedUpdates[`${update._id}-caption`] ? "Show less" : "Show more"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              )}

              {/* 🟣 REACTIONS DISPLAY - FIX 2: Updated with total count and width constraint */}
              {update.reactions?.length > 0 && (
                <View style={tw`mt-2 flex-row items-center justify-end`}>
                  <Pressable
                    onPress={() => {
                      setSelectedReactionUpdate(update);
                      setReactionModalVisible(true);
                    }}
                    style={[
                      tw`flex-row items-center px-2 py-1 rounded-full border`,
                      { maxWidth: 80 }, // 👈 FIX 2: Prevents infinite stretching
                      isMine
                        ? tw`bg-purple-100 border-purple-400`
                        : tw`bg-gray-100 border-gray-200`
                    ]}
                  >
                    <View style={tw`flex-row items-center mr-1`}>
                      {update.reactions
                        .slice(0, 3)
                        .map((r, index) => (
                          <View
                            key={`${update._id}-${r.emoji}-${index}`}
                            style={[
                              tw`w-5 h-5 rounded-full items-center justify-center bg-white`,
                              { marginLeft: index > 0 ? -6 : 0 },
                            ]}
                          >
                            <Text style={{ fontSize: 10 }}>{r.emoji}</Text>
                          </View>
                        ))}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: "Poppins-Medium",
                        fontSize: 11,
                        color: "#111827",
                        marginLeft: 4,
                        maxWidth: 40, // 👈 FIX 1: Prevents text overflow
                      }}
                    >
                      {formatCount(getTotalReactions(update.reactions))}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Time - Poppins font */}
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 10,
                  color: "#9CA3AF",
                  marginTop: 6,
                  alignSelf: "flex-end",
                }}
              >
                {new Date(update.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  };

  /* ===========================
     RENDER LIST ITEM
  =========================== */
  const renderListItem = ({ item }) => {
    if (item.itemType === "date") {
      return <DateTag label={item.label} />;
    }
    return renderUpdate({ item });
  };

  if (loadingDetail || !selectedHub) {
    return <LoadingBlock />;
  }

  const {
    name,
    description,
    avatar,
    membersCount = 0,
    type,
    region,
  } = selectedHub;

  // Conditional keyboard dismiss wrapper for web vs native
  const renderContent = () => (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: "#6A1B9A",
            paddingTop: insets.top + 18,
            paddingBottom: 22,
            paddingHorizontal: 16,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            elevation: 8,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <View style={tw`flex-row items-center justify-between`}>

            {/* LEFT SIDE */}
            <View style={tw`flex-row items-center flex-1`}>

              {/* Back */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={tw`p-2 -ml-2`}
                hitSlop={12}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Avatar */}
              <View style={tw`ml-3`}>
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      borderWidth: 2,
                      borderColor: "#FFFFFF",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: "#FFD700",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins-Bold",
                        color: "#6A1B9A",
                        fontSize: 17,
                      }}
                    >
                      {name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* TITLE + META */}
              <View style={tw`ml-3 flex-1`}>

                {/* Name */}
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 19,
                    color: "#FFFFFF",
                  }}
                >
                  {name}
                </Text>

                {/* Subtitle */}
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    color: "#E9D5FF",
                  }}
                >
                  {type?.toUpperCase()} • {membersCount} members
                  {region ? ` • ${region}` : ""}
                </Text>
              </View>
            </View>

            {/* MENU */}
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={tw`p-2`}
              hitSlop={12}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>

          </View>
        </View>

        {/* 🟣 PINNED BANNER - Tappable Premium Version */}
        {pinnedUpdate && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={scrollToPinnedUpdate}
            style={[
              tw`px-4 py-3 border-b border-gray-200 bg-white`,
              { elevation: 4 }
            ]}
          >
            <View style={tw`flex-row items-center`}>

              {/* PIN ICON */}
              <Ionicons name="pin" size={16} color="#6A1B9A" />

              {/* IMAGE PREVIEW */}
              {pinnedUpdate.type === "image" && pinnedUpdate.content?.imageUrl && (
                <Image
                  source={{ uri: pinnedUpdate.content.imageUrl }}
                  style={tw`w-10 h-10 rounded-lg mx-3`}
                />
              )}

              {/* VIDEO PREVIEW */}
              {pinnedUpdate.type === "video" && pinnedUpdate.content?.videoUrl && (
                <View style={tw`w-10 h-10 rounded-lg bg-black mx-3 items-center justify-center`}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              )}

              {/* TEXT */}
              <View style={tw`flex-1`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 12,
                    color: "#6B7280"
                  }}
                >
                  Pinned update
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#111827"
                  }}
                >
                  {pinnedUpdate.content?.text ||
                    pinnedUpdate.content?.caption ||
                    "Pinned update"}
                </Text>
              </View>

              {/* UNPIN (moderator only) */}
              {isModerator && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onPress
                    socketRef.current?.emit("hub:update:pin", {
                      hubId,
                      updateId: pinnedUpdate._id,
                    });
                  }}
                  style={tw`p-2`}
                >
                  <Ionicons name="close" size={18} color="#6B7280" />
                </Pressable>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Feed */}
        <FlatList
          ref={listRef}
          data={[...updatesWithDates].reverse()}
          inverted
          keyExtractor={(item, index) =>
            item.itemType === "date"
              ? `date-${item.label}-${index}`
              : `hub-${item._id}`
          }
          renderItem={renderListItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          bounces={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={15}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: isModerator ? 80 : 40,
          }}
          onEndReached={() => {
            if (!hubUpdatesHasMore || hubUpdatesLoading) return;

            dispatch(fetchHubUpdates({
              hubId,
              page: hubUpdatesPage + 1,
              limit: 20,
              append: true
            }));
          }}
          onEndReachedThreshold={0.4}
          // getItemLayout={(data, index) => ({
          //   length: 100, // average row height
          //   offset: 100 * index,
          //   index,
          // })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 500);
          }}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              {hubUpdatesLoading ? (
                <LoadingBlock />
              ) : (
                <EmptyState
                  title="No updates yet"
                  subtitle="Announcements and hub updates will appear here."
                />
              )}
            </View>
          }
        />

        {/* Input Area */}
        {isModerator ? (
          <View
            style={[
              tw`px-3 pt-3 border-t border-gray-200 bg-white`,
              { paddingBottom: Platform.OS === "ios" ? 16 : 12 }
            ]}
          >
            <View style={tw`flex-row items-end`}>
              <TouchableOpacity
                onPress={() => setShowMediaOptions(true)}
                style={tw`p-2 mb-1 rounded-full bg-purple-50 active:bg-purple-100`}
              >
                <Ionicons name="add-circle-outline" size={32} color="#6A1B9A" />
              </TouchableOpacity>

              <View style={tw`flex-1 mx-2`}>
                <View style={tw`bg-gray-100 rounded-3xl px-4 py-2 min-h-[42px] max-h-32 border border-gray-200`}>
                  <TextInput
                    style={{ fontFamily: "Poppins-Regular", fontSize: 16, paddingVertical: 4 }}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!message.trim() || isSending}
                style={[
                  tw`p-2 mb-1 rounded-full`,
                  !message.trim() || isSending ? tw`bg-gray-200` : tw`bg-[#6A1B9A] shadow-md`
                ]}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={!message.trim() || isSending ? "#9CA3AF" : "#fff"}
                />
              </TouchableOpacity>
            </View>

            {message.length > 0 && (
              <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#9CA3AF", marginTop: 4, textAlign: "right", paddingRight: 8 }}>
                {message.length}/500
              </Text>
            )}
          </View>
        ) : (
          <View style={tw`px-4 pb-6 pt-4 border-t border-gray-200 bg-gray-50`}>
            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#4B5563", textAlign: "center" }}>
              Only moderators can send updates to this hub
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Media Options Modal */}
      <Modal animationType="fade" transparent visible={showMediaOptions} onRequestClose={() => setShowMediaOptions(false)}>
        <Pressable style={tw`flex-1 bg-black/60`} onPress={() => setShowMediaOptions(false)}>
          <View style={tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl`}>
            <View style={tw`w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6`} />
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 20, color: "#1F2937", marginBottom: 24 }}>
              Post to hub
            </Text>

            <TouchableOpacity
              onPress={() => handleMediaSelect('image')}
              style={tw`flex-row items-center py-4 border-b border-gray-100 active:bg-gray-50 rounded-xl`}
            >
              <View style={tw`w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4 shadow-sm`}>
                <Ionicons name="image" size={24} color="#6A1B9A" />
              </View>
              <View>
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#1F2937" }}>
                  Photo
                </Text>
                <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#6B7280" }}>
                  Share an image (max 5MB)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMediaSelect('video')}
              style={tw`flex-row items-center py-4 active:bg-gray-50 rounded-xl`}
            >
              <View style={tw`w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4 shadow-sm`}>
                <Ionicons name="videocam" size={24} color="#6A1B9A" />
              </View>
              <View>
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#1F2937" }}>
                  Video
                </Text>
                <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#6B7280" }}>
                  Share a video (max 30MB, 60s)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMediaOptions(false)}
              style={tw`mt-6 py-3 rounded-xl active:bg-gray-100`}
            >
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#4B5563", textAlign: "center" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Media Preview Modal - UPDATED with upload progress inside */}
      <Modal
        animationType="slide"
        visible={showPreview}
        onRequestClose={() => {
          setShowPreview(false);
          setSelectedMedia(null);
          setMediaType(null);
          setCaption("");
          setIsPlaying(false);
        }}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={tw`flex-1 bg-black`}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          >
            <View style={tw`flex-row justify-between items-center px-6 py-4 bg-black/80 border-b border-white/10`}>
              <TouchableOpacity
                onPress={() => {
                  setShowPreview(false);
                  setSelectedMedia(null);
                  setMediaType(null);
                  setCaption("");
                  setIsPlaying(false);
                }}
                style={tw`p-2 rounded-full bg-white/10 active:bg-white/20`}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 18, color: "#fff" }}>
                Preview
              </Text>
              <TouchableOpacity
                onPress={handleMediaPost}
                disabled={isSending}
                style={tw`px-4 py-2 rounded-full ${isSending ? 'bg-gray-600' : 'bg-[#6A1B9A]'}`}
              >
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#fff" }}>
                  {isSending ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* UPLOAD PROGRESS - Now inside the preview modal */}
            {showUploadProgress && (
              <View style={tw`px-6 pb-3 bg-black`}>
                <View style={tw`flex-row justify-between mb-1`}>
                  <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#A78BFA" }}>
                    Uploading...
                  </Text>
                  <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 12, color: "#A78BFA" }}>
                    {uploadProgress}%
                  </Text>
                </View>

                <View style={tw`h-1.5 bg-gray-800 rounded-full overflow-hidden`}>
                  <View
                    style={{
                      width: `${uploadProgress}%`,
                      height: "100%",
                      backgroundColor: "#6A1B9A",
                    }}
                  />
                </View>
              </View>
            )}

            <FlatList
              data={[{ key: 'preview' }]}
              renderItem={() => (
                <>
                  {selectedMedia && (
                    <View style={tw`flex-1 bg-black`}>
                      {mediaType === 'image' ? (
                        <Image
                          source={{ uri: selectedMedia.uri }}
                          style={tw`w-full h-[500px]`}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={tw`w-full h-[500px] bg-black`}>
                          {isWeb ? (
                            <video
                              src={selectedMedia.uri}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                              controls
                              autoPlay={isPlaying}
                              loop
                              playsInline
                            />
                          ) : (
                            <Video
                              ref={videoRefs.current.preview}
                              source={{ uri: selectedMedia.uri }}
                              style={tw`w-full h-full`}
                              resizeMode={ResizeMode.CONTAIN}
                              shouldPlay={isPlaying}
                              isLooping
                              useNativeControls
                            />
                          )}

                          {!isPlaying && (
                            <TouchableOpacity
                              style={tw`absolute inset-0 items-center justify-center bg-black/30`}
                              onPress={() => {
                                setIsPlaying(true);
                                if (isWeb) {
                                  const video = document.querySelector('video');
                                  if (video) video.play();
                                } else {
                                  videoRefs.current.preview?.playAsync();
                                }
                              }}
                            >
                              <View style={tw`w-20 h-20 rounded-full bg-[#6A1B9A] items-center justify-center shadow-2xl`}>
                                <Ionicons name="play" size={40} color="#fff" />
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={tw`p-6 bg-black`}>
                    <View style={tw`bg-gray-900 rounded-2xl border border-gray-800 px-4 py-2`}>
                      <TextInput
                        style={{ fontFamily: "Poppins-Regular", fontSize: 16, color: "#fff", minHeight: 50 }}
                        placeholder="Add a caption..."
                        placeholderTextColor="#6B7280"
                        value={caption}
                        onChangeText={setCaption}
                        multiline
                        maxLength={300}
                      />
                    </View>
                    <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280", marginTop: 8, textAlign: "right" }}>
                      {caption.length}/300
                    </Text>
                  </View>
                </>
              )}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Side Menu Modal */}
      <Modal transparent visible={showMenu} onRequestClose={() => setShowMenu(false)}>
        <View style={tw`flex-1 bg-black/50`}>
          <TouchableOpacity style={tw`flex-1`} onPress={() => setShowMenu(false)} activeOpacity={1} />

          <Animated.View
            style={[
              tw`absolute top-0 right-0 bottom-0 w-4/5 bg-white`,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <View style={tw`flex-1`}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={tw`p-6 pt-14`}>
                  <TouchableOpacity
                    onPress={() => setShowMenu(false)}
                    style={tw`absolute top-6 right-6 p-2 rounded-full bg-gray-100 active:bg-gray-200`}
                  >
                    <Ionicons name="close" size={20} color="#6A1B9A" />
                  </TouchableOpacity>

                  {/* Hub Header */}
                  <View style={tw`flex-row items-center mb-6`}>
                    <View style={tw`w-16 h-16 rounded-full overflow-hidden bg-purple-100 mr-4 shadow-md`}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={tw`w-full h-full`} />
                      ) : (
                        <View style={tw`flex-1 items-center justify-center`}>
                          <Ionicons name="earth" size={24} color="#6A1B9A" />
                        </View>
                      )}
                    </View>

                    <View style={tw`flex-1`}>
                      <Text
                        style={{
                          fontFamily: "Poppins-Bold",
                          fontSize: 20,
                          color: "#1F2937",
                        }}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>

                      <View style={tw`flex-row items-center mt-1`}>
                        <View style={tw`bg-purple-100 px-2 py-0.5 rounded-full`}>
                          <Text
                            style={{
                              fontFamily: "Poppins-SemiBold",
                              fontSize: 12,
                              color: "#6A1B9A",
                            }}
                          >
                            {type?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  {description && (
                    <View style={tw`mb-8 bg-gray-50 p-4 rounded-2xl`}>
                      <Text
                        style={{
                          fontFamily: "Poppins-SemiBold",
                          fontSize: 13,
                          color: "#6B7280",
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        About Hub
                      </Text>

                      <Text
                        style={{
                          fontFamily: "Poppins-Regular",
                          fontSize: 14,
                          color: "#374151",
                          lineHeight: 20,
                        }}
                      >
                        {description}
                      </Text>
                    </View>
                  )}

                  {/* Stats + Actions */}
                  <View style={tw`border-t border-gray-200 pt-6`}>
                    <View style={tw`flex-row mb-8 bg-gray-50 p-4 rounded-2xl`}>
                      <View style={tw`flex-1 items-center`}>
                        <Text
                          style={{
                            fontFamily: "Poppins-Bold",
                            fontSize: 24,
                            color: "#6A1B9A",
                          }}
                        >
                          {membersCount}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins-Regular",
                            fontSize: 14,
                            color: "#4B5563",
                          }}
                        >
                          Members
                        </Text>
                      </View>

                      {region && (
                        <>
                          <View style={tw`w-px h-10 bg-gray-200 mx-4 self-center`} />
                          <View style={tw`flex-1 items-center`}>
                            <Text
                              style={{
                                fontFamily: "Poppins-Bold",
                                fontSize: 24,
                                color: "#6A1B9A",
                              }}
                            >
                              {region}
                            </Text>
                            <Text
                              style={{
                                fontFamily: "Poppins-Regular",
                                fontSize: 14,
                                color: "#4B5563",
                              }}
                            >
                              Region
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Join / Leave Button */}
                    {!isModerator && (
                      <TouchableOpacity
                        onPress={isMember ? handleLeaveHub : handleJoinHub}
                        style={tw`mb-4 py-4 rounded-2xl ${isMember
                          ? "bg-red-50 border-2 border-red-200"
                          : "bg-[#6A1B9A] shadow-md"
                          }`}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 16,
                            textAlign: "center",
                            color: isMember ? "#EF4444" : "#fff",
                          }}
                        >
                          {isMember ? "Leave Hub" : "Join Hub"}
                        </Text>
                      </TouchableOpacity>
                    )}


                    {/* Moderator Section */}
                    {isModerator && (
                      <View style={tw`mb-4`}>
                        <Text
                          style={{
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 14,
                            color: "#6B7280",
                            marginBottom: 8,
                            paddingHorizontal: 8,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Moderator Controls
                        </Text>

                        <TouchableOpacity
                          style={tw`flex-row items-center py-4 px-2 active:bg-gray-50 rounded-xl mb-2`}
                          onPress={() => {
                            setShowMenu(false);
                          }}
                        >
                          <View style={tw`w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3`}>
                            <Ionicons name="settings-outline" size={20} color="#6A1B9A" />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#1F2937" }}>
                              Hub Settings
                            </Text>
                            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280" }}>
                              Manage hub preferences
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={tw`flex-row items-center py-4 px-2 active:bg-gray-50 rounded-xl`}
                          onPress={handleDeleteHub}
                        >
                          <View style={tw`w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3`}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#EF4444" }}>
                              Delete Hub
                            </Text>
                            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280" }}>
                              Permanently remove this hub
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Report Hub */}
                    <TouchableOpacity
                      style={tw`flex-row items-center py-4 px-2 active:bg-gray-50 rounded-xl border-t border-gray-100`}
                      onPress={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                    >
                      <View style={tw`w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3`}>
                        <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#1F2937" }}>
                          Report Hub
                        </Text>
                        <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280" }}>
                          Flag inappropriate content
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>

              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal animationType="slide" transparent visible={showReportModal} onRequestClose={() => setShowReportModal(false)}>
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-6`}>
            <View style={tw`w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6`} />

            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: "#1F2937", marginBottom: 16 }}>
              Report Hub
            </Text>
            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#4B5563", marginBottom: 24 }}>
              Help us understand the issue. Your report will be reviewed by our moderators.
            </Text>

            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#374151", marginBottom: 8 }}>
              Reason for reporting *
            </Text>

            <View style={tw`mb-4`}>
              {["Inappropriate content", "Spam", "Harassment", "False information", "Other"].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={tw`flex-row items-center py-3`}
                >
                  <View style={tw`w-6 h-6 rounded-full border-2 mr-3 ${reportReason === reason ? 'bg-[#6A1B9A] border-[#6A1B9A]' : 'border-gray-300'}`}>
                    {reportReason === reason && (
                      <Ionicons name="checkmark" size={16} color="#fff" style={tw`self-center`} />
                    )}
                  </View>
                  <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#374151" }}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: "#374151", marginBottom: 8 }}>
              Additional details (optional)
            </Text>

            <TextInput
              style={[{ fontFamily: "Poppins-Regular", fontSize: 14 }, tw`bg-gray-100 rounded-xl px-4 py-3 mb-6 min-h-[100px]`]}
              placeholder="Please provide more information..."
              placeholderTextColor="#9CA3AF"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              textAlignVertical="top"
            />

            <View style={tw`flex-row`}>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={tw`flex-1 py-4 rounded-xl border-2 border-gray-200 mr-2`}
              >
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#4B5563" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReportSubmit}
                style={tw`flex-1 py-4 rounded-xl bg-[#6A1B9A] ml-2`}
              >
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#fff" }}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete/Leave Confirmation Modal */}
      <Modal animationType="fade" transparent visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm`}>
            <View style={tw`w-16 h-16 rounded-full bg-red-100 items-center justify-center self-center mb-4`}>
              <Ionicons name="warning-outline" size={32} color="#EF4444" />
            </View>

            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: "#1F2937", textAlign: "center", marginBottom: 8 }}>
              {isModerator ? "Delete Hub?" : "Leave Hub?"}
            </Text>

            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 14, color: "#4B5563", textAlign: "center", marginBottom: 24 }}>
              {isModerator
                ? "This action cannot be undone. All hub data will be permanently deleted."
                : "Are you sure you want to leave this hub? You'll need to rejoin to see updates."}
            </Text>

            <View style={tw`flex-row`}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={tw`flex-1 py-4 rounded-xl border-2 border-gray-200 mr-2`}
              >
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#4B5563" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={isModerator ? confirmDeleteHub : confirmLeaveHub}
                style={tw`flex-1 py-4 rounded-xl bg-red-600 ml-2`}
              >
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, textAlign: "center", color: "#fff" }}>
                  {isModerator ? "Delete" : "Leave"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= HUB LONG PRESS MENU ================= */}
      <Modal
        transparent
        visible={showUpdateMenu}
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <Pressable
          style={tw`flex-1 bg-black/30 justify-center items-center px-6`}
          onPress={closeContextMenu}
        >
          <Animated.View
            style={[
              tw`bg-white rounded-2xl w-full max-w-[340px] overflow-hidden border border-gray-200`,
              { transform: [{ scale: menuScaleAnim }] }
            ]}
          >
            {/* ===== QUICK REACTIONS ROW ===== */}
            <View style={tw`px-4 py-3 flex-row items-center justify-between`}>
              <Text style={{ fontFamily: "Poppins-SemiBold", color: "#111827" }}>
                React
              </Text>

              <View style={tw`flex-row items-center`}>
                {["❤️", "😂", "👍", "🔥"].map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      handleReaction(selectedUpdate?._id, e);
                      closeContextMenu();
                    }}

                    style={tw`ml-3`}
                  >
                    <Text style={{ fontSize: 18 }}>{e}</Text>
                  </Pressable>
                ))}

                {/* LEFT CHEVRON → FULL PICKER */}
                <Pressable
                  onPress={() => {
                    closeContextMenu();
                    // ✅ IMPROVEMENT: Use requestAnimationFrame for smoother transition
                    requestAnimationFrame(() => {
                      setEmojiPickerVisible(true);
                    });
                  }}
                  style={tw`ml-3`}
                >
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </Pressable>
              </View>

            </View>

            <View style={tw`h-[1px] bg-gray-200`} />

            {/* ===== PIN (MODERATOR ONLY) ===== */}
            {isModerator && (
              <>
                <Pressable
                  style={tw`px-4 py-3 flex-row items-center`}
                  onPress={handlePinUpdate}
                >
                  <Ionicons name="pin" size={18} color="#111827" />
                  <Text
                    style={{
                      marginLeft: 12,
                      fontFamily: "Poppins-Regular",
                      color: "#111827",
                    }}
                  >
                    Pin Update
                  </Text>
                </Pressable>

                <View style={tw`h-[1px] bg-gray-200`} />
              </>
            )}

            {/* ===== DELETE (MODERATOR ONLY) ===== */}
            {isModerator && (
              <Pressable
                style={tw`px-4 py-3 flex-row items-center`}
                onPress={() => {
                  closeContextMenu();
                  setConfirmDeleteVisible(true);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text
                  style={{
                    marginLeft: 12,
                    fontFamily: "Poppins-SemiBold",
                    color: "#DC2626",
                  }}
                >
                  Delete Update
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ================= CONFIRM DELETE MODAL ================= */}
      <ConfirmModal
        visible={confirmDeleteVisible}
        title="Delete update?"
        message="Are you sure you want to delete this update? This action cannot be undone."
        confirmText="Delete"
        destructive
        onCancel={() => setConfirmDeleteVisible(false)}
        onConfirm={confirmDeleteUpdate}
      />

      {/* ================= ENHANCED EMOJI PICKER ================= */}
      <Modal
        visible={emojiPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmojiPickerVisible(false)}
      >
        <Pressable
          style={tw`flex-1 bg-black/50 justify-center items-center px-4`}
          onPress={() => setEmojiPickerVisible(false)}
        >
          <Pressable
            onPress={() => { }}
            style={{
              width: "100%",
              maxWidth: 440,
              height: 560,
              backgroundColor: "#FFFFFF",
              borderRadius: 32,
              paddingTop: 22,
              paddingHorizontal: 20,
              paddingBottom: 12,
              shadowColor: "#6A1B9A",
              shadowOpacity: 0.18,
              shadowRadius: 30,
              elevation: 25,
            }}
          >

            {/* ================= HEADER ================= */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 18,
                  color: "#6A1B9A",
                }}
              >
                React
              </Text>

              <TouchableOpacity
                onPress={() => setEmojiPickerVisible(false)}
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 20,
                  padding: 6,
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* ================= CATEGORY BAR (FIXED HEIGHT) ================= */}
            <View style={{ height: 50 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={REACTION_CATEGORIES}
                keyExtractor={(item) => item.key}
                contentContainerStyle={{ alignItems: "center" }}
                renderItem={({ item, index }) => {
                  const isActive = activeCategory === item.key;

                  return (
                    <Pressable
                      onPress={() => setActiveCategory(item.key)}
                      style={({ pressed }) => [
                        {
                          minWidth: 95,
                          height: 36,
                          paddingHorizontal: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: isActive ? "#6A1B9A" : "#FFFFFF",
                          borderWidth: 1,
                          borderColor: isActive ? "#6A1B9A" : "#E5E7EB",
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins-Medium",
                          fontSize: 13,
                          color: isActive ? "#FFFFFF" : "#374151",
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* ================= DIVIDER ================= */}
            <View
              style={{
                height: 1,
                backgroundColor: "#F3E8FF",
                marginBottom: 10,
              }}
            />

            {/* ================= EMOJI GRID (SCROLLABLE AREA) ================= */}
            {/* ✅ FIXED: Proper layout containment with flex:1 */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: EMOJI_GRID_WIDTH,
                    flex: 1, // 🔥 IMPORTANT: Forces the container to respect parent height
                  }}
                  onTouchStart={(e) => {
                    touchStartX.current = e.nativeEvent.pageX;
                  }}
                  onTouchEnd={(e) => {
                    const diff = e.nativeEvent.pageX - touchStartX.current;
                    if (diff > 50) handleSwipe("right");
                    if (diff < -50) handleSwipe("left");
                  }}
                >
                  <FlatList
                    style={{ flex: 1 }} // 🔥 IMPORTANT: Makes FlatList scrollable within constrained space
                    contentContainerStyle={{ paddingBottom: 12 }}
                    data={
                      REACTION_CATEGORIES.find(
                        (c) => c.key === activeCategory
                      )?.emojis || []
                    }
                    numColumns={7}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={{
                      justifyContent: "flex-start",
                    }}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => {
                          const targetId = selectedUpdate?._id || selectedReactionUpdate?._id;
                          handleReaction(targetId, item);

                          setEmojiPickerVisible(false);
                        }}
                        style={({ pressed }) => ({
                          width: 44,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 6,
                          marginBottom: 8,
                          borderRadius: 14,
                          backgroundColor: pressed ? "#F3E8FF" : "transparent",
                          transform: [{ scale: pressed ? 0.92 : 1 }],
                        })}
                      >
                        {/* 🔥 Reduced Emoji Size */}
                        <Text style={{ fontSize: 22 }}>{item}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              </View>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      {/* 🟣 REACTION DETAILS MODAL - Styled exactly like GroupChat */}
      <Modal
        visible={reactionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReactionModal}
      >
        <View style={tw`flex-1 bg-black/40`}>
          <Pressable
            style={tw`flex-1`}
            onPress={closeReactionModal}
          />

          <View
            style={[
              tw`bg-white rounded-t-3xl pt-6 px-4`,
              { height: REACTION_SHEET_HEIGHT }  // 🔥 IMPORTANT
            ]}
          >

            {/* Header - FIX 3: Added total count */}
            <View style={tw`flex-row items-center justify-between mb-6`}>
              <View>
                <Text
                  style={{
                    fontFamily: "Poppins-Bold",
                    fontSize: 20,
                    color: "#111827",
                  }}
                >
                  Reactions
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                >
                  {formatCount(getTotalReactions(selectedReactionUpdate?.reactions))} total
                </Text>
              </View>
              <TouchableOpacity onPress={closeReactionModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Reaction List - FIX 1: Using flattenedReactions */}
            <FlatList
              style={tw`flex-1`}
              data={flattenedReactions}
              keyExtractor={(item, index) => `reaction-${item.user?._id || item.user}-${item.emoji}-${index}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const reactionUserId = String(item.user?._id || item.user);
                const isMine = reactionUserId === myId;

                return (
                  <Pressable
                    onPress={() => {
                      if (isMine) {
                        // FIX 4 & 5: Pass emoji instead of null for toggle removal
                        const updateId = selectedReactionUpdate?._id;
                        const emoji = item.emoji;

                        closeReactionModal();
                        setTimeout(() => {
                          handleReaction(updateId, emoji);
                        }, 250);
                      }
                    }}
                    style={tw`flex-row items-center justify-between py-3 border-b border-gray-100`}
                  >
                    <View style={tw`flex-row items-center flex-1`}>
                      <Text style={tw`text-2xl mr-4`}>{item.emoji}</Text>

                      <View style={tw`flex-row items-center flex-1`}>
                        <Image
                          source={
                            getUserAvatar(item.user)
                              ? { uri: getUserAvatar(item.user) }
                              : {
                                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  getUserFullName(item.user)
                                )}&background=6A1B9A&color=fff`
                              }
                          }
                          style={tw`w-12 h-12 rounded-full mr-4 bg-gray-200`}
                        />

                        <View style={tw`flex-1`}>
                          <Text
                            style={{
                              fontFamily: "Poppins-SemiBold",
                              fontSize: 16,
                              color: "#111827",
                            }}
                          >
                            {getUserFullName(item.user)}
                          </Text>

                          {!!item.createdAt && (
                            <Text
                              style={{
                                fontFamily: "Poppins-Regular",
                                fontSize: 13,
                                color: "#6B7280",
                                marginTop: 2,
                              }}
                            >
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {isMine && (
                      <TouchableOpacity
                        onPress={() => {
                          if (!isMine) return;

                          const updateId = selectedReactionUpdate?._id;
                          const emoji = item.emoji;

                          closeReactionModal();

                          setTimeout(() => {
                            handleReaction(updateId, emoji);
                          }, 250);
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins-Medium",
                            fontSize: 14,
                            color: "#DC2626",
                          }}
                        >
                          Tap to remove
                        </Text>
                      </TouchableOpacity>
                    )}

                  </Pressable>
                );
              }}

              ListEmptyComponent={
                <View style={tw`py-8 items-center`}>
                  <Text
                    style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 16,
                      color: "#6B7280",
                    }}
                  >
                    No reactions yet
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );

  // Conditionally wrap with TouchableWithoutFeedback for native platforms
  if (Platform.OS !== "web") {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // For web, return without the TouchableWithoutFeedback wrapper
  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
    </View>
  );
}