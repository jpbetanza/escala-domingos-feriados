'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, loadManageableUsers, loadUserData, seedDefaultVendors, resetStore, isLoadingData } = useStore()
  const pathname = usePathname()
  const router = useRouter()
  // Guard against double-seeding when Supabase fires both INITIAL_SESSION and
  // SIGNED_IN for the same login (e.g. after Google OAuth redirect). Both events
  // schedule async callbacks concurrently; without this flag both would see an
  // empty vendor list and insert a duplicate set of default vendors.
  const isSeedingRef = useRef(false)
  // Supabase re-emits SIGNED_IN when the tab becomes visible again (e.g. after
  // minimizing the browser on mobile). Track which user is already loaded so
  // those events don't reload data or reset the admin's selected user.
  const loadedUserIdRef = useRef<string | null>(null)

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        const user = session.user
        if (loadedUserIdRef.current === user.id) return
        loadedUserIdRef.current = user.id
        setUser(user.id, user.email ?? null, user.user_metadata?.avatar_url ?? null)
        // Defer DB calls outside the auth lock — calling getSession() inside
        // onAuthStateChange deadlocks because the lock is already held by _initialize
        setTimeout(async () => {
          await loadManageableUsers()
          const { activeUserId } = useStore.getState()
          await loadUserData(activeUserId ?? user.id)
          const { vendors, activeUserId: loadedUserId } = useStore.getState()
          // Only seed the signed-in user's own account, never a user an admin is viewing
          if (loadedUserId === user.id && vendors.length === 0 && !isSeedingRef.current) {
            isSeedingRef.current = true
            await seedDefaultVendors(user.id)
          }
        }, 0)
      }
      if (event === 'SIGNED_OUT') {
        loadedUserIdRef.current = null
        resetStore()
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show spinner while loading data on protected routes
  if (!isAuthRoute && isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
