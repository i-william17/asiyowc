import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import tw from '../../utils/tw';

const AnimatedButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  animation = 'scale',
  style,
  textStyle,
  children,
  fullWidth = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    onPress?.();
  };

  const getVariantStyles = () => {
    const variants = {
      primary: {
        background: 'bg-purple-600',
        gradient: ['#6A1B9A', '#8E24AA'],
        text: 'text-white',
      },
      secondary: {
        background: 'bg-white',
        gradient: null,
        text: 'text-purple-600',
        border: 'border border-purple-600',
      },
      gold: {
        background: 'bg-gold-500',
        gradient: ['#FFD700', '#FBC02D'],
        text: 'text-purple-900',
      },
      ghost: {
        background: 'bg-transparent',
        gradient: null,
        text: 'text-purple-600',
      },
      premium: {
        background: 'bg-gradient-premium',
        gradient: ['#6A1B9A', '#FFD700'],
        text: 'text-white',
      },
      success: {
        background: 'bg-green-500',
        gradient: ['#10B981', '#34D399'],
        text: 'text-white',
      },
      danger: {
        background: 'bg-red-500',
        gradient: ['#EF4444', '#F87171'],
        text: 'text-white',
      },
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: 'px-4 py-2 rounded-xl',
      md: 'px-6 py-3 rounded-2xl',
      lg: 'px-8 py-4 rounded-3xl',
    };
    return sizes[size] || sizes.md;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const ButtonContent = () => (
    <View style={tw`flex-row items-center justify-center`}>
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'secondary' ? '#6A1B9A' : 'white'} 
          style={tw`mr-2`}
        />
      ) : (
        icon && <View style={tw`mr-2`}>{icon}</View>
      )}
      <Text
        style={[
          { fontFamily: 'Poppins-SemiBold' },
          tw`text-center`,
          tw`${variantStyles.text}`,
          size === 'sm' && tw`text-sm`,
          size === 'lg' && tw`text-lg`,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const containerStyle = [
    fullWidth && tw`w-full`,
    style,
  ];

  if (variantStyles.gradient) {
    return (
      <Animated.View style={[animatedStyle, containerStyle]}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
          activeOpacity={1}
        >
          <LinearGradient
            colors={variantStyles.gradient}
            style={[
              tw`${sizeStyles} items-center justify-center`,
              disabled && tw`opacity-50`,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ButtonContent />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          tw`${sizeStyles} ${variantStyles.background} ${variantStyles.border || ''}`,
          disabled && tw`opacity-50`,
          style,
        ]}
        activeOpacity={0.8}
      >
        <ButtonContent />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AnimatedButton;