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
  return (
    <html lang="pt-BR">
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
