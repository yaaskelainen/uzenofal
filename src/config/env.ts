export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  dbAdapter: 'supabase' | 'inMemory';
}

export function getConfig(): EnvConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const rawDbAdapter = process.env.DB_ADAPTER;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not set in the environment');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set in the environment');
  }

  const dbAdapter = rawDbAdapter === 'inMemory' ? 'inMemory' : 'supabase';

  return {
    supabaseUrl,
    supabaseAnonKey,
    dbAdapter,
  };
}
