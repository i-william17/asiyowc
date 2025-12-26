import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createPost } from '../../store/slices/postSlice';
import axios from 'axios';
import { server } from '../../server';

const POST_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Link' }
];

const VISIBILITY = ['public', 'group', 'hub'];

const CreatePostModal = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.posts);

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


  /* ================= SNACKBAR ================= */
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' // success | error | info
  });

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => {
      setSnackbar({ visible: false, message: '', type: 'info' });
    }, 3000);
  };

  /* ================= LOAD GROUPS & HUBS ================= */
  useEffect(() => {
    if (visible) {
      loadGroups();
      loadHubs();
    }
  }, [visible]);

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

  /* ================= MEDIA PICK ================= */
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: asset.fileName || `post-${Date.now()}`
      });
      showSnackbar(`${type} selected`, 'success');
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (type === 'text' && !text.trim()) {
      showSnackbar('Text post cannot be empty', 'error');
      Alert.alert('Text post cannot be empty');
      return;
    }

    if ((type === 'image' || type === 'video') && !media) {
      showSnackbar(`Please select a ${type}`, 'error');
      Alert.alert(`Please select a ${type}`);
      return;
    }

    if (type === 'link' && !linkUrl.trim()) {
      showSnackbar('Please enter a valid link', 'error');
      Alert.alert('Please enter a valid link');
      return;
    }

    if (visibility === 'group' && selectedGroups.length === 0) {
      showSnackbar('Select at least one group', 'error');
      Alert.alert('Select at least one group');
      return;
    }

    if (visibility === 'hub' && selectedHubs.length === 0) {
      showSnackbar('Select at least one hub', 'error');
      Alert.alert('Select at least one hub');
      return;
    }

    await dispatch(
      createPost({
        type,
        visibility,
        content: { text, linkUrl },
        sharedTo:
          visibility === 'public'
            ? undefined
            : { groups: selectedGroups, hubs: selectedHubs },
        media,
        onProgress: percent => setUploadProgress(percent)
      })
    );

    showSnackbar('Post created successfully', 'success');
    resetAndClose();
  };

  const resetAndClose = () => {
    setText('');
    setLinkUrl('');
    setMedia(null);
    setSelectedGroups([]);
    setSelectedHubs([]);
    setVisibility('public');
    setType('text');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
          {/* HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 20 }}>
              Create Post
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} />
            </TouchableOpacity>
          </View>

          {/* TYPE */}
          <Text style={{ marginTop: 20 }}>Post Type</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {POST_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                style={{
                  padding: 10,
                  marginRight: 8,
                  borderRadius: 20,
                  backgroundColor: type === t.id ? '#6A1B9A' : '#eee'
                }}
              >
                <Text style={{ color: type === t.id ? '#fff' : '#333' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TEXT */}
          {(type === 'text' || type === 'image' || type === 'video') && (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write something..."
              multiline
              style={{
                marginTop: 16,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                minHeight: 100
              }}
            />
          )}

          {/* LINK */}
          {type === 'link' && (
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="Paste link..."
              style={{
                marginTop: 16,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12
              }}
            />
          )}

          {/* MEDIA */}
          {(type === 'image' || type === 'video') && (
            <>
              <TouchableOpacity onPress={pickMedia} style={{ marginTop: 16 }}>
                <Text style={{ color: '#6A1B9A' }}>
                  Add {type === 'video' ? 'Video' : 'Image'}
                </Text>
              </TouchableOpacity>

              {media && (
                <Image
                  source={{ uri: media.uri }}
                  style={{ height: 200, borderRadius: 14, marginTop: 10 }}
                />
              )}
            </>
          )}

          {/* VISIBILITY */}
          <Text style={{ marginTop: 24 }}>Visibility</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {VISIBILITY.map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setVisibility(v)}
                style={{
                  padding: 10,
                  marginRight: 8,
                  borderRadius: 20,
                  backgroundColor: visibility === v ? '#111' : '#eee'
                }}
              >
                <Text style={{ color: visibility === v ? '#fff' : '#333' }}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GROUPS */}
          {visibility === 'group' &&
            groups.map(g => (
              <TouchableOpacity
                key={g._id}
                onPress={() =>
                  setSelectedGroups(prev =>
                    prev.includes(g._id)
                      ? prev.filter(id => id !== g._id)
                      : [...prev, g._id]
                  )
                }
              >
                <Text>
                  {selectedGroups.includes(g._id) ? '✓ ' : ''}
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}

          {/* HUBS */}
          {visibility === 'hub' &&
            hubs.map(h => (
              <TouchableOpacity
                key={h._id}
                onPress={() =>
                  setSelectedHubs(prev =>
                    prev.includes(h._id)
                      ? prev.filter(id => id !== h._id)
                      : [...prev, h._id]
                  )
                }
              >
                <Text>
                  {selectedHubs.includes(h._id) ? '✓ ' : ''}
                  {h.name}
                </Text>
              </TouchableOpacity>
            ))}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={{ marginTop: 16 }}>
              <View
                style={{
                  height: 6,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 6,
                  overflow: 'hidden'
                }}
              >
                <View
                  style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#6A1B9A'
                  }}
                />
              </View>

              <Text style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                Uploading… {uploadProgress}%
              </Text>
            </View>
          )}

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSubmit}
            style={{
              marginTop: 30,
              backgroundColor: '#6A1B9A',
              padding: 14,
              borderRadius: 16,
              alignItems: 'center'
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold' }}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* ================= SNACKBAR UI ================= */}
        {snackbar.visible && (
          <View
            style={{
              position: 'absolute',
              bottom: 30,
              left: 20,
              right: 20,
              backgroundColor:
                snackbar.type === 'success'
                  ? '#2e7d32'
                  : snackbar.type === 'error'
                    ? '#c62828'
                    : '#333',
              padding: 14,
              borderRadius: 14,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>
              {snackbar.message}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default CreatePostModal;
