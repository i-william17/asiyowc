import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createPost, fetchFeed } from '../../store/slices/postSlice';
import axios from 'axios';
import { server } from '../../server';
import { Video, Audio, AVPlaybackStatus } from 'expo-av';
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const POST_TYPES = [
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'videocam' },
  { id: 'link', label: 'Link', icon: 'link' }
];

const VISIBILITY = [
  { id: 'public', label: 'Public', icon: 'earth' },
  { id: 'group', label: 'Group', icon: 'people' },
  { id: 'hub', label: 'Hub', icon: 'business' }
];

// File size limits in bytes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB

const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Animated Circular Progress Component
const CircularProgress = ({ progress, size = 80, strokeWidth = 6, success = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const spinValue = new Animated.Value(0);

  useEffect(() => {
    if (!success && progress > 0 && progress < 100) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.stopAnimation();
    }
  }, [progress, success]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={success ? "#10B981" : "#FFD700"}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Animated Ring Effect during upload */}
      {!success && progress > 0 && progress < 100 && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            borderWidth: 2,
            borderColor: 'rgba(255, 215, 0, 0.3)',
            borderStyle: 'dashed',
            transform: [{ rotate: spin }]
          }}
        />
      )}
      
      {/* Icon/Checkmark in center */}
      <View style={{
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: size,
        height: size
      }}>
        {success ? (
          <Ionicons name="checkmark-circle" size={size * 0.5} color="#10B981" />
        ) : progress === 0 ? (
          <Ionicons name="cloud-upload-outline" size={size * 0.4} color="#6B7280" />
        ) : progress < 100 ? (
          <Ionicons name="sync" size={size * 0.4} color="#FFD700" />
        ) : null}
      </View>
    </View>
  );
};

