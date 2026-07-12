
import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
// Removed Firebase imports - now using Supabase
import { useAuth } from '@/hooks/use-supabase-auth';
import { supabase } from '@/lib/supabase';
import { StorageService, MobileFile } from '@/lib/storage-service';
import { UserActivityService } from '@/lib/user-activity-service';

import { Post, Business } from '@/types';
import { useToast } from './use-toast';


import { LocationFilter } from '@/context/LocationContext';

export const usePosts = (filter?: LocationFilter | null) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const filterState = filter?.state;
  const filterLga = filter?.lga;
  const filterWard = filter?.ward;

  const fetchPosts = useCallback(async () => {
    // Generate a cache key based on filters
    let filterString: string | undefined = undefined;
    if (filterWard) filterString = `ward=eq.${filterWard}`;
    else if (filterLga) filterString = `lga=eq.${filterLga}`;
    else if (filterState) filterString = `state=eq.${filterState}`;
    
    const cacheFile = FileSystem.documentDirectory + (filterString ? `yrdly_posts_cache_${filterString.replace(/\W/g, '_')}.json` : 'yrdly_posts_cache_all.json');

    try {
      // 1. Try to load from cache first to instantly populate the UI
      const fileInfo = await FileSystem.getInfoAsync(cacheFile);
      if (fileInfo.exists) {
        const cachedData = await FileSystem.readAsStringAsync(cacheFile);
        if (cachedData) {
          setPosts(JSON.parse(cachedData) as Post[]);
        }
      }
    } catch (e) {
      // Ignore cache read errors
    }

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            name,
            avatar_url,
            location,
            created_at
          )
        `);

      let eventsQuery = supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey(
            id,
            name,
            avatar_url,
            location,
            created_at
          )
        `)
        .eq('status', 'PUBLISHED')
        .or(`end_time.gte.${new Date().toISOString()},start_time.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`);

      // Apply location filters
      if (filterState) {
        query = query.eq('state', filterState);
        eventsQuery = eventsQuery.eq('state', filterState);
      }
      if (filterLga) {
        query = query.eq('lga', filterLga);
        eventsQuery = eventsQuery.eq('lga', filterLga);
      }
      if (filterWard) {
        query = query.eq('ward', filterWard);
        eventsQuery = eventsQuery.eq('ward', filterWard);
      }

      // Hide sold marketplace items from the feed
      query = query.or('category.neq.For Sale,is_sold.eq.false');

      const [postsRes, eventsRes] = await Promise.all([
        query.order('timestamp', { ascending: false }),
        eventsQuery.order('created_at', { ascending: false })
      ]);

      if (postsRes.error || eventsRes.error) {
        setLoading(false);
        return;
      }

      const freshPosts = postsRes.data as Post[];
      const freshEvents = (eventsRes.data || []).map((event: any): Post => ({
        id: event.id,
        user_id: event.organizer_id,
        author_name: event.organizer?.name || 'Unknown',
        author_image: event.organizer?.avatar_url || '',
        text: event.description || '',
        description: event.description || '',
        image_urls: event.cover_image_url ? [event.cover_image_url] : [],
        image_url: event.cover_image_url || undefined,
        timestamp: event.created_at,
        comment_count: 0,
        category: 'Event',
        state: event.state,
        lga: event.lga,
        ward: event.ward,
        title: event.title,
        event_date: event.start_time,
        event_time: event.start_time,
        event_location: { address: event.location_address || (event.location_online ? 'Online' : 'TBA') },
        liked_by: [],
        created_at: event.created_at,
        user: event.organizer,
      }));

      // Merge and sort
      const merged = [...freshPosts, ...freshEvents].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setPosts(merged);
      
      // 2. Save fresh data back to cache
      FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(merged)).catch(() => {});
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, [filterState, filterLga, filterWard]);

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription for all posts
    let filterString: string | undefined = undefined;
    if (filterWard) {
      filterString = `ward=eq.${filterWard}`;
    } else if (filterLga) {
      filterString = `lga=eq.${filterLga}`;
    } else if (filterState) {
      filterString = `state=eq.${filterState}`;
    }

    const channelName = `posts-all-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts',
        filter: filterString,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPost = payload.new as Post;
          
          // Double check filter client-side just in case
          if (filterState && newPost.state && newPost.state !== filterState) return;
          if (filterLga && newPost.lga && newPost.lga !== filterLga) return;
          if (filterWard && newPost.ward && newPost.ward !== filterWard) return;
          // Don't show sold items in the feed
          if (newPost.category === 'For Sale' && newPost.is_sold) return;
          
          // Check if post already exists in state
          setPosts(currentPosts => {
            if (currentPosts.some(p => p.id === newPost.id)) return currentPosts;
            return [newPost, ...currentPosts];
          });
          
          // Fetch user data for the new post
          const fetchUserData = async () => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, avatar_url, location, created_at')
                .eq('id', newPost.user_id)
                .single();
              
              if (!userError && userData) {
                const postWithUser = {
                  ...newPost,
                  user: userData
                };
                setPosts(prevPosts => prevPosts.map(p => p.id === newPost.id ? postWithUser : p));
              } else {
                // Keep the post as is (already added)
              }
            } catch (error) {
              // Keep the post as is (already added)
            }
          };
          
          fetchUserData();
        } else if (payload.eventType === 'UPDATE') {
          // Update existing post in the list
          const updatedPost = payload.new as Post;

          // If a For Sale post just became sold, remove it from the feed instantly
          if (updatedPost.category === 'For Sale' && updatedPost.is_sold) {
            setPosts(prevPosts => prevPosts.filter(p => p.id !== updatedPost.id));
            return;
          }
          
          // Fetch user data for the updated post
          const fetchUserData = async () => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, avatar_url, location, created_at')
                .eq('id', updatedPost.user_id)
                .single();
              
              if (!userError && userData) {
                const postWithUser = {
                  ...updatedPost,
                  user: userData
                };
                setPosts(prevPosts => 
                  prevPosts.map(post => 
                    post.id === updatedPost.id ? postWithUser : post
                  )
                );
              } else {
                // Fallback to post without user data
                setPosts(prevPosts => 
                  prevPosts.map(post => 
                    post.id === updatedPost.id ? updatedPost : post
                  )
                );
              }
            } catch (error) {
              setPosts(prevPosts => 
                prevPosts.map(post => 
                  post.id === updatedPost.id ? updatedPost : post
                )
              );
            }
          };
          
          fetchUserData();
        } else if (payload.eventType === 'DELETE') {
          // Remove deleted post from the list
          const deletedId = payload.old.id;
          setPosts(prevPosts => 
            prevPosts.filter(post => post.id !== deletedId)
          );
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'events',
        filter: filterString,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEvent = payload.new as any;
          if (newEvent.status !== 'PUBLISHED') return;
          
          if (filterState && newEvent.state && newEvent.state !== filterState) return;
          if (filterLga && newEvent.lga && newEvent.lga !== filterLga) return;
          if (filterWard && newEvent.ward && newEvent.ward !== filterWard) return;
          
          setPosts(currentPosts => {
            if (currentPosts.some(p => p.id === newEvent.id)) return currentPosts;
            
            const postFormat: Post = {
              id: newEvent.id,
              user_id: newEvent.organizer_id,
              author_name: 'Unknown',
              author_image: '',
              text: newEvent.description || '',
              description: newEvent.description || '',
              image_urls: newEvent.cover_image_url ? [newEvent.cover_image_url] : [],
              image_url: newEvent.cover_image_url || undefined,
              timestamp: newEvent.created_at,
              comment_count: 0,
              category: 'Event',
              state: newEvent.state,
              lga: newEvent.lga,
              ward: newEvent.ward,
              title: newEvent.title,
              event_date: newEvent.start_time,
              event_time: newEvent.start_time,
              event_location: { address: newEvent.location_address || (newEvent.location_online ? 'Online' : 'TBA') },
              liked_by: [],
              created_at: newEvent.created_at,
            };
            return [postFormat, ...currentPosts].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
          
          // Fetch user data for the new event
          const fetchUserData = async () => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, avatar_url, location, created_at')
                .eq('id', newEvent.organizer_id)
                .single();
              
              if (!userError && userData) {
                setPosts(prevPosts => prevPosts.map(p => {
                  if (p.id === newEvent.id) {
                    return { ...p, author_name: userData.name || 'Unknown', author_image: userData.avatar_url || '', user: userData };
                  }
                  return p;
                }));
              }
            } catch (error) {}
          };
          fetchUserData();
        } else if (payload.eventType === 'UPDATE') {
          const updatedEvent = payload.new as any;
          const isExpired = 
            (updatedEvent.end_time && new Date(updatedEvent.end_time).getTime() < Date.now()) || 
            (!updatedEvent.end_time && updatedEvent.start_time && new Date(updatedEvent.start_time).getTime() < Date.now() - 24 * 60 * 60 * 1000);
            
          if (updatedEvent.status !== 'PUBLISHED' || isExpired) {
            setPosts(prevPosts => prevPosts.filter(p => p.id !== updatedEvent.id));
            return;
          }
          
          setPosts(prevPosts => prevPosts.map(p => {
            if (p.id === updatedEvent.id) {
              return {
                ...p,
                text: updatedEvent.description || '',
                description: updatedEvent.description || '',
                image_urls: updatedEvent.cover_image_url ? [updatedEvent.cover_image_url] : [],
                image_url: updatedEvent.cover_image_url || undefined,
                title: updatedEvent.title,
                event_date: updatedEvent.start_time,
                event_time: updatedEvent.start_time,
                event_location: { address: updatedEvent.location_address || (updatedEvent.location_online ? 'Online' : 'TBA') },
              };
            }
            return p;
          }));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterState, filterLga, filterWard]);

  // Listen for ANY user's profile changes (avatar, name) via realtime
  // This ensures that when ANY user updates their avatar, all their posts in the feed
  // update immediately — past, present and future posts.
  useEffect(() => {
    const channelName = `users-profile-changes-${Math.random().toString(36).substring(7)}`;
    const userChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, (payload) => {
        const updatedUser = payload.new as { id: string; name: string; avatar_url: string; location: any; created_at: string };
        // Patch every in-memory post that belongs to this user
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.user_id === updatedUser.id) {
              return {
                ...post,
                author_name: updatedUser.name || post.author_name,
                author_image: updatedUser.avatar_url || post.author_image,
                user: {
                  id: updatedUser.id,
                  name: updatedUser.name,
                  avatar_url: updatedUser.avatar_url,
                  location: updatedUser.location,
                  created_at: updatedUser.created_at,
                },
              };
            }
            return post;
          })
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, []);

  const uploadImages = useCallback(async (
    files: MobileFile[],
    path: 'posts' | 'event_images' | 'businesses' | 'avatars'
  ): Promise<string[]> => {
    if (!user) return [];
    
    // Check if files is valid and has items
    if (!files || files.length === 0) {
      return [];
    }
    
    const uploadedUrls = await Promise.all(
        Array.from(files).map(async (file) => {
            // Additional check for individual file
            if (!file || !file.uri || !file.name) {
              return null;
            }
            
            try {
              const { url, error } = await StorageService.uploadPostImage(user.id, file);
              if (error) {
                  return null;
              }
              return url;
            } catch (error) {
              return null;
            }
        })
    );
    return uploadedUrls.filter(url => url !== null) as string[];
  }, [user]);

  const createPost = useCallback(
    async (
      postData: Partial<Omit<Post, 'id'>>,
      postIdToUpdate?: string,
      imageFiles?: MobileFile[],
      videoFile?: MobileFile
    ) => {
      if (!user || !profile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }

      try {
        if (postIdToUpdate) {
            const { data: existingPost } = await supabase.from('posts').select('created_at, timestamp').eq('id', postIdToUpdate).single();
            if (existingPost) {
                const postTime = new Date(existingPost.created_at || existingPost.timestamp || Date.now()).getTime();
                if ((Date.now() - postTime) > 15 * 60 * 1000) {
                    toast({ variant: 'destructive', title: 'Edit expired', description: 'Posts can only be edited within 15 minutes of creation.' });
                    return;
                }
            }
        }

        let imageUrls: string[] = [];
        
        // For editing: preserve existing images
        if (postIdToUpdate && postData.image_urls) {
          imageUrls = [...postData.image_urls];
        }
        
        // Add new images if any are uploaded
        if (imageFiles && imageFiles.length > 0) {
            const uploadedUrls = await uploadImages(imageFiles, postData.category === 'Event' ? 'event_images' : 'posts');
            imageUrls = [...imageUrls, ...uploadedUrls];
        }

        // Upload video if provided (new posts only)
        let videoUrl: string | null = null;
        let videoThumbnailUrl: string | null = null;
        if (videoFile && !postIdToUpdate) {
          const { url, error: videoError } = await StorageService.uploadPostVideo(user.id, videoFile);
          if (videoError) {
            const errMsg = typeof videoError === 'string' ? videoError : 'Please try a smaller or shorter clip.';
            toast({ variant: 'destructive', title: 'Video upload failed', description: errMsg });
            return;
          }
          videoUrl = url;
        }

        // Clean up the data to remove undefined values and exclude imageFiles
        const cleanedPostData = Object.fromEntries(
          Object.entries(postData).filter(([key, value]) => 
            value !== undefined && key !== 'imageFiles'
          )
        );

        // Auto-stamp the creator's location from their profile
        const userLocation = profile.location as { state?: string; lga?: string; ward?: string } | undefined;

        const finalPostData = {
          ...cleanedPostData,
          user_id: user.id,
          author_name: profile.name || 'Anonymous',
          author_image: profile.avatar_url || '',
          image_urls: imageUrls.length > 0 ? imageUrls : [],
          video_url: videoUrl,
          video_thumbnail_url: videoThumbnailUrl,
          timestamp: postIdToUpdate ? postData.timestamp : new Date().toISOString(),
          category: postData.category || 'General',
          // Location stamping — only set on new posts, preserve on edits
          ...(postIdToUpdate ? { updated_at: new Date().toISOString() } : {
            state: userLocation?.state || null,
            lga: userLocation?.lga || null,
            ward: userLocation?.ward || null,
            author_location: userLocation ? { state: userLocation.state, lga: userLocation.lga, ward: userLocation.ward } : null,
          }),
        };

        if (postIdToUpdate) {
            const { data: updatedPost, error } = await supabase
              .from('posts')
              .update(finalPostData)
              .eq('id', postIdToUpdate)
              .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url, created_at)`)
              .single();
            
            if (error) throw error;
            if (updatedPost) {
              setPosts(prev => prev.map(p => p.id === updatedPost.id ? (updatedPost as Post) : p));
            }
            toast({ title: 'Success', description: 'Post updated successfully.' });
        } else {
            const { data: newPost, error } = await supabase
              .from('posts')
              .insert({
                ...finalPostData,
                comment_count: 0,
                liked_by: [],
              })
              .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url, created_at)`)
              .single();
            
            if (error) throw error;
            if (newPost) {
              setPosts(prev => {
                if (prev.some(p => p.id === newPost.id)) return prev;
                return [newPost as Post, ...prev];
              });
            }
            toast({ title: 'Success', description: 'Post created successfully.' });
        }
        
        // Update user activity after successful post creation/update
        if (user) {
          await UserActivityService.updateUserActivity(user.id);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save post.' });
      }
    },
    [user, profile, toast, uploadImages]
  );

  const createBusiness = useCallback(
    async (
      businessData: Omit<Business, 'id' | 'owner_id' | 'created_at'>,
      businessIdToUpdate?: string,
      imageFiles?: MobileFile[]
    ) => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }

      try {
        let imageUrls: string[] = businessData.image_urls || [];
        if (imageFiles && imageFiles.length > 0) {
            const uploadedUrls = await uploadImages(imageFiles, 'businesses');
            imageUrls = businessIdToUpdate ? [...imageUrls, ...uploadedUrls] : uploadedUrls;
        }

        // Auto-stamp the creator's location from their profile
        const bizLocation = profile?.location as { state?: string; lga?: string; ward?: string } | undefined;

        const finalBusinessData = {
            ...businessData,
            owner_id: user.id,
            image_urls: imageUrls,
            // Location stamping — only set on new businesses, preserve on edits
            ...(businessIdToUpdate ? {} : {
              state: bizLocation?.state || null,
              lga: bizLocation?.lga || null,
              ward: bizLocation?.ward || null,
              admin_location: bizLocation ? { state: bizLocation.state, lga: bizLocation.lga, ward: bizLocation.ward } : null,
            }),
        }

        if (businessIdToUpdate) {
            const { error } = await supabase
                .from('businesses')
                .update(finalBusinessData)
                .eq('id', businessIdToUpdate);
            
            if (error) throw error;
            toast({ title: 'Success', description: 'Business updated successfully.' });
        } else {
            const { error } = await supabase
                .from('businesses')
                .insert({
                    ...finalBusinessData,
                    created_at: new Date().toISOString(),
                });
            
            if (error) throw error;
            toast({ title: 'Success', description: 'Business added successfully.' });
        }
        
        // Update user activity after successful business creation/update
        if (user) {
          await UserActivityService.updateUserActivity(user.id);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save business.' });
      }
    },
    [user, profile, toast, uploadImages]
  );

  const deletePost = useCallback(
    async (postId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to delete a post.' });
            return;
        }
        try {
            let table = 'posts';
            // First, get the post to retrieve image and video URLs
            let { data: postData, error: fetchError } = await supabase
                .from('posts')
                .select('image_urls, video_url')
                .eq('id', postId)
                .single();

            if (fetchError || !postData) {
                // Might be an event
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .select('cover_image_url')
                    .eq('id', postId)
                    .single();
                    
                if (eventError || !eventData) {
                    throw new Error('Item not found');
                }
                
                table = 'events';
                postData = {
                    image_urls: eventData.cover_image_url ? [eventData.cover_image_url] : [],
                    video_url: null
                } as any;
            }

            // Delete the item from database
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', postId);
            
            if (error) throw error;

            // Delete associated images from storage
            if (postData?.image_urls && postData.image_urls.length > 0) {
                const deletePromises = postData.image_urls.map(async (imageUrl: string) => {
                    try {
                        // Extract the path from the full URL
                        const url = new URL(imageUrl);
                        const pathParts = url.pathname.split('/');
                        const bucket = pathParts[2]; // post-images
                        const path = pathParts.slice(3).join('/'); // posts/userId/filename
                        
                        const { error: deleteError } = await supabase.storage
                            .from(bucket)
                            .remove([path]);
                        
                        if (deleteError) {
                            // Error deleting image
                        }
                    } catch (error) {
                        // Error processing image deletion
                    }
                });

                await Promise.all(deletePromises);
            }

            // Delete associated video from storage
            if (postData?.video_url) {
                try {
                    const url = new URL(postData.video_url);
                    const pathParts = url.pathname.split('/');
                    const path = pathParts.slice(3).join('/');
                    await supabase.storage.from('post-videos').remove([path]);
                } catch {
                    // Non-fatal: video cleanup failed
                }
            }

            toast({ title: 'Success', description: 'Post deleted successfully.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete post.' });
        }
    },
    [user, toast]
  );

  const deleteBusiness = useCallback(
    async (businessId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to delete a business.' });
            return;
        }
        try {
            // First, get the business to retrieve image URLs
            const { data: businessData, error: fetchError } = await supabase
                .from('businesses')
                .select('image_urls')
                .eq('id', businessId)
                .single();

            if (fetchError) {
                // Error fetching business for deletion
            }

            const { error } = await supabase
                .from('businesses')
                .delete()
                .eq('id', businessId);
            
            if (error) throw error;

            // Delete associated images from storage
            if (businessData?.image_urls && businessData.image_urls.length > 0) {
                const deletePromises = businessData.image_urls.map(async (imageUrl: string) => {
                    try {
                        // Extract the path from the full URL
                        const url = new URL(imageUrl);
                        const pathParts = url.pathname.split('/');
                        const bucket = pathParts[2]; // post-images
                        const path = pathParts.slice(3).join('/'); // posts/userId/filename
                        
                        const { error: deleteError } = await supabase.storage
                            .from(bucket)
                            .remove([path]);
                        
                        if (deleteError) {
                            // Error deleting image
                        }
                    } catch (error) {
                        // Error processing image deletion
                    }
                });

                await Promise.all(deletePromises);
            }

            toast({ title: 'Success', description: 'Business deleted successfully.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete business.' });
        }
    },
    [user, toast]
  );

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, createPost, createBusiness, deletePost, deleteBusiness, refreshPosts };
};
