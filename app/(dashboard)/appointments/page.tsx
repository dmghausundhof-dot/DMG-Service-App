'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle, MapPin, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'

// Base64 encoded DMG house logo (80x80 PNG, transparent background)
const DMG_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAB0ElEQVR4nO3aMU4DMRBG4QFBRQMdPXeBmgPQ0YRDgOAQ0NBxAGpyF3o6kBAVBRRoBYrExvZvexz7vTZR1v40kZXNmhEREfXa7u3iy3sNc217L2CuCa9lxGYBV9FaRdzyXsBqIVCfF3dB675/eExCPz87DXZpagJDp6ylaWwGMBalFcQmAFMxWkB0B1QRvBFdAXNt3hNxx+OiJTY8fWboCZ2r6hNYelpqT2NVwFqbq4lYDbD2ZNS6XhVA75OyZEUPkZ7hpopN4Ah4ZoUAR8EzKwA4Ep5ZZsDR8MwyHSIjwk3JEzgynpkIODqemQAI3k9JgOD9Fn2IbBLe4n1Z/BrB9842CS5XIfcWg77CI+KZhe17rfDch+wdHcauqdk+nl/+fW1uEpNvf+8/XXc3lW8nV9EeSadwj3hmafuKBuwVbyp2f+7/C296AIoBKAagWLY/lV6PL4Pfe7C8yXVZ93UwgWIAigEoBqAYgGIAigEo5vKE6t/m7sOF5nlfkgkUA1As21e45M+zmGqvgwkUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AsGjDlQexNKnZ/SRPYK2K1p/RTL9Zyve2HiIiIaE3fKyiFGxkYX8QAAAAASUVORK5CYII='

interface Appointment {
  id: string
  service_type: string
  preferred_date: string
  time_window: string | null
  urgency: string
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

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'emergency':
      return { label: 'Notfall', bg: 'bg-red-600/20 text-red-400' }
    case 'high':
      return { label: 'Hoch', bg: 'bg-orange-600/20 text-orange-400' }
    default:
      return { label: 'Normal', bg: 'bg-slate-600/20 text-slate-400' }
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profile?.id) {
        const { data: appointmentsData, count } = await supabase
          .from('appointments')
          .select(`
            id, 
            service_type, 
            preferred_date, 
            time_window, 
            urgency, 
            status, 
            description, 
            customer_notes, 
            object_id,
            objects (name, city),
            proposed_preferred_date,
            proposed_time_window,
            reschedule_reason
          `, { count: 'exact' })
          .order('preferred_date', { ascending: true })
          .limit(50)

        setAppointments((appointmentsData as Appointment[]) || [])
        setTotalAppointments(count || 0)
      }
      setLoading(false)
    }
    loadAppointments()
  }, [supabase])

  const upcoming = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.preferred_date) >= new Date())
  const overdue = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.preferred_date) < new Date())

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
    
    const colWidths = [50, 55, 35, 45, 45, 37]
    
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
      const headers = ['Service', 'Objekt', 'Datum', 'Zeitfenster', 'Status', 'Dringlichkeit']
      
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
      const urgencyInfo = getUrgencyBadge(appt.urgency)
      const objectInfo = appt.objects ? `${appt.objects.name}${appt.objects.city ? ' • ' + appt.objects.city : ''}` : '—'
      
      const rowData = [
        appt.service_type,
        objectInfo,
        new Date(appt.preferred_date).toLocaleDateString('de-DE'),
        appt.time_window || '—',
        statusInfo.label,
        urgencyInfo.label
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="text-emerald-500 text-sm font-semibold tracking-[2px] mb-2">TERMINÜBERSICHT</div>
          <h1 className="text-5xl font-semibold tracking-tighter">Meine Termine</h1>
          <p className="text-xl text-slate-400 mt-2">
            {upcoming.length} anstehend • {overdue.length} überfällig • {totalAppointments} gesamt
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToPDF}
            className="btn-secondary flex items-center gap-2 px-5 py-3 text-sm"
          >
            📄 Als PDF exportieren
          </button>
          <Link 
            href="/dashboard/appointments/new" 
            className="btn-primary flex items-center gap-3 text-base px-8 py-4 w-fit"
          >
            <Plus className="w-5 h-5" />
            Neuen Termin anfragen
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="Termine durchsuchen (Service, Objekt, Beschreibung...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-12 pr-10"
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
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-semibold mb-4">Noch keine Termine</h3>
          <p className="text-xl text-slate-400 max-w-md mx-auto mb-8">
            Fordern Sie Ihren ersten Termin an — z. B. für Wartung, Reparatur oder Montage.
          </p>
          <Link 
            href="/dashboard/appointments/new" 
            className="btn-primary inline-flex items-center gap-3 px-8 py-4 text-lg"
          >
            <Plus className="w-5 h-5" />
            Ersten Termin anfragen
          </Link>
        </div>
      ) : filteredAppointments.length === 0 && searchTerm ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-semibold mb-4">Keine Termine gefunden</h3>
          <p className="text-xl text-slate-400 max-w-md mx-auto mb-8">
            Keine Ergebnisse für „{searchTerm}“. Versuchen Sie eine andere Suche.
          </p>
          <button 
            onClick={() => setSearchTerm('')}
            className="btn-secondary"
          >
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        /* Appointments List */
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const statusInfo = getStatusBadge(appt.status)
            const urgencyInfo = getUrgencyBadge(appt.urgency)
            const StatusIcon = statusInfo.icon
            const isOverdue = appt.status !== 'completed' && appt.status !== 'cancelled' && new Date(appt.preferred_date) < new Date()

            return (
              <div key={appt.id} className="card p-6 hover:border-emerald-500/50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isOverdue ? 'bg-red-600/10' : 'bg-emerald-600/10'}`}>
                      <Calendar className={`w-8 h-8 ${isOverdue ? 'text-red-500' : 'text-emerald-500'}`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-xl tracking-tight group-hover:text-emerald-400 transition-colors">
                          {appt.service_type}
                        </h3>
                        {appt.objects && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {appt.objects.name} {appt.objects.city && `• ${appt.objects.city}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${urgencyInfo.bg}`}>
                          {urgencyInfo.label}
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(appt.preferred_date).toLocaleDateString('de-DE', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      {appt.time_window && (
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
