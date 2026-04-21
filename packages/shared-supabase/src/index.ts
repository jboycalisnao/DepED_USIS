import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://vubmvthbsnzzhmjbdces.supabase.co';
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Ym12dGhic256emhtamJkY2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTIwMTMsImV4cCI6MjA4MDY4ODAxM30.woE4szCZ6PAbTU54Rf5b9oqr5QPS9aaBh_qRmLJ3B8k';

const readEnv = (key: string): string | undefined => {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (viteEnv?.[key]) {
    return viteEnv[key];
  }

  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.[key];
};

const supabaseUrl = readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL') || fallbackSupabaseUrl;
const supabaseAnonKey =
  readEnv('VITE_SUPABASE_ANON_KEY') ||
  readEnv('SUPABASE_ANON_KEY') ||
  fallbackSupabaseAnonKey;

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
