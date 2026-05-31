
import { createClient } from '@supabase/supabase-js';

const readEnv = (key: string): string | undefined => {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (viteEnv?.[key]) return viteEnv[key];
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.[key];
};

const supabaseUrl = readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL');
const supabaseKey = readEnv('VITE_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Attendance Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

type SupabaseGlobal = typeof globalThis & { __usisAttendanceSupabase?: ReturnType<typeof createClient> };
const globalWithSupabase = globalThis as SupabaseGlobal;

export const supabase =
  globalWithSupabase.__usisAttendanceSupabase ??
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: 'usis-attendance-auth',
    },
  });

if (!globalWithSupabase.__usisAttendanceSupabase) {
  globalWithSupabase.__usisAttendanceSupabase = supabase;
}
