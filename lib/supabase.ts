import { createBrowserClient } from '@supabase/ssr'

// Validate environment variables
function validateEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables:', {
      url: url ? 'present' : 'MISSING',
      key: key ? 'present' : 'MISSING',
    })
    throw new Error(
      'Missing Supabase environment variables. Check your .env.local file and restart the dev server.'
    )
  }

  // Remove trailing slash if present
  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url

  return { url: cleanUrl, key }
}

// Create the client
function createClient() {
  const { url, key } = validateEnvVars()
  
  return createBrowserClient(url, key)
}

// Singleton instance - only create in browser
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export const supabase = (() => {
  // Return null during SSR (will be recreated on client)
  if (typeof window === 'undefined') {
    return null as any
  }

  // Create singleton in browser
  if (!browserClient) {
    browserClient = createClient()
  }
  
  return browserClient
})()

// Export a getter function for safer access
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser')
  }
  
  if (!browserClient) {
    browserClient = createClient()
  }
  
  return browserClient
}