import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Max ms to wait for Supabase auth before unlocking the UI
const AUTH_TIMEOUT_MS = 5000
// Max ms to wait for a profile fetch before giving up
const FETCH_TIMEOUT_MS = 8000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let authResolved = false

    // Safety net: if Supabase never fires onAuthStateChange (e.g. bad env vars,
    // network unreachable), force loading:false so the UI doesn't stay frozen.
    const authTimeoutId = setTimeout(() => {
      if (!authResolved) {
        console.warn(
          '[AuthContext] Auth state did not resolve within timeout — forcing loading:false. ' +
          'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        )
        setLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    // onAuthStateChange fires INITIAL_SESSION immediately with the current session,
    // so getSession() is redundant and would cause fetchProfile to be called twice.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      authResolved = true
      clearTimeout(authTimeoutId)

      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(authTimeoutId)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    // Race the Supabase query against a timeout so a hanging network request
    // never leaves the app stuck on loading:true indefinitely.
    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('fetchProfile timeout')), FETCH_TIMEOUT_MS)
    )

    try {
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error('[AuthContext] Error fetching user profile:', error)
      } else if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('[AuthContext] fetchProfile did not complete in time or threw:', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    setProfile(null)
    return { error }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
