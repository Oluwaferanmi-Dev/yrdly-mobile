import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = now.getTime() - past.getTime();

  if (elapsed < msPerMinute) {
    return 'Just now';
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + 'm ago';
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + 'h ago';
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + 'd ago';
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + 'mo ago';
  } else {
    return Math.round(elapsed / msPerYear) + 'y ago';
  }
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseSafePrice(priceVal: string | number | undefined | null): number {
  if (priceVal === undefined || priceVal === null || priceVal === '') return 0;
  if (typeof priceVal === 'number') return priceVal;
  // Remove all non-numeric characters except decimal points
  const cleaned = String(priceVal).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}