const CreatePostModal = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.posts);
  const videoRef = useRef(null);

  const [type, setType] = useState('text');
  const [visibility, setVisibility] = useState('public');
  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [media, setMedia] = useState(null);

  const [groups, setGroups] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedHubs, setSelectedHubs] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const MAX_CAPTION_LENGTH = 500;

  // Progress Modal States
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressStatus, setProgressStatus] = useState({
    progress: 0,
    message: 'Creating your post...',
    success: false,
    completed: false
  });

  // Video player states
  const [videoStatus, setVideoStatus] = useState({
    isPlaying: false,
    isMuted: false,
    duration: 0,
    position: 0,
    isBuffering: false
  });

  const compressImage = async (uri) => {
    // 🌐 WEB: browser already optimizes images
    if (Platform.OS === 'web') {
      return uri;
    }

    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (err) {
      console.error("Image compression failed:", err);
      throw new Error("Failed to compress image");
    }
  };

  /* ================= SNACKBAR ================= */
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info'
  });

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => {
      setSnackbar({ visible: false, message: '', type: 'info' });
    }, 3000);
  };

  /* ================= PROGRESS MODAL FUNCTIONS ================= */
  const startProgressModal = () => {
    setProgressStatus({
      progress: 0,
      message: 'Creating your post...',
      success: false,
      completed: false
    });
    setProgressModalVisible(true);
  };

  const updateProgressModal = (progress, message = null) => {
    setProgressStatus(prev => ({
      ...prev,
      progress,
      message: message || prev.message
    }));
  };

  const completeProgressModal = () => {
    setProgressStatus(prev => ({
      ...prev,
      progress: 100,
      message: 'Post created successfully!',
      success: true,
      completed: true
    }));

    // Wait 1 second then close modal and redirect
    setTimeout(() => {
      setProgressModalVisible(false);
      resetAndClose();
    }, 1000);
  };

  /* ================= LOAD GROUPS & HUBS ================= */
  useEffect(() => {
    if (visible) {
      loadGroups();
      loadHubs();
    }
  }, [visible]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!mounted) return;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Audio mode error:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ================= VIDEO PLAYER FUNCTIONS ================= */
  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (videoStatus.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const handleMuteUnmute = async () => {
    if (!videoRef.current) return;

    await videoRef.current.setIsMutedAsync(!videoStatus.isMuted);
    setVideoStatus(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleVideoPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;

    setVideoStatus({
      isPlaying: status.isPlaying,
      isMuted: status.isMuted,
      duration: status.durationMillis || 0,
      position: status.positionMillis || 0,
      isBuffering: status.isBuffering
    });

    if (status.didJustFinish && videoRef.current) {
      videoRef.current.setPositionAsync(0);
      setVideoStatus(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const handleSeek = async (value) => {
    if (!videoRef.current) return;

    const newPosition = value * videoStatus.duration;
    await videoRef.current.setPositionAsync(newPosition);
  };

  const handleResetVideo = () => {
    if (videoRef.current) {
      videoRef.current.stopAsync();
      setVideoStatus({
        isPlaying: false,
        isMuted: false,
        duration: 0,
        position: 0,
        isBuffering: false
      });
    }
  };

  /* ================= CLEANUP ON MEDIA REMOVAL OR TYPE CHANGE ================= */
  useEffect(() => {
    if (type !== 'video' || !media) {
      handleResetVideo();
    }
  }, [type, media]);

  /* ================= CLEANUP ON MODAL CLOSE ================= */
  useEffect(() => {
    return () => {
      handleResetVideo();
    };
  }, []);

  const getFileSize = async (asset) => {
    // ✅ Web: use browser file object
    if (Platform.OS === 'web') {
      return asset.file?.size ?? 0;
    }

    // ✅ Native: use FileSystem
    const info = await FileSystem.getInfoAsync(asset.uri);
    return info.size ?? 0;
  };

  const loadGroups = async () => {
    try {
      const res = await axios.get(`${server}/community/groups/mine`);
      setGroups(res.data.data || []);
    } catch {
      showSnackbar('Failed to load groups', 'error');
    }
  };

  const loadHubs = async () => {
    try {
      const res = await axios.get(`${server}/community/hubs/mine`);
      setHubs(res.data.data || []);
    } catch {
      showSnackbar('Failed to load hubs', 'error');
    }
  };

  /* ================= MEDIA PICK WITH SIZE VALIDATION ================= */
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: type === "image",
      aspect: [4, 3],
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    let fileSize = 0;

    try {
      // 🌐 WEB: browser file object
      if (Platform.OS === "web") {
        fileSize = asset.file?.size ?? asset.fileSize ?? 0;
      }
      // 📱 NATIVE
      else {
        const info = await FileSystem.getInfoAsync(asset.uri);
        fileSize = info.size ?? 0;
      }
    } catch (err) {
      console.error("File size check failed:", err);
      showSnackbar("Failed to check file size", "error");
      return;
    }

    if (type === "image" && fileSize > MAX_IMAGE_SIZE) {
      showSnackbar("Image size exceeds 5 MB limit", "error");
      return;
    }

    if (type === "video" && fileSize > MAX_VIDEO_SIZE) {
      showSnackbar("Video size exceeds 20 MB limit", "error");
      return;
    }

    // 🎥 VIDEO (no compression)
    if (type === "video") {
      setMedia({
        uri: asset.uri,
        type: asset.mimeType || "video/mp4",
        name: asset.fileName || `video-${Date.now()}.mp4`,
        size: fileSize,
      });

      // Reset video player state for new video
      setVideoStatus({
        isPlaying: false,
        isMuted: false,
        duration: 0,
        position: 0,
        isBuffering: false
      });

      showSnackbar("Video selected", "info");
      return;
    }

    // 🖼 IMAGE (compress only on native)
    try {
      showSnackbar("Optimizing image…", "info");

      const finalUri =
        Platform.OS === "web"
          ? asset.uri
          : await compressImage(asset.uri);

      const finalSize =
        Platform.OS === "web"
          ? fileSize
          : (await FileSystem.getInfoAsync(finalUri)).size;

      if (finalSize > MAX_IMAGE_SIZE) {
        showSnackbar("Compressed image still exceeds 5 MB", "error");
        return;
      }

      setMedia({
        uri: finalUri,
        type: "image/jpeg",
        name: asset.fileName || `image-${Date.now()}.jpg`,
        size: finalSize,
      });

      showSnackbar("Image optimized", "success");
    } catch (err) {
      console.error("Image compression failed:", err);
      showSnackbar("Image compression failed", "error");
    }
  };

  const removeMedia = () => {
    handleResetVideo();
    setMedia(null);
    showSnackbar('Media removed', 'info');
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    // ================= VALIDATION =================
    if ((type === 'text' || type === 'image' || type === 'video') && !text.trim()) {
      showSnackbar('Caption cannot be empty', 'error');
      return;
    }

    if (text.length > MAX_CAPTION_LENGTH) {
      showSnackbar(`Caption cannot exceed ${MAX_CAPTION_LENGTH} characters`, 'error');
      return;
    }

    if ((type === 'image' || type === 'video') && !media) {
      showSnackbar(`Please select a ${type}`, 'error');
      return;
    }

    if (type === 'link') {
      if (!linkUrl.trim()) {
        showSnackbar('Please enter a link', 'error');
        return;
      }

      try {
        new URL(linkUrl);
      } catch {
        showSnackbar('Please enter a valid URL', 'error');
        return;
      }
    }

    if (visibility === 'group' && selectedGroups.length === 0) {
      showSnackbar('Select at least one group', 'error');
      return;
    }

    if (visibility === 'hub' && selectedHubs.length === 0) {
      showSnackbar('Select at least one hub', 'error');
      return;
    }

    // ================= START PROGRESS MODAL =================
    startProgressModal();

    try {
      // Simulate initial processing
      updateProgressModal(10, 'Processing your post...');

      // ================= FINAL MEDIA SIZE VALIDATION =================
      if (media) {
        try {
          let size = media.size ?? 0;

          if (!size && Platform.OS !== 'web') {
            const info = await FileSystem.getInfoAsync(media.uri);
            size = info.size ?? 0;
          }

          if (type === 'image' && size > MAX_IMAGE_SIZE) {
            updateProgressModal(0, 'Image too large');
            setTimeout(() => {
              setProgressModalVisible(false);
              showSnackbar('Image size exceeds 5 MB limit', 'error');
            }, 1000);
            return;
          }

          if (type === 'video' && size > MAX_VIDEO_SIZE) {
            updateProgressModal(0, 'Video too large');
            setTimeout(() => {
              setProgressModalVisible(false);
              showSnackbar('Video size exceeds 20 MB limit', 'error');
            }, 1000);
            return;
          }
        } catch (err) {
          console.error('Final size validation failed:', err);
          updateProgressModal(0, 'Validation failed');
          setTimeout(() => {
            setProgressModalVisible(false);
            showSnackbar('Failed to validate media size', 'error');
          }, 1000);
          return;
        }
      }

      // Simulate preparation
      updateProgressModal(30, 'Preparing upload...');

      // ================= DISPATCH CREATE POST =================
      const result = await dispatch(
        createPost({
          payload: {
            type,
            visibility,
            content: {
              text,
              linkUrl,
            },
            sharedTo:
              visibility === 'public'
                ? undefined
                : {
                  groups: selectedGroups,
                  hubs: selectedHubs,
                },
            media,
          },
          onProgress: (percent) => {
            // Map 0-100 to 40-90 range to account for pre/post processing
            const mappedProgress = 40 + (percent * 0.5);
            updateProgressModal(mappedProgress, 'Uploading media...');
          },
        })
      );

      // Check if dispatch was successful
      if (result?.error) {
        updateProgressModal(0, 'Post creation failed');
        setTimeout(() => {
          setProgressModalVisible(false);
          showSnackbar('Failed to create post', 'error');
        }, 1000);
        return;
      }

      // Simulate final processing
      updateProgressModal(95, 'Finalizing...');

      // ================= REFRESH FEED =================
      dispatch(fetchFeed());

      // Complete with success
      completeProgressModal();

    } catch (error) {
      console.error('Post creation error:', error);
      updateProgressModal(0, 'An error occurred');
      setTimeout(() => {
        setProgressModalVisible(false);
        showSnackbar('Failed to create post', 'error');
      }, 1000);
    }
  };

  const resetAndClose = () => {
    handleResetVideo();
    setText('');
    setLinkUrl('');
    setMedia(null);
    setSelectedGroups([]);
    setSelectedHubs([]);
    setVisibility('public');
    setType('text');
    setUploadProgress(0);
    setVideoStatus({
      isPlaying: false,
      isMuted: false,
      duration: 0,
      position: 0,
      isBuffering: false
    });
    onClose();
  };

  return (
    <>
      {/* MAIN CREATE POST MODAL */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* HEADER */}
          <View
            style={{
              paddingTop: 60,
              paddingBottom: 24,
              paddingHorizontal: 20,
              backgroundColor: "#6A1B9A",
              borderBottomLeftRadius: 35,
              borderBottomRightRadius: 35,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 8,
            }}
          >
            {/* Title */}
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 22,
                color: "#FFFFFF",
              }}
            >
              Create Post
            </Text>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "#FFD700",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={22} color="#6A1B9A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* POST TYPE SELECTOR */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 14,
                color: '#6B7280',
                marginBottom: 12,
                letterSpacing: 0.5
              }}>
                POST TYPE
              </Text>
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2
              }}>
                {POST_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setType(t.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: type === t.id ? '#6A1B9A' : 'transparent',
                      marginHorizontal: 4
                    }}
                  >
                    <Ionicons
                      name={t.icon}
                      size={16}
                      color={type === t.id ? '#FFFFFF' : '#9CA3AF'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{
                      fontFamily: 'Poppins-Medium',
                      fontSize: 13,
                      color: type === t.id ? '#FFFFFF' : '#6B7280'
                    }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CONTENT AREA */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2
            }}>
              {/* TEXT INPUT */}
              {(type === 'text' || type === 'image' || type === 'video') && (
                <>
                  <TextInput
                    value={text}
                    onChangeText={(value) => {
                      if (value.length <= MAX_CAPTION_LENGTH) {
                        setText(value);
                      }
                    }}
                    placeholder="What would you like to share?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={MAX_CAPTION_LENGTH}
                    style={{
                      fontFamily: 'Poppins-Regular',
                      fontSize: 15,
                      color: '#111827',
                      minHeight: 120,
                      lineHeight: 22
                    }}
                  />
                  <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                    <Text
                      style={{
                        fontFamily: 'Poppins-Medium',
                        fontSize: 12,
                        color: text.length >= MAX_CAPTION_LENGTH
                          ? '#DC2626'
                          : '#6B7280'
                      }}
                    >
                      {text.length}/{MAX_CAPTION_LENGTH}
                    </Text>
                  </View>

                </>
              )}

              {/* LINK INPUT */}
              {type === 'link' && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: '#F9FAFB'
                }}>
                  <Ionicons name="link" size={20} color="#6A1B9A" style={{ marginRight: 12 }} />
                  <TextInput
                    value={linkUrl}
                    onChangeText={setLinkUrl}
                    placeholder="Paste your link here..."
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 1,
                      fontFamily: 'Poppins-Regular',
                      fontSize: 15,
                      color: '#111827'
                    }}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* MEDIA PREVIEW */}
              {media && (
                <View style={{ marginTop: 20 }}>
                  {type === 'video' ? (
                    <View style={{ position: 'relative' }}>
                      <Video
                        ref={videoRef}
                        source={{ uri: media.uri }}
                        style={{
                          width: '100%',
                          aspectRatio: 16 / 9,
                          borderRadius: 12,
                          backgroundColor: '#000'
                        }}
                        resizeMode="contain"
                        useNativeControls={false}
                        shouldPlay={videoStatus.isPlaying}
                        isMuted={videoStatus.isMuted}
                        volume={1.0}
                        onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
                      />

                      {/* Video Overlay Controls */}
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16
                      }}>
                        {/* Seek Bar */}
                        <Slider
                          style={{ width: '100%', height: 20 }}
                          minimumValue={0}
                          maximumValue={1}
                          value={videoStatus.duration > 0 ? videoStatus.position / videoStatus.duration : 0}
                          onSlidingComplete={handleSeek}
                          minimumTrackTintColor="#6A1B9A"
                          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                          thumbTintColor="#6A1B9A"
                          thumbStyle={{ width: 16, height: 16 }}
                        />

                        {/* Controls Row */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 8
                        }}>
                          {/* Left: Time & Play/Pause */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <TouchableOpacity
                              onPress={handlePlayPause}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12
                              }}
                            >
                              <Ionicons
                                name={videoStatus.isPlaying ? 'pause' : 'play'}
                                size={20}
                                color="#6A1B9A"
                              />
                            </TouchableOpacity>

                            <Text style={{
                              fontFamily: 'Poppins-Regular',
                              fontSize: 13,
                              color: '#FFFFFF'
                            }}>
                              {formatTime(videoStatus.position)} / {formatTime(videoStatus.duration)}
                            </Text>
                          </View>

                          {/* Right: Mute & Loading */}
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {videoStatus.isBuffering && (
                              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 12 }} />
                            )}

                            <TouchableOpacity
                              onPress={handleMuteUnmute}
                              style={{
                                padding: 6
                              }}
                            >
                              <Ionicons
                                name={videoStatus.isMuted ? 'volume-mute' : 'volume-high'}
                                size={22}
                                color="#FFFFFF"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity
                        onPress={removeMedia}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: media.uri }}
                        style={{
                          width: '100%',
                          height: 200,
                          borderRadius: 12,
                          backgroundColor: '#F3F4F6'
                        }}
                        resizeMode="cover"
                      />

                      <TouchableOpacity
                        onPress={removeMedia}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* MEDIA UPLOAD BUTTON */}
              {(type === 'image' || type === 'video') && !media && (
                <TouchableOpacity
                  onPress={pickMedia}
                  style={{
                    marginTop: 16,
                    borderWidth: 2,
                    borderColor: '#E5E7EB',
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 24,
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB'
                  }}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#6A1B9A',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                    <Ionicons
                      name={type === 'video' ? 'videocam' : 'image'}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={{
                    fontFamily: 'Poppins-Medium',
                    fontSize: 15,
                    color: '#111827',
                    marginBottom: 4
                  }}>
                    Add {type === 'video' ? 'Video' : 'Image'}
                  </Text>
                  <Text style={{
                    fontFamily: 'Poppins-Regular',
                    fontSize: 13,
                    color: '#6B7280',
                    textAlign: 'center'
                  }}>
                    {type === 'video'
                      ? 'MP4, MOV up to 20MB'
                      : 'JPG, PNG up to 5MB'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* VISIBILITY SELECTOR */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 14,
                color: '#6B7280',
                marginBottom: 12,
                letterSpacing: 0.5
              }}>
                VISIBILITY
              </Text>
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2
              }}>
                {VISIBILITY.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setVisibility(v.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: visibility === v.id ? '#111827' : 'transparent',
                      marginHorizontal: 4
                    }}
                  >
                    <Ionicons
                      name={v.icon}
                      size={16}
                      color={visibility === v.id ? '#FFFFFF' : '#9CA3AF'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{
                      fontFamily: 'Poppins-Medium',
                      fontSize: 13,
                      color: visibility === v.id ? '#FFFFFF' : '#6B7280'
                    }}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* GROUPS SELECTION */}
            {visibility === 'group' && groups.length > 0 && (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2
              }}>
                <Text style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 16,
                  color: '#111827',
                  marginBottom: 16
                }}>
                  Select Groups
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {groups.map(g => (
                    <TouchableOpacity
                      key={g._id}
                      onPress={() =>
                        setSelectedGroups(prev =>
                          prev.includes(g._id)
                            ? prev.filter(id => id !== g._id)
                            : [...prev, g._id]
                        )
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        backgroundColor: selectedGroups.includes(g._id) ? '#6A1B9A' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: selectedGroups.includes(g._id) ? '#6A1B9A' : '#E5E7EB'
                      }}
                    >
                      {selectedGroups.includes(g._id) && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      )}
                      <Text style={{
                        fontFamily: 'Poppins-Medium',
                        fontSize: 13,
                        color: selectedGroups.includes(g._id) ? '#FFFFFF' : '#4B5563'
                      }}>
                        {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* HUBS SELECTION */}
          {visibility === 'hub' && hubs.length > 0 && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2
            }}>
              <Text style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 16,
                color: '#111827',
                marginBottom: 16
              }}>
                Select Hubs
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {hubs.map(h => (
                  <TouchableOpacity
                    key={h._id}
                    onPress={() =>
                      setSelectedHubs(prev =>
                        prev.includes(h._id)
                          ? prev.filter(id => id !== h._id)
                          : [...prev, h._id]
                      )
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      backgroundColor: selectedHubs.includes(h._id) ? '#111827' : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: selectedHubs.includes(h._id) ? '#111827' : '#E5E7EB'
                    }}
                  >
                    {selectedHubs.includes(h._id) && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={{
                      fontFamily: 'Poppins-Medium',
                      fontSize: 13,
                      color: selectedHubs.includes(h._id) ? '#FFFFFF' : '#4B5563'
                    }}>
                      {h.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
            <TouchableOpacity
              onPress={resetAndClose}
              style={{
                flex: 1,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                alignItems: 'center'
              }}
            >
              <Text style={{
                fontFamily: 'Poppins-SemiBold',
                fontSize: 15,
                color: '#4B5563'
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || progressModalVisible}
              style={{
                flex: 1,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: '#6A1B9A',
                alignItems: 'center',
                opacity: loading || progressModalVisible ? 0.7 : 1
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{
                  fontFamily: 'Poppins-SemiBold',
                  fontSize: 15,
                  color: '#FFFFFF'
                }}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* SNACKBAR */}
        {snackbar.visible && (
          <View style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            right: 20,
            backgroundColor:
              snackbar.type === 'success'
                ? '#059669'
                : snackbar.type === 'error'
                  ? '#DC2626'
                  : '#111827',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {snackbar.type === 'success' && (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              {snackbar.type === 'error' && (
                <Ionicons name="alert-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              {snackbar.type === 'info' && (
                <Ionicons name="information-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 14,
                color: '#FFFFFF',
                flex: 1
              }}>
                {snackbar.message}
              </Text>
            </View>
          </View>
        )}
      </View>
      </Modal>

      {/* PROGRESS OVERLAY MODAL */}
      <Modal
        visible={progressModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 40,
            alignItems: 'center',
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Circular Progress Indicator */}
            <CircularProgress 
              progress={progressStatus.progress} 
              success={progressStatus.success}
              size={100}
              strokeWidth={8}
            />

            {/* Progress Text */}
            <Text style={{
              fontFamily: 'Poppins-SemiBold',
              fontSize: 20,
              color: '#111827',
              marginTop: 24,
              marginBottom: 8,
              textAlign: 'center'
            }}>
              {progressStatus.message}
            </Text>

            {/* Progress Percentage */}
            {!progressStatus.success && (
              <Text style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 16,
                color: '#6B7280',
                marginTop: 8
              }}>
                {Math.round(progressStatus.progress)}%
              </Text>
            )}

            {/* Status Description */}
            <Text style={{
              fontFamily: 'Poppins-Regular',
              fontSize: 14,
              color: '#6B7280',
              marginTop: 16,
              textAlign: 'center',
              lineHeight: 20
            }}>
              {progressStatus.success
                ? 'Your post is now live! Redirecting to feed...'
                : progressStatus.progress < 30
                  ? 'Preparing your content...'
                  : progressStatus.progress < 70
                    ? 'Uploading media...'
                    : 'Finalizing your post...'}
            </Text>

            {/* Cancel Button (only during upload) */}
            {!progressStatus.success && progressStatus.progress < 100 && (
              <TouchableOpacity
                onPress={() => {
                  setProgressModalVisible(false);
                  showSnackbar('Post creation cancelled', 'info');
                }}
                style={{
                  marginTop: 24,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12
                }}
              >
                <Text style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 14,
                  color: '#6B7280'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CreatePostModal;