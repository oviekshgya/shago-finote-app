import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/spacing';

interface ModernButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  icon,
  fullWidth = false,
}) => {
  const sizeStyle = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  }[size];

  const variantStyle = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    outline: styles.outlineButton,
    ghost: styles.ghostButton,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        sizeStyle,
        variantStyle,
        disabled && styles.disabled,
        fullWidth && { width: '100%' },
        style,
      ]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, disabled && styles.disabledText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  icon: {
    fontSize: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textTertiary,
  },
});
