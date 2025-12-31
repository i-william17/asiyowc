import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PHOEBE_ASIYO_QUOTES } from '../../constants/phoebeAsiyoQuotes';

const QuoteCard = () => {
  const quote = useMemo(() => {
    const dayIndex = new Date().getDate() % PHOEBE_ASIYO_QUOTES.length;
    return PHOEBE_ASIYO_QUOTES[dayIndex];
  }, []);

  const [collapsed, setCollapsed] = useState(false);

  const animatedHeight = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;

  const collapse = () => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start(() => setCollapsed(true));
  };

  const expand = () => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => setCollapsed(false));
  };

  const contentHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <View
      style={{
        backgroundColor: '#6A1B9A',
        borderRadius: 20,
        marginBottom: 22,
        overflow: 'hidden',
        elevation: 3,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 18,
        }}
      >
        {/* Opening Quote (Golden) */}
        <MaterialCommunityIcons
          name="format-quote-open"
          size={28}
          color="#FACC15"
        />

        {/* Chevron Controls (Golden) */}
        {collapsed ? (
          <TouchableOpacity onPress={expand}>
            <MaterialCommunityIcons
              name="chevron-down"
              size={28}
              color="#FACC15"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={collapse}>
            <MaterialCommunityIcons
              name="chevron-up"
              size={28}
              color="#FACC15"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* COLLAPSIBLE CONTENT */}
      <Animated.View
        style={{
          height: contentHeight,
          opacity: animatedOpacity,
          paddingHorizontal: 18,
        }}
      >
        {/* Quote Text */}
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: 'Poppins-Regular',
            fontSize: 16,
            lineHeight: 26,
            fontStyle: 'italic',
            marginBottom: 14,
          }}
        >
          {quote.text}
        </Text>

        {/* Author */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'Poppins-SemiBold',
            fontSize: 14,
          }}
        >
          — {quote.author}
        </Text>

        {/* Closing Quote (Golden) */}
        <MaterialCommunityIcons
          name="format-quote-close"
          size={28}
          color="#FACC15"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 14,
          }}
        />
      </Animated.View>
    </View>
  );
};

export default QuoteCard;
