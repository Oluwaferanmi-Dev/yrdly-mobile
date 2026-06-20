import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../hooks/use-supabase-auth';

export interface LocationFilter {
  state?: string;
  lga?: string;
  ward?: string;
}

interface LocationContextType {
  userProfileLocation: LocationFilter | null;
  activeFilter: LocationFilter | null;
  setGlobalFilter: (filter: LocationFilter | null) => void;
  hasLocation: boolean;
  displayLabel: string;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const GLOBAL_FILTER_STORAGE_KEY = 'yrdly_global_filter';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  const profileLocation = profile?.location as any;
  const userState = profileLocation?.state || null;
  const userLga = profileLocation?.lga || null;
  const userWard = profileLocation?.ward || null;
  const hasLocation = !!userState;

  const userProfileLocation: LocationFilter | null = hasLocation 
    ? { state: userState, lga: userLga, ward: userWard } 
    : null;

  const [activeFilter, setActiveFilterRaw] = useState<LocationFilter | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadPersistedFilter = async () => {
      try {
        const savedData = await SecureStore.getItemAsync(GLOBAL_FILTER_STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setActiveFilterRaw(parsed);
        } else if (hasLocation) {
          setActiveFilterRaw({ state: userState, lga: userLga });
        }
      } catch {
        if (hasLocation) {
          setActiveFilterRaw({ state: userState, lga: userLga });
        }
      } finally {
        setIsInitialized(true);
      }
    };
    loadPersistedFilter();
  }, [hasLocation, userState, userLga]);

  const setGlobalFilter = useCallback(async (newFilter: LocationFilter | null) => {
    setActiveFilterRaw(newFilter);
    try {
      if (newFilter) {
        await SecureStore.setItemAsync(GLOBAL_FILTER_STORAGE_KEY, JSON.stringify(newFilter));
      } else {
        await SecureStore.deleteItemAsync(GLOBAL_FILTER_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Build the display label
  let displayLabel = "All Nigeria";
  if (activeFilter) {
    if (activeFilter.ward && activeFilter.lga) {
      displayLabel = `${activeFilter.ward}, ${activeFilter.lga}`;
    } else if (activeFilter.lga && activeFilter.state) {
      displayLabel = `${activeFilter.lga}, ${activeFilter.state}`;
    } else if (activeFilter.state) {
      displayLabel = `${activeFilter.state} State`;
    }
  } else if (!isInitialized && hasLocation) {
    displayLabel = userLga ? `${userLga}, ${userState}` : `${userState} State`;
  }

  return (
    <LocationContext.Provider
      value={{
        userProfileLocation,
        activeFilter,
        setGlobalFilter,
        hasLocation,
        displayLabel,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
