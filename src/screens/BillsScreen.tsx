/**
 * Bills Screen
 * Manajemen tagihan dan pembayaran jatuh tempo
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BillsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1c" />
      <View style={styles.header}>
        <Text style={styles.title}>Tagihan Jatuh Tempo</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Manajemen tagihan dan pembayaran recurring</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111113',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: '#9b8c86',
  },
});
