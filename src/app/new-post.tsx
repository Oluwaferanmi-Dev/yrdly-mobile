import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DARK, G } from '../constants/tokens';

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  useEffect(() => {
    if (params.category === 'Event') {
      router.replace('/create-event');
    } else {
      router.replace('/create-post');
    }
  }, [params.category, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={G} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
