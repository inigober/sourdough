import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from './config.ts';

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const config = getSupabaseConfig();
  if (!config) {
    client = null;
    return client;
  }

  client = createClient(config.url, config.anonKey);
  return client;
}
