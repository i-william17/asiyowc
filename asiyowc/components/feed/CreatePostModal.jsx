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
import * as ImageManipulator from "expo-image-manipulator";

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

  const compressImage = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // max width
        {
          compress: 0.7, // 70% quality
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
        type === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: type === "image",
      aspect: [4, 3],
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    // 🎥 VIDEO → compress
    if (type === "video") {
      setMedia({
        uri: asset.uri,
        type: "video/mp4",
        name: asset.fileName || `video-${Date.now()}.mp4`,
      });

      showSnackbar("Video selected (optimized on upload)", "info");
      return;
    }


    // 🖼 IMAGE → compress
    try {
      showSnackbar("Optimizing image…", "info");

      const compressedUri = await compressImage(asset.uri);

      setMedia({
        uri: compressedUri,
        type: "image/jpeg",
        name: asset.fileName || `image-${Date.now()}.jpg`,
      });

      showSnackbar("Image optimized", "success");
    } catch {
      showSnackbar("Image compression failed", "error");
    }
  };

  const removeMedia = () => {
    setMedia(null);
    showSnackbar('Media removed', 'info');
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (type === 'text' && !text.trim()) {
      showSnackbar('Text post cannot be empty', 'error');
      return;
    }

    if ((type === 'image' || type === 'video') && !media) {
      showSnackbar(`Please select a ${type}`, 'error');
      return;
    }

    if (type === 'link' && !linkUrl.trim()) {
      showSnackbar('Please enter a valid link', 'error');
      return;
    }

    if (visibility === 'group' && selectedGroups.length === 0) {
      showSnackbar('Select at least one group', 'error');
      return;
    }

    if (visibility === 'hub' && selectedHubs.length === 0) {
      showSnackbar('Select at least one hub', 'error');
      return;
    }

    await dispatch(
      createPost({
        payload: {
          type,
          visibility,
          content: { text, linkUrl },
          sharedTo:
            visibility === 'public'
              ? undefined
              : { groups: selectedGroups, hubs: selectedHubs },
          media
        },
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
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="What would you like to share?"
                placeholderTextColor="#9CA3AF"
                multiline
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 15,
                  color: '#111827',
                  minHeight: 120,
                  lineHeight: 22
                }}
              />
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
                />
              </View>
            )}

            {/* MEDIA PREVIEW */}
            {media && (
              <View style={{ marginTop: 20, position: 'relative' }}>
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
                  {type === 'video' ? 'MP4, MOV up to 100MB' : 'JPG, PNG up to 10MB'}
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

          {/* UPLOAD PROGRESS */}
          {uploadProgress > 0 && uploadProgress < 100 && (
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 14, color: '#111827' }}>
                  Uploading Media
                </Text>
                <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 14, color: '#6A1B9A' }}>
                  {uploadProgress}%
                </Text>
              </View>
              <View style={{
                height: 6,
                backgroundColor: '#E5E7EB',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <View style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#6A1B9A',
                  borderRadius: 3
                }} />
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
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: '#6A1B9A',
                alignItems: 'center',
                opacity: loading ? 0.7 : 1
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
  );
};

export default CreatePostModal;