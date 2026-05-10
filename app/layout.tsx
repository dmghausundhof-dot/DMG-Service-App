import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DMG Service | Kundenportal',
  description: 'Verwalten Sie Ihre Anlagen, Termine und Dokumente – einfach und übersichtlich. DMG Service Wiesloch.',
  manifest: '/manifest.json',
  icons: {
    icon: '/dmg-smart-house-logo.png',
    shortcut: '/dmg-smart-house-logo.png',
    apple: '/dmg-smart-house-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="bg-slate-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  )
}
