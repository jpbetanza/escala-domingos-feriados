'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, loadUserData, seedDefaultVendors, resetStore, isLoadingData } = useStore()
  const pathname = usePathname()
  const router = useRouter()

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        const user = session.user
        setUser(user.id, user.email ?? null, user.user_metadata?.avatar_url ?? null)
        // Defer DB calls outside the auth lock — calling getSession() inside
        // onAuthStateChange deadlocks because the lock is already held by _initialize
        setTimeout(async () => {
          await loadUserData(user.id)
          const { vendors } = useStore.getState()
          if (vendors.length === 0) {
            await seedDefaultVendors(user.id)
          }
        }, 0)
      }
      if (event === 'SIGNED_OUT') {
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
