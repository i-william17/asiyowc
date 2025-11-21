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
import { createPost } from '../../store/slices/feedSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const CreatePostModal = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState('general');

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
    { id: 'general', name: 'General', icon: '🌍', color: '#6B7280' },
    { id: 'leadership', name: 'Leadership', icon: '👑', color: '#8B5CF6' },
    { id: 'finance', name: 'Finance', icon: '💰', color: '#10B981' },
    { id: 'wellness', name: 'Wellness', icon: '🌿', color: '#059669' },
    { id: 'advocacy', name: 'Advocacy', icon: '📢', color: '#EF4444' },
    { id: 'legacy', name: 'Legacy', icon: '🌟', color: '#F59E0B' },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePost = async (data) => {
    if (!data.content.trim()) {
      Alert.alert('Error', 'Please write something to share');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        content: data.content,
        category,
        image: image || undefined,
      };

      await dispatch(createPost(postData)).unwrap();
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
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
          disabled={!content?.trim()}
        />
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Content Input */}
        <View style={tw`p-4`}>
          <Controller
            control={control}
            rules={{
              required: 'Post content is required',
              maxLength: {
                value: 5000,
                message: 'Post is too long'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  tw`text-lg text-gray-900 min-h-40`,
                  errors.content && tw`border-red-500`
                ]}
                placeholder="Share your thoughts, experiences, or insights with the community..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            )}
            name="content"
          />
          {errors.content && (
            <Text style={tw`text-red-500 text-sm mt-1`}>{errors.content.message}</Text>
          )}
          
          <Text style={tw`text-right text-gray-500 text-sm mt-2`}>
            {content?.length || 0}/5000
          </Text>
        </View>

        {/* Image Preview */}
        {image && (
          <View style={tw`px-4 mb-4`}>
            <View style={tw`relative`}>
              <Image
                source={{ uri: image }}
                style={tw`w-full h-64 rounded-2xl`}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={tw`absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2`}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Category Selection */}
        <View style={tw`px-4 mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={tw`flex-row space-x-2`}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    tw`px-4 py-3 rounded-2xl flex-row items-center border-2`,
                    category === cat.id 
                      ? tw`border-purple-500 bg-purple-50` 
                      : tw`border-gray-200 bg-white`
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={tw`mr-2`}>{cat.icon}</Text>
                  <Text style={[
                    tw`font-medium`,
                    category === cat.id ? tw`text-purple-700` : tw`text-gray-700`
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={tw`px-4`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            Add Media
          </Text>
          <View style={tw`flex-row space-x-4`}>
            <TouchableOpacity
              style={tw`flex-1 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 items-center`}
              onPress={pickImage}
            >
              <Ionicons name="image" size={24} color="#6A1B9A" />
              <Text style={tw`text-purple-700 font-medium mt-2`}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`flex-1 bg-gold-50 border-2 border-gold-200 rounded-2xl p-4 items-center`}
              onPress={takePhoto}
            >
              <Ionicons name="camera" size={24} color="#F59E0B" />
              <Text style={tw`text-gold-700 font-medium mt-2`}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreatePostModal;