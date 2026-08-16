import { supabase } from './supabase';

export class ModerationService {
  /**
   * Check if a text is safe using the moderate-content Edge Function
   */
  static async checkText(text: string): Promise<{ isSafe: boolean; reason?: string }> {
    if (!text || text.trim() === '') return { isSafe: true };

    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { type: 'text', content: text },
      });

      if (error) {
        console.error('[ModerationService] Error checking text:', error);
        // Fail open so we don't block users if the API is down
        return { isSafe: true };
      }

      return data;
    } catch (e) {
      console.error('[ModerationService] Exception checking text:', e);
      return { isSafe: true };
    }
  }

  /**
   * Check if an array of uploaded images is safe
   * @param bucket The Supabase storage bucket the images are stored in
   * @param paths The array of paths in the bucket, or public URLs
   */
  static async checkImages(bucket: string, paths: string[]): Promise<{ isSafe: boolean; reason?: string }> {
    if (!paths || paths.length === 0) return { isSafe: true };

    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { type: 'image', bucket, content: paths },
      });

      if (error) {
        console.error('[ModerationService] Error checking images:', error);
        // Fail open so we don't block users if the API is down
        return { isSafe: true };
      }

      return data;
    } catch (e) {
      console.error('[ModerationService] Exception checking images:', e);
      return { isSafe: true };
    }
  }
}
