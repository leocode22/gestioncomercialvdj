import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // This will be visible in the browser console, helping diagnose Vercel deployments
  // where env vars may be missing or misconfigured.
  console.error(
    '[Supabase] CRITICAL: Missing environment variables.\n' +
    '  VITE_SUPABASE_URL:', supabaseUrl ? '✓ set' : '✗ MISSING', '\n' +
    '  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ set' : '✗ MISSING', '\n' +
    'The app will not be able to connect to the database.\n' +
    'In Vercel: go to Settings → Environment Variables and add both variables, then redeploy.'
  )
}

// Even with missing/wrong vars we create the client so the app renders
// (AuthContext has a 5s timeout fallback to unlock the UI in this case).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
