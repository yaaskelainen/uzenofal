import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '@/config/env';

// Singleton instance wrapper
let instance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!instance) {
    const config = getConfig();
    instance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return instance;
}
