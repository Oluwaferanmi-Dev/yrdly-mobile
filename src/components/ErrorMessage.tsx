import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ErrorMessageProps {
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function ErrorMessage({ error, style }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <View style={[styles.container, style]}>
      <Feather name="alert-circle" size={16} color="#F87171" style={styles.icon} />
      <Text style={styles.text}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
