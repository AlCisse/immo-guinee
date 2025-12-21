import React from 'react';
import { Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import Colors, { lightTheme } from '@/constants/Colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
}

const SIZES = {
  small: 18,
  medium: 24,
  large: 32,
  xlarge: 40,
};

export default function Logo({ size = 'medium', style }: LogoProps) {
  const fontSize = SIZES[size];

  return (
    <Text style={[styles.logo, { fontSize }, style]}>
      <Text style={styles.logoImmo}>Immo</Text>
      <Text style={styles.logoGuinee}>Guinee</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoImmo: {
    color: Colors.secondary[800],
  },
  logoGuinee: {
    color: lightTheme.colors.primary,
  },
});
