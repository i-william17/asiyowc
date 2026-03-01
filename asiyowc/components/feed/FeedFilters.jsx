import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const filters = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'text', label: 'Text', icon: 'text-outline' },
  { id: 'image', label: 'Images', icon: 'image-outline' },
  { id: 'video', label: 'Videos', icon: 'videocam-outline' },
  { id: 'link', label: 'Links', icon: 'link-outline' },
  // { id: 'program', label: 'Programs', icon: 'school-outline' },
  // { id: 'hub', label: 'Hubs', icon: 'earth-outline' }
];

const FeedFilters = ({ active, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingVertical: 4,
        width: Platform.OS === 'web' ? '100vw' : undefined,
        justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
      }}
    >
      {filters.map(filter => {
        const isActive = active === filter.id;

        return (
          <TouchableOpacity
            key={filter.id}
            onPress={() => onChange(filter.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 14,
              marginRight: 10,
              borderRadius: 22,
              backgroundColor: isActive ? '#6A1B9A' : '#f3f4f6'
            }}
          >
            <Ionicons
              name={filter.icon}
              size={16}
              color={isActive ? '#fff' : '#6b7280'}
            />

            <Text
              style={{
                marginLeft: 6,
                fontFamily: isActive ? 'Poppins-SemiBold' : 'Poppins-Medium',
                fontSize: 14,
                color: isActive ? '#fff' : '#374151'
              }}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default FeedFilters;

// { id: 'program', label: 'Programs', icon: 'school-outline' },
// { id: 'hub', label: 'Hubs', icon: 'earth-outline' }