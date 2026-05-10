'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { 
  House, 
  Calendar, 
  FileText, 
  Wrench, 
  User, 
  LogOut, 
  Menu, 
  X,
  Shield,
  FileUp,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

const baseNavItems = [
  { href: '/dashboard', label: 'Übersicht', icon: House },
  { href: '/dashboard/objects', label: 'Meine Objekte', icon: House },
  { href: '/dashboard/assets', label: 'Meine Anlagen', icon: Wrench },
  { href: '/dashboard/appointments', label: 'Termine', icon: Calendar },
  { href: '/dashboard/documents', label: 'Dokumente', icon: FileText },
  { href: '/dashboard/profile', label: 'Profil', icon: User },
]

const adminNavItems = [
  { href: '/dashboard/admin/appointments', label: 'Admin: Anfragen', icon: Shield },
  { href: '/dashboard/admin/documents/new', label: 'Admin: Belege', icon: FileUp },
]

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<'customer' | 'admin'>('customer')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await getOrCreateProfileId(supabase, user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.role === 'admin') {
        setUserRole('admin')
      }

      setUserName(profile?.full_name || user.email?.split('@')[0] || 'Kunde')
      setUserEmail(profile?.email || user.email || '')
    }
    fetchUserData()
  }, [supabase])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-950">
      {/* Desktop Sidebar: feste Höhe wie Viewport, wächst nicht mit Hauptinhalt */}
      <aside className="hidden h-full w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="shrink-0 border-b border-slate-800 p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image 
              src="/dmg-smart-house-logo.png" 
              alt="DMG Service Logo" 
              width={44} 
              height={44} 
              className="rounded-2xl" 
            />
            <div>
              <div className="font-semibold text-2xl tracking-tight">DMG Service</div>
              <div className="text-[10px] text-emerald-500 -mt-1 font-medium">KUNDENPORTAL</div>
            </div>
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-8">
          <div className="px-3 mb-4 text-xs font-semibold text-slate-500 tracking-widest">MENÜ</div>
          <nav className="space-y-1">
            {(userRole === 'admin' ? [...baseNavItems, ...adminNavItems] : baseNavItems).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-emerald-600/10 text-emerald-400' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{userName}</div>
              <div className="text-xs text-slate-500 truncate">{userEmail}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/50 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Hauptbereich scrollt eigenständig, Header/Footer bleiben im Layout */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur-md sm:h-20 sm:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="lg:hidden flex items-center gap-2">
              <Image 
                src="/dmg-smart-house-logo.png" 
                alt="DMG Service Logo" 
                width={32} 
                height={32} 
                className="rounded-xl" 
              />
              <div className="font-semibold text-lg">DMG Service</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Wiesloch
            </div>
            
            <Link 
              href="/dashboard/appointments/new" 
              className="btn-primary text-sm px-5 py-2.5 hidden sm:flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Termin anfragen
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[5.75rem] md:px-6 md:py-6 lg:p-10 lg:pb-10">
          {children}
        </main>

        <footer className="flex shrink-0 flex-col gap-1.5 border-t border-slate-800 bg-slate-900 px-4 py-2.5 text-[11px] leading-snug text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6 sm:py-3 sm:text-xs">
          <div className="truncate sm:truncate-none">DMG Service • Wiesloch • Rhein-Neckar</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <a
              href="tel:+49123456789"
              className="whitespace-nowrap hover:text-emerald-400 transition"
              title="0176 12345678"
            >
              <span className="sm:hidden">📞 Anruf</span>
              <span className="hidden sm:inline">📞 0176 12345678</span>
            </a>
            <a href="https://wa.me/4917612345678" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap hover:text-emerald-400 transition">
              💬 WhatsApp
            </a>
          </div>
        </footer>

        <Link
          href="/dashboard/appointments/new"
          className="lg:hidden fixed z-30 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] right-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-700 active:scale-[0.97]"
          aria-label="Termin anfragen"
        >
          <Calendar className="h-6 w-6" aria-hidden />
        </Link>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="w-80 bg-slate-900 h-full p-6" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Image 
                  src="/dmg-smart-house-logo.png" 
                  alt="DMG Service Logo" 
                  width={40} 
                  height={40} 
                  className="rounded-2xl" 
                />
                <div>
                  <div className="font-semibold text-xl">DMG Service</div>
                  <div className="text-[10px] text-emerald-500 -mt-1">KUNDENPORTAL</div>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              {(userRole === 'admin' ? [...baseNavItems, ...adminNavItems] : baseNavItems).map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-medium transition-all ${
                      isActive 
                        ? 'bg-emerald-600/10 text-emerald-400' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="absolute bottom-8 left-6 right-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm text-red-400 hover:bg-red-950/50 rounded-2xl transition-all border border-red-900/50"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
