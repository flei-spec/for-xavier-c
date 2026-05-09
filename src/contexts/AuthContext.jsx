import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getMySpace } from '../lib/spaces'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [space,        setSpace]        = useState(null)
  const [loadingAuth,  setLoadingAuth]  = useState(true)
  const [loadingSpace, setLoadingSpace] = useState(false)

  const refreshSpace = useCallback(async (uid) => {
    if (!uid) { setSpace(null); return }
    setLoadingSpace(true)
    console.log('[AuthContext] refreshSpace for user:', uid)
    const s = await getMySpace(uid)
    console.log('[AuthContext] space resolved:', s?.id ?? 'none')
    setSpace(s)
    setLoadingSpace(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      console.log('[AuthContext] initial session user:', u?.id ?? 'none')
      setUser(u)
      setLoadingAuth(false)
      if (u) refreshSpace(u.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null
        console.log('[AuthContext] auth state change:', event, u?.id ?? 'none')
        setUser(u)
        setLoadingAuth(false)
        if (u) refreshSpace(u.id)
        else { setSpace(null); setLoadingSpace(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [refreshSpace])

  const value = {
    user,
    space,
    loadingAuth,
    loadingSpace,
    refreshSpace:  () => refreshSpace(user?.id),
    signOut:       () => supabase.auth.signOut(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
