import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1endhaGx1bm9ib3hsa2ZmcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzc3OTcsImV4cCI6MjEwMjk1Mzc5N30.EJBRxSGxMJ0FDDbcewPGtuTsEixguo6EP1RjVzssCVo';

let browserClientInstance: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luzwahlunoboxlkffqry.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!browserClientInstance) {
    browserClientInstance = createClient(url, anonKey);
  }
  return browserClientInstance;
}

