import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
  type: string;
}

export function useCategories(type: 'marketplace' | 'event' | 'report') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, type')
          .eq('type', type)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err: any) {
        console.error(`Error fetching ${type} categories:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [type]);

  return { categories, loading, error };
}
