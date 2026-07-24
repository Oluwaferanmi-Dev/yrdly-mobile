import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Post } from '../types';
import { StorageService } from '../lib/storage-service';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ProfilePostGridItemProps {
  post: Post;
  onPress: () => void;
  width: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ProfilePostGridItem({ post, onPress, width }: ProfilePostGridItemProps) {
  
  const hasImages = post.image_urls && post.image_urls.length > 0;
  const imageUrl = hasImages ? post.image_urls![0] : post.image_url || post.video_thumbnail_url;
  const hasVideo = !!post.video_url;
  
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const handlePressIn = () => { scale.value = withSpring(0.95); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  const PADDING = 2;
  const itemSize = width - (PADDING * 2);

  return (
    <AnimatedTouchable 
      activeOpacity={0.9} 
      style={[{ width: itemSize, height: itemSize, margin: PADDING }, styles.container, animatedStyle]} 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {imageUrl ? (
        <>
          <Image source={{ uri: StorageService.getOptimizedImageUrl(imageUrl, 300) || imageUrl }} style={styles.image} contentFit="cover" />
          {hasImages && post.image_urls!.length > 1 && !hasVideo && (
            <View style={styles.iconOverlay}>
              <Feather name="layers" size={14} color="#FFF" />
            </View>
          )}
        </>
      ) : hasVideo ? (
        <View style={[styles.placeholder, { backgroundColor: '#161616' }]}>
          <Feather name="video" size={32} color="#A1A1AA" />
        </View>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: '#111111' }]}>
          <Text style={styles.textSnippet} numberOfLines={3}>
            {post.title || post.text || 'Post'}
          </Text>
        </View>
      )}
      
      <View style={styles.badgeContainer}>
        {post.category === 'For Sale' && (
          <View style={styles.badge}>
            <MaterialIcons name="storefront" size={12} color="#FFF" />
          </View>
        )}
        {post.category === 'Event' && (
          <View style={[styles.badge, { backgroundColor: '#82DB7E' }]}>
            <Feather name="calendar" size={12} color="#050505" />
          </View>
        )}
      </View>

      {hasVideo && imageUrl && (
        <View style={styles.iconOverlay}>
          <Feather name="play" size={16} color="#FFF" />
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
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
    color: '#FFF'
  },
  iconOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
