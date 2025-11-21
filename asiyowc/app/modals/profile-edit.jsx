import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const ProfileEditModal = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading } = useSelector(state => state.auth);
  
  const [avatar, setAvatar] = useState(user?.avatar);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || '',
      bio: user?.bio || '',
      location: user?.location?.city || '',
    }
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    setUploading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      // Here you would typically upload the image to your server
      // and get back the URL to save in the user's profile
    }
    setUploading(false);
  };

  const handleSave = async (data) => {
    try {
      const profileData = {
        ...data,
        avatar: avatar || user?.avatar,
        location: {
          ...user?.location,
          city: data.location
        }
      };

      await dispatch(updateProfile(profileData)).unwrap();
      router.back();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
        
        <Text style={tw`text-lg font-semibold text-gray-900`}>Edit Profile</Text>
        
        <AnimatedButton
          title="Save"
          onPress={handleSubmit(handleSave)}
          variant="primary"
          size="sm"
          loading={loading}
        />
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={tw`items-center p-6`}>
          <View style={tw`relative`}>
            {uploading ? (
              <View style={tw`w-24 h-24 rounded-full bg-gray-200 items-center justify-center`}>
                <LottieLoader type="loading" size={40} />
              </View>
            ) : (
              <Image
                source={{ uri: avatar || 'https://via.placeholder.com/100' }}
                style={tw`w-24 h-24 rounded-full bg-gray-200`}
              />
            )}
            
            <TouchableOpacity
              style={tw`absolute bottom-0 right-0 bg-purple-500 rounded-full p-2 border-2 border-white`}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={pickImage} style={tw`mt-3`}>
            <Text style={tw`text-purple-500 font-medium`}>
              Change Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={tw`px-6 space-y-4`}>
          <View>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Full Name
            </Text>
            <Controller
              control={control}
              rules={{
                required: 'Full name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base`,
                    errors.fullName && tw`border-red-500`
                  ]}
                  placeholder="Enter your full name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="words"
                />
              )}
              name="fullName"
            />
            {errors.fullName && (
              <Text style={tw`text-red-500 text-sm mt-1`}>{errors.fullName.message}</Text>
            )}
          </View>

          <View>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Bio
            </Text>
            <Controller
              control={control}
              rules={{
                maxLength: {
                  value: 500,
                  message: 'Bio cannot exceed 500 characters'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base min-h-24`,
                    errors.bio && tw`border-red-500`
                  ]}
                  placeholder="Tell us about yourself..."
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
              )}
              name="bio"
            />
            {errors.bio && (
              <Text style={tw`text-red-500 text-sm mt-1`}>{errors.bio.message}</Text>
            )}
          </View>

          <View>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Location
            </Text>
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base`}
                  placeholder="Enter your city"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
              name="location"
            />
          </View>

          {/* Role Display (Read-only) */}
          <View>
            <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
              Role
            </Text>
            <View style={tw`border-2 border-gray-200 rounded-2xl px-4 py-4 bg-gray-50`}>
              <Text style={tw`text-gray-700 capitalize`}>
                {user?.role || 'Not specified'}
              </Text>
            </View>
            <Text style={tw`text-gray-500 text-xs mt-1`}>
              Role cannot be changed
            </Text>
          </View>
        </View>

        {/* Interests Section */}
        <View style={tw`px-6 mt-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-4`}>
            Your Interests
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {user?.interests?.map((interest) => (
              <View
                key={interest}
                style={tw`bg-purple-100 px-3 py-2 rounded-full mr-2 mb-2`}
              >
                <Text style={tw`text-purple-700 text-sm font-medium capitalize`}>
                  {interest}
                </Text>
              </View>
            ))}
          </View>
          <Text style={tw`text-gray-500 text-xs mt-2`}>
            Interests can be updated in settings
          </Text>
        </View>

        <View style={tw`h-8`} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileEditModal;