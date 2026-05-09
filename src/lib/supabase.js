import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] ⚠️  Missing environment variables.\n' +
    '  Add to .env.local:\n' +
    '    VITE_SUPABASE_URL=https://<project>.supabase.co\n' +
    '    VITE_SUPABASE_ANON_KEY=<anon-key>\n' +
    '  For production: Vercel Dashboard → Project → Settings → Environment Variables'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
