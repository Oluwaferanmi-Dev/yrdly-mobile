/**
 * Event Service — all Supabase interactions for the events & ticketing system.
 * Server-side safe (no Flutterwave SDK usage here).
 */

import { supabase } from './supabase';
import type { Event, TicketTier, Ticket, EventPayout } from '@/types/events';
import { EVENT_CONSTANTS } from '@/lib/constants';

const EVENT_COMMISSION = EVENT_CONSTANTS.COMMISSION_RATE;

// ── PUBLIC QUERIES ────────────────────────────────────────────────────────────

export async function getPublishedEvents(opts?: {
  state?: string;
  lga?: string;
  ward?: string;
  category?: string;
  limit?: number;
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select(`
      *,
      organizer:users!events_organizer_id_fkey(id, name, avatar_url),
      ticket_tiers(*)
    `)
    .eq('status', 'PUBLISHED')
    .order('start_time', { ascending: true });

  if (opts?.state) query = query.eq('state', opts.state);
  if (opts?.lga) query = query.eq('lga', opts.lga);
  if (opts?.ward) query = query.eq('ward', opts.ward);
  if (opts?.category) query = query.eq('category', opts.category);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(enrichEventTiers);
}

export async function getEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:users!events_organizer_id_fkey(id, name, avatar_url),
      ticket_tiers(*)
    `)
    .eq('id', id)
    .single();

  if (!error && data) {
    return enrichEventTiers(data);
  }

  // Fallback to legacy posts table
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('category', 'Event')
    .single();

  if (postError || !postData) return null;
  return mapPostToEvent(postData);
}

export function mapPostToEvent(post: any): Event {
  const priceText = post.price ? `₦${post.price}` : 'Free';
  const desc = post.description || post.text || '';
  const descriptionWithPrice = desc + (desc ? '\n\n' : '') + `Price: ${priceText} (Legacy Event)`;

  return {
    id: post.id,
    organizer_id: post.user_id,
    title: post.title || post.text || 'Untitled Event',
    description: descriptionWithPrice,
    category: 'Event',
    cover_image_url: post.image_urls?.[0] || post.image_url || null,
    location_address: post.event_location?.address || [post.ward, post.lga, post.state].filter(Boolean).join(', ') || null,
    location_online: false,
    online_link: null,
    lat: post.event_location?.lat || null,
    lng: post.event_location?.lng || null,
    ward: post.ward || null,
    lga: post.lga || null,
    state: post.state || null,
    start_time: post.event_date || post.timestamp,
    end_time: null,
    timezone: 'Africa/Lagos',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    payout_mode: 'INSTANT',
    payout_released_at: null,
    payment_subaccount_id: null,
    published_at: post.timestamp,
    scheduled_publish_at: null,
    attendee_count: 0,
    created_at: post.created_at || post.timestamp,
    updated_at: post.updated_at || post.timestamp,
    organizer: {
      id: post.user_id,
      name: post.author_name || 'Organizer',
      avatar_url: post.author_image || undefined,
    },
    ticket_tiers: [],
  };
}

export async function getOrganizerEvents(organizerId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`*, ticket_tiers(*)`)
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(enrichEventTiers);
}

// ── TICKET QUERIES ────────────────────────────────────────────────────────────

export async function getMyTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events(id, title, cover_image_url, start_time, end_time, location_address, location_online, online_link, status),
      tier:ticket_tiers(id, name, price)
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTicketByToken(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events(id, title, cover_image_url, start_time, end_time, location_address, status),
      tier:ticket_tiers(id, name, price)
    `)
    .eq('id', ticketId)
    .single();

  if (error) return null;
  return data;
}

export async function getEventTickets(eventId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`*, tier:ticket_tiers(id, name, price)`)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ── EVENT PAYOUT HELPERS ──────────────────────────────────────────────────────

export function calculateEventPayout(grossAmount: number) {
  const commission = Math.round(grossAmount * EVENT_COMMISSION * 100) / 100;
  const net = Math.round((grossAmount - commission) * 100) / 100;
  return { gross: grossAmount, commission, net };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function enrichEventTiers(event: any): Event {
  if (!event.ticket_tiers) return event;
  return {
    ...event,
    ticket_tiers: event.ticket_tiers.map((t: TicketTier) => ({
      ...t,
      available: t.capacity == null ? null : Math.max(0, t.capacity - t.sold),
      is_sold_out: t.capacity != null && t.sold >= t.capacity,
    })),
  };
}
