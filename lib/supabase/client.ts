import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
  interface Window {
    __supabaseConfig: { url: string; key: string }
  }
}

let _client: SupabaseClient | null = null

export function createClient() {
  if (!_client) {
    const { url, key } = window.__supabaseConfig
    _client = createBrowserClient(url, key)
  }
  return _client
}
