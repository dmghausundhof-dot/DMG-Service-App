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
  Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const baseNavItems = [
  { href: '/dashboard', label: 'Übersicht', icon: House },
  { href: '/dashboard/objects', label: 'Meine Objekte', icon: House },
  { href: '/dashboard/assets', label: 'Meine Anlagen', icon: Wrench },
  { href: '/dashboard/appointments', label: 'Termine', icon: Calendar },
  { href: '/dashboard/documents', label: 'Dokumente', icon: FileText },
  { href: '/dashboard/profile', label: 'Profil', icon: User },
]

const adminNavItem = { href: '/dashboard/admin/appointments', label: 'Admin: Anfragen', icon: Shield }

export default function DashboardLayout({
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
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, email')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.role === 'admin') {
          setUserRole('admin')
        }
        
        setUserName(profile?.full_name || user.email?.split('@')[0] || 'Kunde')
        setUserEmail(profile?.email || user.email || '')
      }
    }
    fetchUserData()
  }, [supabase])

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-72 flex-col bg-slate-900 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
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

        <div className="flex-1 px-3 py-8">
          <div className="px-3 mb-4 text-xs font-semibold text-slate-500 tracking-widest">MENÜ</div>
          <nav className="space-y-1">
            {(userRole === 'admin' ? [...baseNavItems, adminNavItem] : baseNavItems).map((item) => {
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

        <div className="p-6 border-t border-slate-800">
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
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

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          {children}
        </main>

        {/* Subtle Footer Contact */}
        <footer className="border-t border-slate-800 bg-slate-900 px-6 py-4 text-xs text-slate-500 flex items-center justify-between">
          <div>DMG Service • Wiesloch • Rhein-Neckar</div>
          <div className="flex items-center gap-4">
            <a href="tel:+49123456789" className="hover:text-emerald-400 transition">📞 0176 12345678</a>
            <a href="https://wa.me/4917612345678" target="_blank" className="hover:text-emerald-400 transition">💬 WhatsApp</a>
          </div>
        </footer>
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
              {(userRole === 'admin' ? [...baseNavItems, adminNavItem] : baseNavItems).map((item) => {
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
