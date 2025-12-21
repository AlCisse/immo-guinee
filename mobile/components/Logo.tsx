import React from 'react';
import { Image, StyleSheet, ViewStyle } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

const SIZES = {
  small: { width: 80, height: 80 },
  medium: { width: 120, height: 120 },
  large: { width: 160, height: 160 },
  xlarge: { width: 200, height: 200 },
};

export default function Logo({ size = 'medium', style }: LogoProps) {
  const dimensions = SIZES[size];

  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={[styles.logo, dimensions, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // Base styles if needed
  },
});
