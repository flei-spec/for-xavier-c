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
    if (!uid) { setSpace(null); return null }
    setLoadingSpace(true)
    console.log('[AuthContext] refreshSpace — userId:', uid)
    const s = await getMySpace(uid)
    console.log('[AuthContext] refreshSpace — space:', s?.id ?? 'none')
    setSpace(s)
    setLoadingSpace(false)
    return s
  }, [])

  useEffect(() => {
    // Track whether getSession already handled the initial load so that the
    // INITIAL_SESSION event from onAuthStateChange doesn't trigger a second
    // redundant get_my_space RPC call — which would set loadingSpace true
    // again and confuse the pendingAction effect.
    let initialHandled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      console.log('[AuthContext] initial session:', u?.id ?? 'none')
      setUser(u)
      setLoadingAuth(false)
      if (u) {
        refreshSpace(u.id)
        initialHandled = true
      } else {
        setLoadingSpace(false)
        initialHandled = true
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip INITIAL_SESSION if getSession already handled it — prevents
        // the double refreshSpace race that makes loadingSpace bounce.
        if (event === 'INITIAL_SESSION' && initialHandled) return

        const u = session?.user ?? null
        console.log('[AuthContext] auth change:', event, '| user:', u?.id ?? 'none')
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
    refreshSpace: () => refreshSpace(user?.id),
    applySpace:   (s) => { console.log('[AuthContext] applySpace:', s?.id ?? 'none'); setSpace(s) },
    signOut:      () => supabase.auth.signOut(),
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
