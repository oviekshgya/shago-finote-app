import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme/spacing';

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'gradient' | 'elevated';
  padding?: number;
  margin?: number;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  style,
  variant = 'default',
  padding = spacing.padding.lg,
  margin = 0,
}) => {
  const variantStyle = {
    default: styles.defaultCard,
    gradient: styles.gradientCard,
    elevated: styles.elevatedCard,
  }[variant];

  return (
    <View style={[variantStyle, { padding, margin }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  gradientCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderOpacity: 0.2,
  },
  elevatedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
