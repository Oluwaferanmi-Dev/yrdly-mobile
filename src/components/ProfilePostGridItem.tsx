import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Post } from '../types';
import { useAppTheme } from '../context/ThemeContext';

interface ProfilePostGridItemProps {
  post: Post;
  onPress: () => void;
  width: number;
}

export function ProfilePostGridItem({ post, onPress, width }: ProfilePostGridItemProps) {
  const { colors } = useAppTheme();
  
  const hasImages = post.image_urls && post.image_urls.length > 0;
  const imageUrl = hasImages ? post.image_urls![0] : post.image_url;
  const hasVideo = !!post.video_url;

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={[{ width, height: width }, styles.container, { borderColor: colors.background }]} 
      onPress={onPress}
    >
      {imageUrl ? (
        <>
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          {hasImages && post.image_urls!.length > 1 && (
            <View style={styles.iconOverlay}>
              <Feather name="layers" size={14} color="#FFF" />
            </View>
          )}
        </>
      ) : hasVideo ? (
        <View style={[styles.placeholder, { backgroundColor: colors.borderLight }]}>
          <Feather name="video" size={32} color={colors.textSecondary} />
        </View>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.textSnippet, { color: colors.text }]} numberOfLines={3}>
            {post.title || post.text || 'Post'}
          </Text>
        </View>
      )}
      
      {hasVideo && !imageUrl && (
        <View style={styles.iconOverlay}>
          <Feather name="play" size={16} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1, // acts as a gap/margin between grid items
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  textSnippet: {
    fontSize: 12,
    textAlign: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
