'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle, MapPin, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import jsPDF from 'jspdf'

// Base64 encoded DMG house logo (80x80 PNG, transparent background)
const DMG_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAB0ElEQVR4nO3aMU4DMRBG4QFBRQMdPXeBmgPQ0YRDgOAQ0NBxAGpyF3o6kBAVBRRoBYrExvZvexz7vTZR1v40kZXNmhEREfXa7u3iy3sNc217L2CuCa9lxGYBV9FaRdzyXsBqIVCfF3dB675/eExCPz87DXZpagJDp6ylaWwGMBalFcQmAFMxWkB0B1QRvBFdAXNt3hNxx+OiJTY8fWboCZ2r6hNYelpqT2NVwFqbq4lYDbD2ZNS6XhVA75OyZEUPkZ7hpopN4Ah4ZoUAR8EzKwA4Ep5ZZsDR8MwyHSIjwk3JEzgynpkIODqemQAI3k9JgOD9Fn2IbBLe4n1Z/BrB9842CS5XIfcWg77CI+KZhe17rfDch+wdHcauqdk+nl/+fW1uEpNvf+8/XXc3lW8nV9EeSadwj3hmafuKBuwVbyp2f+7/C296AIoBKAagWLY/lV6PL4Pfe7C8yXVZ93UwgWIAigEoBqAYgGIAigEo5vKE6t/m7sOF5nlfkgkUA1As21e45M+zmGqvgwkUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AsGjDlQexNKnZ/SRPYK2K1p/RTL9Zyve2HiIiIaE3fKyiFGxkYX8QAAAAASUVORK5CYII='

interface Appointment {
  id: string
  service_type: string
  preferred_date: string | null
  time_window: string | null
  status: string
  description: string | null
  customer_notes: string | null
  object_id: string
  objects: {
    name: string
    city: string | null
  } | null
  // Reschedule fields
  proposed_preferred_date?: string | null
  proposed_time_window?: string | null
  reschedule_reason?: string | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Abgeschlossen', bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50', icon: CheckCircle }
    case 'in_progress':
      return { label: 'In Bearbeitung', bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50', icon: Clock }
    case 'confirmed':
      return { label: 'Bestätigt', bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50', icon: CheckCircle }
    case 'cancelled':
      return { label: 'Storniert', bg: 'bg-red-600/20 text-red-400 border-red-900/50', icon: AlertTriangle }
    case 'reschedule_requested':
      return { label: 'Änderung angefragt', bg: 'bg-purple-600/20 text-purple-400 border-purple-900/50', icon: Clock }
    default:
      return { label: 'Angefragt', bg: 'bg-amber-600/20 text-amber-400 border-amber-900/50', icon: Calendar }
  }
}

