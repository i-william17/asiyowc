import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Video } from 'expo-av';
import * as Network from 'expo-network';

const PostCard = ({
  post,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onReport,
  isVisible = true
}) => {
  const { user } = useSelector(state => state.auth);
  const [menuVisible, setMenuVisible] = useState(false);

  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isWifi, setIsWifi] = useState(false);

  const isOwner = user?.id === post.author?._id;
  const hasLiked = post.userHasLiked;

  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info'
  });

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => {
      setSnackbar({ visible: false, message: '', type: 'info' });
    }, 2800);
  };

  useEffect(() => {
    (async () => {
      const state = await Network.getNetworkStateAsync();
      setIsWifi(
        state.isConnected &&
        state.type === Network.NetworkStateType.WIFI
      );
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
        elevation: 4
      }}
    >
      {/* ================= HEADER ================= */}
      {/* ================= HEADER ================= */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        {/* Avatar */}
        <Image
          source={{
            uri: post.author?.avatar || 'https://ui-avatars.com/api/?name=user'
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#e5e7eb'
          }}
        />

        {/* Name + Time */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontFamily: 'Poppins-SemiBold',
              fontSize: 15,
              color: '#111827'
            }}
            numberOfLines={1}
          >
            {post.author?.name}
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Regular',
              fontSize: 12,
              color: '#6b7280',
              marginTop: 2
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
            borderRadius: 20
          }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>


      {/* ================= CONTENT ================= */}
      {post.content?.text && (
        <Text
          style={{
            marginTop: 14,
            fontFamily: 'Poppins-Regular',
            fontSize: 15,
            lineHeight: 23,
            color: '#1f2937'
          }}
        >
          {post.content.text}
        </Text>
      )}

      {/* ================= IMAGE ================= */}
      {post.type === 'image' && post.content?.imageUrl && (
        <Image
          source={{ uri: post.content.imageUrl }}
          style={{
            width: '100%',
            height: 230,
            borderRadius: 16,
            marginTop: 14,
            backgroundColor: '#f3f4f6'
          }}
        />
      )}

      {/* ================= VIDEO ================= */}
      {post.type === 'video' && post.content?.imageUrl && (
        <View style={{ marginTop: 14 }}>
          <Video
            ref={videoRef}
            source={{ uri: post.content.imageUrl }}
            style={{
              width: '100%',
              height: 250,
              borderRadius: 16,
              backgroundColor: '#000'
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
                alignItems: 'center'
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
              padding: 9
            }}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ================= ACTIONS ================= */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 12
        }}
      >
        <TouchableOpacity
          onPress={() => {
            onLike();
            showSnackbar(hasLiked ? 'Like removed' : 'Post liked', 'success');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 30
          }}
        >
          <Ionicons
            name={hasLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={hasLiked ? '#dc2626' : '#374151'}
          />
          <Text
            style={{
              marginLeft: 6,
              fontFamily: 'Poppins-Medium',
              fontSize: 14,
              color: '#374151'
            }}
          >
            {post.reactionsCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onComment}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="chatbubble-outline" size={21} color="#374151" />
          <Text
            style={{
              marginLeft: 6,
              fontFamily: 'Poppins-Medium',
              fontSize: 14,
              color: '#374151'
            }}
          >
            {post.commentsCount || 0}
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
            justifyContent: 'flex-end'
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingVertical: 8
            }}
          >
            {isOwner && (
              <MenuItem
                icon="create-outline"
                label="Edit Post"
                onPress={() => {
                  setMenuVisible(false);
                  onEdit(post);
                  showSnackbar('Edit mode opened', 'info');
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
                  onDelete(post._id);
                  showSnackbar('Post deleted', 'success');
                }}
              />
            )}
            {!isOwner && (
              <MenuItem
                icon="flag-outline"
                label="Report Post"
                danger
                onPress={() => {
                  setMenuVisible(false);
                  onReport(post._id);
                  showSnackbar('Post reported', 'info');
                }}
              />
            )}
            <MenuItem
              icon="close-outline"
              label="Cancel"
              onPress={() => setMenuVisible(false)}
            />
          </View>
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
            alignItems: 'center'
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 13,
              fontFamily: 'Poppins-Medium'
            }}
          >
            {snackbar.message}
          </Text>
        </View>
      )}
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
      paddingHorizontal: 22
    }}
  >
    <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#111827'} />
    <Text
      style={{
        marginLeft: 14,
        fontFamily: 'Poppins-Medium',
        fontSize: 15,
        color: danger ? '#dc2626' : '#111827'
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default PostCard;
