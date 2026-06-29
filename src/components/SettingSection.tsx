import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

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
    borderRadius: 10,
    backgroundColor: '#1b1b1f',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  chevron: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionContent: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
});
