import re

file_path = "src/app/marketplace/[id].tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import for LinearGradient
if "expo-linear-gradient" not in content:
    content = content.replace("import Animated", "import { LinearGradient } from 'expo-linear-gradient';\nimport Animated")

replacement = """
  return (
    <View style={[styles.container, { backgroundColor: '#050505' }]}>
      <Animated.ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ position: 'relative', height: 320 }}>
          {/* Image Gallery */}
          {mediaItems.length > 0 ? (
            <Animated.View style={[headerAnimatedStyle, styles.galleryContainer]}>
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false} 
                style={styles.imageScroll}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                  setActiveScrollIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {mediaItems.map((media, i) => (
                  <View key={i} style={styles.mainImageContainer}>
                    {media.type === 'video' ? (
                      <MarketVideo url={media.url} shouldPlay={activeScrollIndex === i && isFocused} />
                    ) : (
                      <TouchableOpacity 
                        activeOpacity={0.9} 
                        style={{ flex: 1 }}
                        onPress={() => {
                          const imageIndex = post.video_url ? i - 1 : i;
                          setCurrentImageIndex(Math.max(0, imageIndex));
                          setIsGalleryVisible(true);
                        }}
                      >
                        <Image source={{ uri: media.url }} style={styles.mainImage} contentFit="cover" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
              
              {/* Gallery Indicator Row */}
              <View style={styles.galleryControls}>
                <View style={styles.paginationDots}>
                  {mediaItems.map((_, i) => (
                    <View key={i} style={[styles.carouselDot, activeScrollIndex === i ? [styles.activeDot, { backgroundColor: G }] : styles.inactiveDot]} />
                  ))}
                </View>
                {mediaItems.length > 1 && (
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterText}>{activeScrollIndex + 1}/{mediaItems.length}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
             <View style={[styles.placeholderImage, { backgroundColor: SURFACE }]}>
               <Ionicons name="image-outline" size={64} color={LABEL} />
             </View>
          )}

          {/* Gradient Overlay bottom of image */}
          <LinearGradient 
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(5,5,5,0.65)']}
            locations={[0, 0.4, 1]}
            style={{ position: 'absolute', inset: 0 }}
            pointerEvents="none"
          />

          {/* SOLD Badge */}
          {post.is_sold && (
            <View style={{ position: 'absolute', top: 20, left: 20, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
               <Text style={{ fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 13, color: MUTED }}>SOLD</Text>
            </View>
          )}

          {/* Header Buttons over image */}
          <View style={{ position: 'absolute', top: 52, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }}>
             <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
             </TouchableOpacity>
             <View style={{ flexDirection: 'row', gap: 8 }}>
               {!isOwner && (
                 <TouchableOpacity onPress={handleToggleLike} style={styles.iconCircle}>
                   <Ionicons name={isLiked ? "bookmark" : "bookmark-outline"} size={16} color={isLiked ? G : '#FFF'} />
                 </TouchableOpacity>
               )}
               <TouchableOpacity onPress={handleMore} style={styles.iconCircle}>
                 <Ionicons name="ellipsis-horizontal" size={16} color="#FFF" />
               </TouchableOpacity>
             </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
           <View>
             <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
               <Text style={{ fontFamily: 'Outfit-Bold', fontWeight: '800', fontSize: 22, color: '#fff', flex: 1, lineHeight: 26 }}>
                 {post.title || post.text || 'Untitled'}
               </Text>
               {post.condition && (
                 <View style={{ marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GLASS_BORDER, flexShrink: 0 }}>
                   <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, fontWeight: '600', color: MUTED }}>{post.condition}</Text>
                 </View>
               )}
             </View>
             <Text style={{ fontFamily: 'Outfit-Bold', fontWeight: '800', fontSize: 28, color: post.is_sold ? LABEL : G }}>
               {post.is_sold ? 'SOLD' : (post.price === 0 ? 'FREE' : formatPrice(post.price || 0))}
             </Text>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
               <Ionicons name="location-outline" size={14} color={LABEL} />
               <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL }}>
                 {post.lga ? `${post.lga}, ` : ''}{post.state || 'Location'}
               </Text>
             </View>
           </View>

           {/* Seller Card */}
           {isOwner ? (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(130,219,126,0.06)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)', borderRadius: 20 }}>
               <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                 <Ionicons name="bag-check-outline" size={20} color={G} />
               </View>
               <View style={{ flex: 1 }}>
                 <Text style={{ fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 13, color: G }}>You are the seller of this listing</Text>
                 <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 }}>Use the buttons below to manage your listing</Text>
               </View>
             </View>
           ) : (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 20 }}>
               <TouchableOpacity onPress={() => router.push(`/profile/${post.user_id}` as any)}>
                 <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: SURFACE }}>
                   {postUser?.avatar_url || post.author_image ? (
                     <Image source={{ uri: postUser?.avatar_url || post.author_image }} style={{ width: '100%', height: '100%' }} />
                   ) : (
                     <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold' }}>
                          {postUser?.name ? postUser.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                     </View>
                   )}
                 </View>
               </TouchableOpacity>
               <View style={{ flex: 1 }}>
                 <TouchableOpacity onPress={() => router.push(`/profile/${post.user_id}` as any)}>
                   <Text style={{ fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 14, color: '#fff' }}>{postUser?.name || post.author_name || 'Unknown Seller'}</Text>
                 </TouchableOpacity>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                   <Ionicons name="star" size={11} color={GOLD || '#FFD700'} />
                   <Ionicons name="star" size={11} color={GOLD || '#FFD700'} />
                   <Ionicons name="star" size={11} color={GOLD || '#FFD700'} />
                   <Ionicons name="star" size={11} color={GOLD || '#FFD700'} />
                   <Ionicons name="star" size={11} color={GOLD || '#FFD700'} />
                   <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL, marginLeft: 2 }}>Trusted seller</Text>
                 </View>
               </View>
               <TouchableOpacity 
                 onPress={() => router.push(`/profile/${post.user_id}` as any)}
                 style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ color: MUTED, fontFamily: 'Inter-Medium', fontSize: 12, fontWeight: '500' }}>View Profile</Text>
               </TouchableOpacity>
             </View>
           )}

           <View>
             <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: '700', color: LABEL, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>About this item</Text>
             <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 25.5 }}>{post.text}</Text>
           </View>
           
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
             {post.category && (
               <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
                 <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: MUTED }}>{post.category}</Text>
               </View>
             )}
           </View>
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16, backgroundColor: 'rgba(5,5,5,0.95)', borderTopWidth: 1, borderTopColor: GLASS_BORDER, flexDirection: 'row', gap: 12 }}>
        {isOwner ? (
          <>
            <TouchableOpacity 
              onPress={() => router.push(`/marketplace/edit/${post.id}`)}
              style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="pencil" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 15 }}>Edit Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={async () => {
                const newSold = !post.is_sold;
                const { error } = await supabase.from('posts').update({ is_sold: newSold }).eq('id', post.id);
                if (!error) {
                  setPost(prev => prev ? { ...prev, is_sold: newSold } : null);
                }
              }}
              style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: post.is_sold ? 'rgba(255,92,92,0.1)' : 'rgba(130,219,126,0.1)', borderWidth: 1, borderColor: post.is_sold ? 'rgba(255,92,92,0.3)' : 'rgba(130,219,126,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: post.is_sold ? '#FF5C5C' : G, fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 15 }}>
                {post.is_sold ? 'Mark Active' : 'Mark as Sold'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              disabled={post.is_sold}
              onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: post.id, type: 'marketplace' } })}
              style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: post.is_sold ? '#111' : G, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: post.is_sold ? LABEL : DARK, fontFamily: 'Outfit-Bold', fontWeight: '700', fontSize: 16 }}>{post.is_sold ? 'Item Sold' : 'Buy Now'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleMessageSeller}
              style={{ height: 52, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#111', borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: MUTED, fontFamily: 'Inter-Medium', fontSize: 14 }}>Message Seller</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ImageViewing
        images={imageUrls.map(uri => ({ uri }))}
        imageIndex={currentImageIndex}
        visible={isGalleryVisible}
        onRequestClose={() => setIsGalleryVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { flex: 1 },
  galleryContainer: {
    width: '100%', height: '100%',
  },
  imageScroll: { flex: 1 },
  mainImageContainer: { width: width, height: 320 },
  mainImage: { width: width, height: '100%' },
  galleryControls: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  paginationDots: { flexDirection: 'row', alignItems: 'center' },
  carouselDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  placeholderImage: { 
    width: width, height: 320, 
    justifyContent: 'center', alignItems: 'center',
  },
});

export default function MarketplaceDetailScreen() {
  return (
    <ErrorBoundary screenName="MarketplaceDetail">
      <MarketplaceDetailContent />
    </ErrorBoundary>
  );
}
"""

start_idx = content.find("  return (\n    <View style={[styles.container, { backgroundColor: DARK }]}>")
if start_idx != -1:
    content = content[:start_idx] + replacement
    with open(file_path, "w") as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Could not find start index.")
