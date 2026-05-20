import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const readEnv = (key: string): string | undefined => {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (viteEnv?.[key]) {
    return viteEnv[key];
  }

  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.[key];
};

const supabaseUrl = readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'SPTA Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

const getSharedClient = (): SupabaseClient => {
  const globalScope = globalThis as typeof globalThis & {
    __sptaSharedSupabaseClient?: SupabaseClient;
  };

  if (!globalScope.__sptaSharedSupabaseClient) {
    globalScope.__sptaSharedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'spta-shared-auth-token',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return globalScope.__sptaSharedSupabaseClient;
};

export const learnerClient = getSharedClient();
export const adminClient = learnerClient;
export const supabase = learnerClient;