export default function AppointmentsListPage() {
  const supabase = createClient()
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [totalAppointments, setTotalAppointments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const pid = await getOrCreateProfileId(supabase, user)

      if (pid) {
        const { data: userObjs } = await supabase.from('objects').select('id').eq('profile_id', pid)
        const objectIds = userObjs?.map((o) => o.id) ?? []
        const idFilter =
          objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000']

        const { data: appointmentsData, count } = await supabase
          .from('appointments')
          .select(`
            id, 
            service_type, 
            preferred_date, 
            time_window, 
            status, 
            description, 
            customer_notes, 
            object_id,
            objects (name, city),
            proposed_preferred_date,
            proposed_time_window,
            reschedule_reason
          `, { count: 'exact' })
          .in('object_id', idFilter)
          .order('created_at', { ascending: false })
          .limit(50)

        const rows = appointmentsData ?? []
        const normalized: Appointment[] = rows.map((row) => {
          const rel = row.objects as
            | { name: string; city: string | null }
            | { name: string; city: string | null }[]
            | null
          const objects = Array.isArray(rel) ? rel[0] ?? null : rel
          return { ...row, objects }
        })
        setAppointments(normalized)
        setTotalAppointments(count || 0)
      }
      setLoading(false)
    }
    loadAppointments()
  }, [supabase])

  const todayYmd = new Date().toISOString().slice(0, 10)

  const awaitingDate = appointments.filter(
    (a) =>
      a.status !== 'completed' &&
      a.status !== 'cancelled' &&
      (a.preferred_date == null || String(a.preferred_date).trim() === ''),
  )

  const upcoming = appointments.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled') return false
    const pd = a.preferred_date?.trim()
    if (!pd) return false
    return pd >= todayYmd
  })

  const overdue = appointments.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled') return false
    const pd = a.preferred_date?.trim()
    if (!pd) return false
    return pd < todayYmd
  })

  const filteredAppointments = appointments.filter(appt => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (
      appt.service_type.toLowerCase().includes(term) ||
      (appt.objects?.name?.toLowerCase().includes(term) ?? false) ||
      (appt.description?.toLowerCase().includes(term) ?? false) ||
      (appt.customer_notes?.toLowerCase().includes(term) ?? false) ||
      appt.status.toLowerCase().includes(term)
    )
  })

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = 297
    const pageHeight = 210
    const margin = 15
    const usableWidth = pageWidth - margin * 2
    const headerHeight = 28
    const footerHeight = 10
    const rowHeight = 7
    const usableHeight = pageHeight - margin * 2 - headerHeight - footerHeight - 5
    
    const rowsToExport = searchTerm.trim() ? filteredAppointments : appointments
    const rowsPerPage = Math.floor(usableHeight / rowHeight)
    const totalPages = Math.max(1, Math.ceil(rowsToExport.length / rowsPerPage))
    
    const colWidths = [58, 62, 42, 52, 53]
    
    let currentPage = 1
    let yPos = margin + 3
    
    const drawHeader = (pageNum: number) => {
      doc.addImage(DMG_LOGO_BASE64, 'PNG', margin, 6, 14, 14)
      
      doc.setFontSize(16)
      doc.setTextColor(16, 185, 129)
      doc.text('DMG Service', margin + 18, 11)
      
      doc.setFontSize(9)
      doc.setTextColor(75, 85, 99)
      doc.text('Kundenportal • Termin-Übersicht', margin + 18, 17)
      
      doc.setFontSize(7)
      doc.setTextColor(107, 114, 128)
      doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, margin + 18, 22)
      
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.6)
      doc.line(margin, 26, pageWidth - margin, 26)
      
      yPos = 30
      
      // Table header
      const headers = ['Service', 'Objekt', 'Datum', 'Zeitfenster', 'Status']
      
      doc.setFillColor(16, 185, 129)
      doc.rect(margin, yPos, usableWidth, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      
      let xPos = margin + 2
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPos + 4)
        xPos += colWidths[i]
      })
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(31, 41, 55)
    }
    
    const drawFooter = (pageNum: number) => {
      doc.setDrawColor(209, 213, 219)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
      
      doc.setFontSize(6)
      doc.setTextColor(107, 114, 128)
      doc.text('DMG Service Kundenportal • Vertraulich • Alle Termine in Supabase', margin, pageHeight - 6)
      doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth - margin - 22, pageHeight - 6)
    }
    
    drawHeader(currentPage)
    
    rowsToExport.forEach((appt, index) => {
      if (yPos > pageHeight - 18) {
        drawFooter(currentPage)
        doc.addPage()
        currentPage++
        yPos = margin + 3
        drawHeader(currentPage)
      }
      
      const statusInfo = getStatusBadge(appt.status)
      const objectInfo = appt.objects ? `${appt.objects.name}${appt.objects.city ? ' • ' + appt.objects.city : ''}` : '—'
      
      const rowData = [
        appt.service_type,
        objectInfo,
        appt.preferred_date
          ? new Date(appt.preferred_date).toLocaleDateString('de-DE')
          : 'Noch offen',
        appt.time_window || '—',
        statusInfo.label,
      ]
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, yPos - 1, usableWidth, rowHeight, 'F')
      }
      
      let xPos = margin + 2
      rowData.forEach((cell, i) => {
        doc.setTextColor(31, 41, 55)
        doc.text(String(cell).substring(0, i === 0 ? 28 : i === 1 ? 32 : 20), xPos, yPos + 4.5)
        xPos += colWidths[i]
      })
      
      yPos += rowHeight
    })
    
    drawFooter(currentPage)
    
    doc.save(`DMG-Termine-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between lg:mb-10">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">TERMINÜBERSICHT</div>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Meine Termine</h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            {awaitingDate.length} ohne Termindatum • {upcoming.length} geplant • {overdue.length} überfällig •{' '}
            {totalAppointments} gesamt
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={exportToPDF}
            className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            📄 Als PDF exportieren
          </button>
          <Link href="/dashboard/appointments/new" className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
            <Plus className="h-5 w-5 shrink-0" />
            Neuen Termin anfragen
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-5 sm:mb-8">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5 shrink-0" aria-hidden />
          </div>
          <input 
            type="text" 
            placeholder="Termine durchsuchen…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-slate-500 mt-2">
            {filteredAppointments.length} Ergebnisse für „{searchTerm}“
          </p>
        )}
      </div>

      {/* Empty State */}
      {appointments.length === 0 ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Calendar className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Noch keine Termine</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Fordern Sie Ihren ersten Termin an — z. B. für Wartung, Reparatur oder Montage.
          </p>
          <Link href="/dashboard/appointments/new" className="btn-primary inline-flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 shrink-0" />
            Ersten Termin anfragen
          </Link>
        </div>
      ) : filteredAppointments.length === 0 && searchTerm ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Search className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Keine Termine gefunden</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Keine Ergebnisse für „{searchTerm}“. Versuchen Sie eine andere Suche.
          </p>
          <button type="button" onClick={() => setSearchTerm('')} className="btn-secondary">
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        /* Appointments List */
        <div className="space-y-3 sm:space-y-4">
          {filteredAppointments.map((appt) => {
            const statusInfo = getStatusBadge(appt.status)
            const StatusIcon = statusInfo.icon
            const pd = appt.preferred_date?.trim()
            const isOverdue =
              appt.status !== 'completed' &&
              appt.status !== 'cancelled' &&
              Boolean(pd) &&
              pd! < todayYmd
            const noDateYet = !pd

            return (
              <div key={appt.id} className="card p-5 transition-all group hover:border-emerald-500/50 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <div className="shrink-0">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${isOverdue ? 'bg-red-600/10' : 'bg-emerald-600/10'}`}>
                      <Calendar className={`h-7 w-7 sm:h-8 sm:w-8 ${isOverdue ? 'text-red-500' : 'text-emerald-500'}`} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-emerald-400 sm:text-xl">
                          {appt.service_type}
                        </h3>
                        {appt.objects && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {appt.objects.name} {appt.objects.city && `• ${appt.objects.city}`}
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusInfo.label}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {noDateYet ? (
                          <span className="text-amber-400/95">Termindatum durch DMG – noch nicht festgelegt</span>
                        ) : (
                          new Date(pd!).toLocaleDateString('de-DE', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        )}
                      </div>
                      {appt.time_window && !noDateYet && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {appt.time_window}
                        </div>
                      )}
                    </div>

                    {appt.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {appt.description}
                      </p>
                    )}

                    {appt.customer_notes && (
                      <div className="text-xs text-slate-500 italic">
                        Ihre Notiz: {appt.customer_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2 md:items-end">
                    <Link 
                      href={`/dashboard/appointments/${appt.id}`} 
                      className="btn-secondary text-sm px-5 py-2 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                      Details
                    </Link>
                    {appt.status === 'requested' && (
                      <button 
                        onClick={() => alert('Hier würde der Termin bearbeitet oder storniert werden.')}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1"
                      >
                        Stornieren
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
