import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

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
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  default: {
    backgroundColor: '#1b1b1f',
    borderColor: '#2a2a2c',
  },
  primary: {
    backgroundColor: '#202024',
    borderColor: '#303036',
  },
  accent: {
    backgroundColor: '#2a1b1b',
    borderColor: '#334155',
  },
});
