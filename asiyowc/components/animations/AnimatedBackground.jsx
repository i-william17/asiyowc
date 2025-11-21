// components/animations/AnimatedBackground.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AnimatedBackground = ({
  children,
  variant = 'gradient',
  animated = true,
  speed = 'slow',
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const getSpeed = () => {
    switch (speed) {
      case 'slow': return 4000;
      case 'medium': return 3000;
      case 'fast': return 2000;
      default: return 3000;
    }
  };

  useEffect(() => {
    if (!animated) return;

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: getSpeed(),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: getSpeed(),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: getSpeed() * 1.5,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: getSpeed() * 1.5,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animated, speed]);

  const getBackground = () => {
    switch (variant) {
      case 'gradient':
        return (
          <LinearGradient
            colors={[
              theme.background,
              theme.surface,
              theme.background,
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        );
      
      case 'purpleGold':
        return (
          <LinearGradient
            colors={[
              theme.primaryLight + '10',
              theme.secondary + '08',
              theme.primary + '05',
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        );
      
      case 'bubbles':
        return (
          <View style={StyleSheet.absoluteFill}>
            {/* Animated bubbles */}
            <Animated.View
              style={[
                styles.bubble,
                styles.bubble1,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.6],
                  }),
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bubble,
                styles.bubble2,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 0.7],
                  }),
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 15],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bubble,
                styles.bubble3,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.5],
                  }),
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        );
      
      default:
        return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />;
    }
  };

  return (
    <View style={[styles.container, style]} {...props}>
      {getBackground()}
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#6A1B9A',
  },
  bubble1: {
    width: 200,
    height: 200,
    top: -50,
    left: -50,
    opacity: 0.3,
  },
  bubble2: {
    width: 150,
    height: 150,
    bottom: -30,
    right: -30,
    opacity: 0.4,
    backgroundColor: '#FFD700',
  },
  bubble3: {
    width: 100,
    height: 100,
    top: '30%',
    right: '20%',
    opacity: 0.2,
    backgroundColor: '#6A1B9A',
  },
});

export default AnimatedBackground;