import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {colors, radii} from '../theme/finoteTheme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'accent';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  primary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  accent: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.border,
  },
});
