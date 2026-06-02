import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing async functions
 * @param asyncFn - The async function to debounce
 * @param delay - The delay in milliseconds
 * @returns Object with debounced function and loading state
 */
export function useDebouncedAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  delay: number
) {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        await asyncFn(...args);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    timeoutRef.current = newTimeoutId;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debouncedFn, isLoading };
}
