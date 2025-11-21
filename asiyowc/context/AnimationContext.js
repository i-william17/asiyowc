import React, { createContext, useContext, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const AnimationContext = createContext();

export const AnimationProvider = ({ children }) => {
  // Shared animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Common animation configurations
  const animationConfig = {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    useNativeDriver: true,
  };

  const fadeIn = (callback = null) => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      ...animationConfig,
    }).start(callback);
  };

  const fadeOut = (callback = null) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      ...animationConfig,
    }).start(callback);
  };

  const slideIn = (from = 'bottom', callback = null) => {
    const startValue = from === 'bottom' ? 50 : from === 'top' ? -50 : 0;
    slideAnim.setValue(startValue);
    
    Animated.timing(slideAnim, {
      toValue: 0,
      ...animationConfig,
    }).start(callback);
  };

  const slideOut = (to = 'bottom', callback = null) => {
    const endValue = to === 'bottom' ? 50 : to === 'top' ? -50 : 0;
    
    Animated.timing(slideAnim, {
      toValue: endValue,
      ...animationConfig,
    }).start(callback);
  };

  const scaleIn = (callback = null) => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      ...animationConfig,
    }).start(callback);
  };

  const scaleOut = (callback = null) => {
    Animated.timing(scaleAnim, {
      toValue: 0.8,
      ...animationConfig,
    }).start(callback);
  };

  const pulse = (callback = null) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const bounce = (callback = null) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const rotate = (callback = null) => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
      callback?.();
    });
  };

  const shake = (callback = null) => {
    const shakeAnim = new Animated.Value(0);
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(callback);
  };

  const stagger = (animations, delay = 100) => {
    return Animated.stagger(
      delay,
      animations.map(anim => anim)
    );
  };

  const parallel = (animations) => {
    return Animated.parallel(animations);
  };

  const sequence = (animations) => {
    return Animated.sequence(animations);
  };

  const animationContextValue = React.useMemo(() => ({
    // Animation values
    fadeAnim,
    slideAnim,
    scaleAnim,
    rotateAnim,
    
    // Animation methods
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scaleIn,
    scaleOut,
    pulse,
    bounce,
    rotate,
    shake,
    stagger,
    parallel,
    sequence,
    
    // Configuration
    config: animationConfig,
    
    // Helper to create animated styles
    createAnimatedStyle: (value, outputRange) => ({
      transform: [{ translateY: value }],
      opacity: fadeAnim,
    }),
  }), [fadeAnim, slideAnim, scaleAnim, rotateAnim]);

  return (
    <AnimationContext.Provider value={animationContextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};