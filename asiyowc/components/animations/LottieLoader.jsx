// components/animations/LottieLoader.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const LottieLoader = ({ 
  visible = false, 
  source, 
  size = 200, 
  loop = true, 
  autoPlay = true,
  style,
  ...props 
}) => {
  if (!visible) return null;

  // Default animation if no source provided
  const defaultAnimation = require('../../assets/animations/loading-spinner.json');

  return (
    <View style={[styles.container, style]} {...props}>
      <LottieView
        source={source || defaultAnimation}
        autoPlay={autoPlay}
        loop={loop}
        style={[
          styles.animation,
          { width: size, height: size }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  animation: {
    width: 100,
    height: 100,
  },
});

export default LottieLoader;