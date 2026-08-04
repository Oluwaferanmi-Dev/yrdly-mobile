import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';

export default function AdminLayout() {
  const { profile, loading } = useAuth();
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Redirect non-admins to the home tab
  if (!profile || profile.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
