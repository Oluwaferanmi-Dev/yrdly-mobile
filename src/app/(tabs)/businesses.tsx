import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Briefcase } from 'lucide-react-native';
import { theme } from '../../theme';

export default function BusinessesTab() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Briefcase size={48} color={theme.colors.textSecondary} />
        <Text style={styles.title}>Businesses</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
  },
});
