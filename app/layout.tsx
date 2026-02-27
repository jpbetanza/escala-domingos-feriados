import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppSidebar } from '@/components/app-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/auth-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Escala Loja',
  description: 'Cronograma de vendedores para domingos e feriados',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // SUPABASE_URL / SUPABASE_PUBLISHABLE_DEFAULT_KEY are server-only env vars
  // (set in Portainer at runtime). Fallback to NEXT_PUBLIC_ variants for local dev.
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    ''

  return (
    <html lang="pt-BR">
      {/* Inject Supabase config at runtime so the browser client doesn't need
          NEXT_PUBLIC_ vars baked into the bundle at build time. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__supabaseConfig=${JSON.stringify({ url: supabaseUrl, key: supabaseKey })}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  )
}
