import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[Supabase] URL exists:', !!supabaseUrl)
console.log('[Supabase] URL starts with https:', supabaseUrl?.startsWith('https://'))
console.log('[Supabase] URL value:', supabaseUrl)
console.log('[Supabase] Anon key exists:', !!supabaseAnonKey)

if (!supabaseUrl) {
  throw new Error('[Supabase] VITE_SUPABASE_URL is missing. Set it in .env.local or Vercel environment variables.')
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(`[Supabase] VITE_SUPABASE_URL must start with https:// — got: "${supabaseUrl}"`)
}

if (supabaseUrl.includes('/auth/v1') || supabaseUrl.includes('/rest/v1')) {
  throw new Error(`[Supabase] VITE_SUPABASE_URL must be the bare project URL (e.g. https://<id>.supabase.co) — do not include /auth/v1 or /rest/v1. Got: "${supabaseUrl}"`)
}

if (!supabaseAnonKey) {
  throw new Error('[Supabase] VITE_SUPABASE_ANON_KEY is missing. Set it in .env.local or Vercel environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
