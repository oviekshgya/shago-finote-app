import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/spacing';

interface ModernInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  multiline?: boolean;
  maxLength?: number;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  icon,
  style,
  multiline = false,
  maxLength,
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          maxLength={maxLength}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconButton}>
            <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.label,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 100,
    paddingVertical: spacing.md,
  },
  icon: {
    marginRight: spacing.md,
    fontSize: 20,
  },
  iconButton: {
    marginLeft: spacing.md,
    padding: spacing.sm,
  },
  error: {
    fontSize: typography.small,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
