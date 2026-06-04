/**
 * API helper for calling yrdly-app Next.js API routes from the mobile app.
 * Automatically attaches the authenticated user's Supabase JWT as a Bearer token.
 */
import { supabase } from './supabase';

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://yrdly.com';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  async post<T = any>(path: string, body: object): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${WEB_APP_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json as T;
  },

  async get<T = any>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${WEB_APP_URL}${path}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json as T;
  },
};

export { WEB_APP_URL };
