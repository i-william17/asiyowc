import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const SOSHelpModal = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const emergencyContacts = [
    {
      id: '1',
      name: 'Emergency Services',
      number: '911',
      type: 'emergency',
      icon: 'alert-circle',
      color: '#EF4444',
    },
    {
      id: '2',
      name: 'Asiyo Support Line',
      number: '+254700000000',
      type: 'support',
      icon: 'heart',
      color: '#6A1B9A',
    },
    {
      id: '3',
      name: 'Mental Health Support',
      number: '+254711000000',
      type: 'counseling',
      icon: 'medical',
      color: '#10B981',
    },
    {
      id: '4',
      name: 'Legal Assistance',
      number: '+254722000000',
      type: 'legal',
      icon: 'scale',
      color: '#3B82F6',
    },
  ];

  const resources = [
    {
      id: '1',
      title: 'Safety Planning',
      description: 'Create a personalized safety plan',
      icon: 'shield-checkmark',
      color: '#8B5CF6',
    },
    {
      id: '2',
      title: 'Local Shelters',
      description: 'Find safe shelters near you',
      icon: 'home',
      color: '#F59E0B',
    },
    {
      id: '3',
      title: 'Self-Care Resources',
      description: 'Mental health and wellness tools',
      icon: 'flower',
      color: '#EC4899',
    },
    {
      id: '4',
      title: 'Educational Materials',
      description: 'Learn about your rights and resources',
      icon: 'book',
      color: '#06B6D4',
    },
  ];

  const handleEmergencyCall = async (contact) => {
    try {
      const url = `tel:${contact.number}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot make calls from this device`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make emergency call');
    }
  };

  const handleShareLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to share your location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Here you would typically send the location to your emergency contacts
      // or support team through your backend
      
      Alert.alert(
        'Location Shared',
        'Your location has been shared with emergency contacts',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickExit = () => {
    Alert.alert(
      'Quick Exit',
      'This will immediately close the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit Now', 
          style: 'destructive',
          onPress: () => {
            // In a real app, this would immediately close the app
            // For React Native, we can navigate to a safe screen
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        style={tw`px-6 pt-16 pb-8 rounded-b-3xl`}
      >
        <View style={tw`flex-row justify-between items-center mb-6`}>
          <View>
            <Text style={tw`text-2xl font-bold text-white`}>
              Safety & Support
            </Text>
            <Text style={tw`text-white opacity-90 mt-1`}>
              Help is available 24/7
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={tw`items-center`}>
          <LottieLoader type="meditation" size={100} />
        </View>
      </LinearGradient>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Emergency Contacts */}
        <View style={tw`p-6`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
            Emergency Contacts
          </Text>
          <Text style={tw`text-gray-600 mb-6`}>
            Immediate help is just a call away
          </Text>

          <View style={tw`space-y-3`}>
            {emergencyContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={tw`bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 flex-row items-center`}
                onPress={() => handleEmergencyCall(contact)}
              >
                <View style={[
                  tw`w-12 h-12 rounded-full items-center justify-center mr-4`,
                  { backgroundColor: `${contact.color}20` }
                ]}>
                  <Ionicons 
                    name={contact.icon} 
                    size={24} 
                    color={contact.color} 
                  />
                </View>
                
                <View style={tw`flex-1`}>
                  <Text style={tw`font-semibold text-gray-900`}>
                    {contact.name}
                  </Text>
                  <Text style={tw`text-gray-600 text-sm`}>
                    {contact.number}
                  </Text>
                </View>
                
                <Ionicons name="call" size={20} color={contact.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={tw`px-6 mb-6`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
            Quick Actions
          </Text>
          
          <View style={tw`flex-row space-x-4`}>
            <TouchableOpacity
              style={tw`flex-1 bg-red-50 border-2 border-red-200 rounded-2xl p-4 items-center`}
              onPress={handleShareLocation}
            >
              <Ionicons name="location" size={24} color="#EF4444" />
              <Text style={tw`text-red-700 font-medium mt-2 text-center`}>
                Share{'\n'}Location
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`flex-1 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 items-center`}
              onPress={() => Alert.alert('Feature', 'Safe check-in feature coming soon')}
            >
              <Ionicons name="checkmark-done" size={24} color="#6A1B9A" />
              <Text style={tw`text-purple-700 font-medium mt-2 text-center`}>
                Safe{'\n'}Check-in
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resources */}
        <View style={tw`px-6 mb-6`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
            Resources & Support
          </Text>

          <View style={tw`flex-row flex-wrap justify-between`}>
            {resources.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                style={tw`w-[48%] bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 mb-4 items-center`}
                onPress={() => Alert.alert('Resource', `${resource.title} - Coming soon`)}
              >
                <View style={[
                  tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                  { backgroundColor: `${resource.color}20` }
                ]}>
                  <Ionicons 
                    name={resource.icon} 
                    size={24} 
                    color={resource.color} 
                  />
                </View>
                
                <Text style={tw`font-semibold text-gray-900 text-center mb-1`}>
                  {resource.title}
                </Text>
                <Text style={tw`text-gray-600 text-xs text-center`}>
                  {resource.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Exit */}
        <View style={tw`px-6 pb-8`}>
          <AnimatedButton
            title="Quick Exit"
            onPress={handleQuickExit}
            variant="danger"
            size="lg"
            loading={loading}
            fullWidth
            icon={<Ionicons name="exit" size={20} color="white" />}
          />
          
          <Text style={tw`text-gray-500 text-xs text-center mt-3`}>
            This will immediately close the app and clear your history
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SOSHelpModal;