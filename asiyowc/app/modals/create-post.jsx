import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { createPost } from '../../store/slices/postSlice';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const CreatePostModal = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState(null);
  const [category, setCategory] = useState('general');
  const [visibility] = useState('public'); // default (schema-safe)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      content: '',
    }
  });

  const content = watch('content');

  const categories = [
    { id: 'general', name: 'General', icon: '🌍' },
    { id: 'leadership', name: 'Leadership', icon: '👑' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'wellness', name: 'Wellness', icon: '🌿' },
    { id: 'advocacy', name: 'Advocacy', icon: '📢' },
    { id: 'legacy', name: 'Legacy', icon: '🌟' },
  ];

  /* ================= MEDIA PICKERS ================= */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  /* ================= SUBMIT ================= */
  const handlePost = async (data) => {
    if (!data.content.trim() && !media) {
      Alert.alert('Error', 'Please add text or media');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // POST TYPE
      let type = 'text';
      if (media?.type === 'video') type = 'video';
      else if (media) type = 'image';

      formData.append('type', type);
      formData.append('visibility', visibility);

      // CONTENT
      if (data.content) {
        formData.append('content[text]', data.content);
      }

      // CATEGORY (stored as text context)
      if (category) {
        formData.append('content[category]', category);
      }

      // MEDIA
      if (media) {
        formData.append('media', {
          uri: media.uri,
          name: media.fileName || `upload.${media.uri.split('.').pop()}`,
          type: media.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg')
        });
      }

      await dispatch(createPost(formData)).unwrap();
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* HEADER */}
      <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>

        <Text style={tw`text-lg font-semibold text-gray-900`}>Create Post</Text>

        <AnimatedButton
          title="Post"
          onPress={handleSubmit(handlePost)}
          variant="primary"
          size="sm"
          loading={loading}
          disabled={!content?.trim() && !media}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* TEXT INPUT */}
        <View style={tw`p-4`}>
          <Controller
            control={control}
            rules={{ maxLength: 5000 }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={tw`text-lg text-gray-900 min-h-40`}
                placeholder="Share your thoughts…"
                multiline
                value={value}
                onChangeText={onChange}
                textAlignVertical="top"
              />
            )}
            name="content"
          />
          <Text style={tw`text-right text-gray-500 text-sm mt-2`}>
            {content?.length || 0}/5000
          </Text>
        </View>

        {/* MEDIA PREVIEW */}
        {media && (
          <View style={tw`px-4 mb-4`}>
            <Image source={{ uri: media.uri }} style={tw`w-full h-64 rounded-2xl`} />
            <TouchableOpacity
              style={tw`absolute top-2 right-2 bg-black/50 p-2 rounded-full`}
              onPress={() => setMedia(null)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* CATEGORY */}
        <View style={tw`px-4 mb-6`}>
          <Text style={tw`text-lg font-semibold mb-3`}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={tw`flex-row space-x-2`}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    tw`px-4 py-3 rounded-2xl border-2`,
                    category === cat.id
                      ? tw`border-purple-500 bg-purple-50`
                      : tw`border-gray-200`
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text>{cat.icon} {cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* MEDIA BUTTONS */}
        <View style={tw`px-4 pb-10`}>
          <Text style={tw`text-lg font-semibold mb-3`}>Add Media</Text>
          <View style={tw`flex-row space-x-4`}>
            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-2xl bg-purple-50 items-center`}
              onPress={pickImage}
            >
              <Ionicons name="image" size={24} color="#6A1B9A" />
              <Text>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-2xl bg-yellow-50 items-center`}
              onPress={takePhoto}
            >
              <Ionicons name="camera" size={24} color="#F59E0B" />
              <Text>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreatePostModal;
