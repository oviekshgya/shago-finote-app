import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {colors, radii} from '../theme/finoteTheme';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SettingSection({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: SettingSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.sectionContent}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  chevron: {
    fontSize: 12,
    color: colors.muted,
  },
  sectionContent: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
});
