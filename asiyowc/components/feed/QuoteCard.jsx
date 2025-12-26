import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PHOEBE_ASIYO_QUOTES } from '../../constants/phoebeAsiyoQuotes';

const QuoteCard = () => {
  const quote = useMemo(() => {
    const dayIndex = new Date().getDate() % PHOEBE_ASIYO_QUOTES.length;
    return PHOEBE_ASIYO_QUOTES[dayIndex];
  }, []);

  return (
    <View
      style={{
        backgroundColor: '#6A1B9A',
        borderRadius: 20,
        padding: 22,
        marginBottom: 22,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3
      }}
    >
      {/* Opening Quote */}
      <Ionicons
        name="quote"
        size={26}
        color="rgba(255,255,255,0.35)"
        style={{ marginBottom: 10 }}
      />

      {/* Quote Text */}
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: 'Poppins-Regular',
          fontSize: 16,
          lineHeight: 26,
          fontStyle: 'italic',
          marginBottom: 14
        }}
      >
        {quote.text}
      </Text>

      {/* Author */}
      <Text
        style={{
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'Poppins-SemiBold',
          fontSize: 14
        }}
      >
        — {quote.author}
      </Text>

      {/* Closing Quote */}
      <Ionicons
        name="quote"
        size={26}
        color="rgba(255,255,255,0.25)"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 18,
          transform: [{ rotate: '180deg' }]
        }}
      />
    </View>
  );
};

export default QuoteCard;
