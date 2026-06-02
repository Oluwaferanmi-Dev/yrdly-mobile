/**
 * Mobile Storage Service
 *
 * Replaces the web File/Blob/canvas APIs with React Native compatible equivalents.
 * On mobile, images come from expo-image-picker as URI strings (e.g. file:///...).
 * We upload via fetch + FormData so Supabase Storage receives the correct binary.
 */

import { supabase } from './supabase';

export interface MobileFile {
  uri: string;
  name: string;
  type: string; // MIME type, e.g. 'image/jpeg'
  size?: number;
}

export class StorageService {
  // Infer MIME type from file extension
  private static getMimeType(fileName: string, fallbackType?: string): string {
    if (fallbackType && fallbackType !== 'application/octet-stream') {
      return fallbackType;
    }

    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
      case 'heif':
        return 'image/jpeg'; // Expo image picker converts HEIC → JPEG automatically
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'webm':
        return 'video/webm';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Upload a file to Supabase Storage from a local URI (React Native).
   * Works with uris returned by expo-image-picker or expo-document-picker.
   */
  static async uploadFile(
    bucket: string,
    path: string,
    file: MobileFile,
    options?: { cacheControl?: string; contentType?: string }
  ): Promise<{ data: any; error: any }> {
    try {
      if (!file?.uri) {
        return { data: null, error: new Error('No file URI provided') };
      }

      const mimeType = options?.contentType || this.getMimeType(file.name, file.type);

      // Fetch the local file as a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: options?.cacheControl || '3600',
          upsert: false,
          contentType: mimeType,
        });

      if (error) {
        console.error('[StorageService] Upload error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('[StorageService] uploadFile error:', error);
      return { data: null, error };
    }
  }

  /** Get the public URL for a stored file */
  static getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /** Get a time-limited signed URL for a private file */
  static async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn = 3600
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /** Delete a stored file */
  static async deleteFile(
    bucket: string,
    path: string
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).remove([path]);
      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /** Upload a marketplace post image */
  static async uploadPostImage(
    postId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `posts/${postId}/${Date.now()}.${ext}`;

    const { data, error } = await this.uploadFile('post-images', path, file);
    if (error || !data) return { url: null, error };

    return { url: this.getPublicUrl('post-images', path), error: null };
  }

  /** Upload a chat image */
  static async uploadChatImage(
    conversationId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${conversationId}/${Date.now()}.${ext}`;

    const { data, error } = await this.uploadFile('chat-images', path, file);
    if (error || !data) return { url: null, error };

    return { url: this.getPublicUrl('chat-images', path), error: null };
  }

  /** Upload user avatar */
  static async uploadUserAvatar(
    userId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const mimeType = this.getMimeType(file.name, file.type);

    const { data, error } = await this.uploadFile('user-avatars', path, file, {
      contentType: mimeType,
    });

    if (error) {
      // Retry with upsert
      const response2 = await fetch(file.uri);
      const blob2 = await response2.blob();
      const { data: d2, error: e2 } = await supabase.storage
        .from('user-avatars')
        .upload(path, blob2, { cacheControl: '3600', upsert: true, contentType: mimeType });

      if (e2) return { url: null, error: e2 };
      return { url: this.getPublicUrl('user-avatars', d2?.path ?? path), error: null };
    }

    return { url: this.getPublicUrl('user-avatars', path), error: null };
  }

  /** Upload dispute evidence */
  static async uploadDisputeEvidence(
    transactionId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const safeName = file.name.replace(/\s+/g, '_');
    const path = `${transactionId}/${Date.now()}_${safeName}`;

    const { data, error } = await this.uploadFile('dispute-evidence', path, file);
    if (error || !data) return { url: null, error };

    return { url: this.getPublicUrl('dispute-evidence', path), error: null };
  }

  /** Upload a post video */
  static async uploadPostVideo(
    userId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const ext = file.name.split('.').pop() ?? 'mp4';
    const path = `${userId}/${Date.now()}.${ext}`;
    const mimeType = this.getMimeType(file.name, file.type);

    const { data, error } = await this.uploadFile('post-videos', path, file, {
      contentType: mimeType,
    });

    if (error || !data) return { url: null, error };
    return { url: this.getPublicUrl('post-videos', path), error: null };
  }

  /** Upload a chat video */
  static async uploadChatVideo(
    conversationId: string,
    file: MobileFile
  ): Promise<{ url: string | null; error: any }> {
    const ext = file.name.split('.').pop() ?? 'mp4';
    const path = `${conversationId}/${Date.now()}.${ext}`;
    const mimeType = this.getMimeType(file.name, file.type);

    const { data, error } = await this.uploadFile('chat-videos', path, file, {
      contentType: mimeType,
    });

    if (error || !data) return { url: null, error };
    return { url: this.getPublicUrl('chat-videos', path), error: null };
  }
}
