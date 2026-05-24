'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, CalendarDays, LogOut, UserCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cronograma', label: 'Cronograma', icon: Calendar },
  { href: '/vendedores', label: 'Vendedores', icon: Users },
  { href: '/feriados', label: 'Datas', icon: CalendarDays },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const {
    sessionUserEmail,
    sessionUserAvatar,
    activeUserId,
    activeUserEmail,
    manageableUsers,
    isAdmin,
    switchActiveUser,
    resetStore,
  } = useStore()

  // Don't render sidebar on auth routes
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    resetStore()
    router.push('/login')
  }

  const isEditingAnotherUser = isAdmin && activeUserEmail && activeUserEmail !== sessionUserEmail

  const accountSummary = (
    <>
      {sessionUserEmail && (
        <div className="flex items-center gap-2 px-2 py-1">
          {sessionUserAvatar ? (
            <Image
              src={sessionUserAvatar}
              alt="Avatar"
              width={28}
              height={28}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary">
                {sessionUserEmail[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{sessionUserEmail}</p>
            {isEditingAnotherUser && (
              <p className="text-[11px] text-primary truncate">Editando {activeUserEmail}</p>
            )}
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="space-y-1 px-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Usuário ativo
          </div>
          <Select value={activeUserId ?? undefined} onValueChange={(value) => void switchActiveUser(value)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Selecionar usuário" />
            </SelectTrigger>
            <SelectContent>
              {manageableUsers.map((user) => (
                <SelectItem key={user.userId} value={user.userId}>
                  {user.email ?? user.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-sidebar h-screen overflow-y-auto">
        <div className="px-4 py-5 border-b">
          <h1 className="font-bold text-lg text-sidebar-foreground">Escala Loja</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Cronograma de vendedores</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User info + sign out */}
        <div className="p-3 border-t space-y-2">
          {accountSummary}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center transition-colors',
              pathname === href
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* User / logout */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center transition-colors text-muted-foreground">
              {sessionUserAvatar ? (
                <Image src={sessionUserAvatar} alt="Avatar" width={20} height={20} className="rounded-full" />
              ) : (
                <UserCircle className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">Conta</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-56 mb-1">
            <div className="pb-3 mb-3 border-b space-y-2">{accountSummary}</div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </PopoverContent>
        </Popover>
      </nav>
    </>
  )
}
