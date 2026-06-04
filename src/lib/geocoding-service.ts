/**
 * Mobile Geocoding Service
 * Uses expo-location for GPS + Nominatim (free, no key) for reverse geocoding
 * into Nigerian State → LGA. Falls back to manual picker if outside Nigeria.
 */

import * as Location from 'expo-location';
import lgasData from '../data/lgas.json';

export interface ResolvedLocation {
  state: string;
  lga: string;
  displayAddress: string;
  lat: number;
  lng: number;
}

export const OUTSIDE_NIGERIA = 'outside_nigeria';
export const PERMISSION_DENIED = 'permission_denied';

const LGAS: Record<string, string[]> = lgasData;

function normalise(name: string): string {
  return name
    .replace(/ Local Government Area$/i, '')
    .replace(/ LGA$/i, '')
    .replace(/ State$/i, '')
    .trim()
    .toLowerCase();
}

function matchState(nominatimState: string): string | null {
  const norm = normalise(nominatimState);
  return Object.keys(LGAS).find((k) => normalise(k) === norm) ?? null;
}

function matchLga(state: string, nominatimCounty: string): string | null {
  const lgas = LGAS[state] ?? [];
  const norm = normalise(nominatimCounty);
  return lgas.find((l) => normalise(l) === norm) ?? null;
}

async function nominatimReverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Yrdly-Mobile/1.0' },
  });
  if (!res.ok) throw new Error('Nominatim request failed');
  return res.json();
}

export async function detectLocation(): Promise<
  ResolvedLocation | { status: typeof OUTSIDE_NIGERIA | typeof PERMISSION_DENIED }
> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { status: PERMISSION_DENIED };

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude: lat, longitude: lng } = pos.coords;

  let nominatim: any;
  try {
    nominatim = await nominatimReverseGeocode(lat, lng);
  } catch {
    return { status: OUTSIDE_NIGERIA };
  }

  const addr = nominatim?.address ?? {};
  const countryCode = (addr.country_code ?? '').toLowerCase();
  if (countryCode !== 'ng') return { status: OUTSIDE_NIGERIA };

  const rawState = addr.state ?? addr.region ?? '';
  const matchedState = matchState(rawState);
  if (!matchedState) return { status: OUTSIDE_NIGERIA };

  const rawLga = addr.county ?? addr.city_district ?? addr.city ?? '';
  const matchedLga = matchLga(matchedState, rawLga) ?? (LGAS[matchedState]?.[0] ?? '');

  const city = addr.city ?? addr.town ?? addr.village ?? '';
  const displayAddress = [city, matchedLga, matchedState].filter(Boolean).join(', ');

  return { state: matchedState, lga: matchedLga, displayAddress, lat, lng };
}

export function getAllStates(): string[] {
  return Object.keys(LGAS).sort();
}

export function getLgasForState(state: string): string[] {
  return LGAS[state] ?? [];
}
