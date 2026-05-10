import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DMG Service | Kundenportal',
  description: 'Verwalten Sie Ihre Anlagen, Termine und Dokumente – einfach und übersichtlich. DMG Service Wiesloch.',
  manifest: '/manifest.json',
  applicationName: 'DMG Service',
  appleWebApp: {
    capable: true,
    title: 'DMG Service',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
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
