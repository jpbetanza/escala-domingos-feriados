'use client'

import { Shield } from 'lucide-react'
import { useStore } from '@/lib/store'

export function ActiveUserBanner() {
  const { isAdmin, activeUserEmail, sessionUserEmail } = useStore()
  if (!isAdmin || !activeUserEmail) return null

  const isOwnAccount = activeUserEmail === sessionUserEmail

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm md:hidden">
      <Shield className="h-4 w-4 text-primary" />
      <span className="text-muted-foreground">
        Editando {isOwnAccount ? 'sua própria conta' : activeUserEmail}
      </span>
    </div>
  )
}
