'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Home, MapPin, Search, X, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import jsPDF from 'jspdf'

interface ObjectItem {
  id: string
  name: string
  street: string | null
  postal_code: string | null
  city: string | null
  notes: string | null
  created_at: string
}

// Base64 encoded DMG house logo (80x80 PNG, transparent background) - for PDF
const DMG_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAB0ElEQVR4nO3aMU4DMRBG4QFBRQMdPXeBmgPQ0YRDgOAQ0NBxAGpyF3o6kBAVBRRoBYrExvZvexz7vTZR1v40kZXNmhEREfXa7u3iy3sNc217L2CuCa9lxGYBV9FaRdzyXsBqIVCfF3dB675/eExCPz87DXZpagJDp6ylaWwGMBalFcQmAFMxWkB0B1QRvBFdAXNt3hNxx+OiJTY8fWboCZ2r6hNYelpqT2NVwFqbq4lYDbD2ZNS6XhVA75OyZEUPkZ7hpopN4Ah4ZoUAR8EzKwA4Ep5ZZsDR8MwyHSIjwk3JEzgynpkIODqemQAI3k9JgOD9Fn2IbBLe4n1Z/BrB9842CS5XIfcWg77CI+KZhe17rfDch+wdHcauqdk+nl/+fW1uEpNvf+8/XXc3lW8nV9EeSadwj3hmafuKBuwVbyp2f+7/C296AIoBKAagWLY/lV6PL4Pfe7C8yXVZ93UwgWIAigEoBqAYgGIAigEo5vKE6t/m7sOF5nlfkgkUA1As21e45M+zmGqvgwkUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AsGjDlQexNKnZ/SRPYK2K1p/RTL9Zyve2HiIiIaE3fKyiFGxkYX8QAAAAASUVORK5CYII='

export default function ObjectsListPage() {
  const supabase = createClient()
  
  const [objects, setObjects] = useState<ObjectItem[]>([])
  const [totalObjects, setTotalObjects] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadObjects() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const pid = await getOrCreateProfileId(supabase, user)

      if (pid) {
        const { data: objectsData, count } = await supabase
          .from('objects')
          .select(`
            id, 
            name, 
            street, 
            postal_code, 
            city, 
            notes, 
            created_at
          `, { count: 'exact' })
          .eq('profile_id', pid)
          .order('created_at', { ascending: false })

        const loadedObjects = (objectsData as ObjectItem[]) || []
        setObjects(loadedObjects)
        setTotalObjects(count || 0)
      }
      setLoading(false)
    }
    loadObjects()
  }, [supabase])

  // Live filter
  const filteredObjects = objects.filter(obj => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    
    return (
      obj.name.toLowerCase().includes(term) ||
      (obj.street?.toLowerCase().includes(term) ?? false) ||
      (obj.city?.toLowerCase().includes(term) ?? false) ||
      (obj.postal_code?.toLowerCase().includes(term) ?? false) ||
      (obj.notes?.toLowerCase().includes(term) ?? false)
    )
  })

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const tableStartY = 45

    // Header with logo
    doc.addImage(DMG_LOGO_BASE64, 'PNG', margin, 10, 20, 20)
    doc.setFontSize(18)
    doc.setTextColor(16, 185, 129) // emerald
    doc.text('DMG Service - Meine Objekte', margin + 25, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Exportiert am ${new Date().toLocaleDateString('de-DE')} • ${filteredObjects.length} Objekte`, margin + 25, 28)

    // Table header
    doc.setFillColor(16, 185, 129)
    doc.rect(margin, tableStartY - 8, pageWidth - 2 * margin, 10, 'F')
    doc.setTextColor(255)
    doc.setFontSize(9)
    doc.text('Objektname', margin + 3, tableStartY - 2)
    doc.text('Adresse', margin + 55, tableStartY - 2)
    doc.text('PLZ / Ort', margin + 110, tableStartY - 2)
    doc.text('Notizen', margin + 145, tableStartY - 2)
    doc.text('Angelegt', margin + 195, tableStartY - 2)

    // Table rows
    let y = tableStartY + 2
    doc.setTextColor(0)
    doc.setFontSize(8)

    filteredObjects.forEach((obj, index) => {
      if (y > pageHeight - 25) {
        doc.addPage()
        y = 25
        // repeat header on new page
        doc.setFillColor(16, 185, 129)
        doc.rect(margin, y - 8, pageWidth - 2 * margin, 10, 'F')
        doc.setTextColor(255)
        doc.text('Objektname', margin + 3, y - 2)
        doc.text('Adresse', margin + 55, y - 2)
        doc.text('PLZ / Ort', margin + 110, y - 2)
        doc.text('Notizen', margin + 145, y - 2)
        doc.text('Angelegt', margin + 195, y - 2)
        y += 10
        doc.setTextColor(0)
      }

      const bgColor = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(margin, y - 6, pageWidth - 2 * margin, 8, 'F')

      doc.text(obj.name || '-', margin + 3, y)
      const address = [obj.street, obj.postal_code, obj.city].filter(Boolean).join(', ') || '-'
      doc.text(address.substring(0, 35), margin + 55, y)
      doc.text(obj.postal_code || obj.city || '-', margin + 110, y)
      doc.text((obj.notes || '-').substring(0, 25), margin + 145, y)
      doc.text(new Date(obj.created_at).toLocaleDateString('de-DE'), margin + 195, y)

      y += 8
    })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('DMG Service • Wiesloch • Rhein-Neckar • Kundenportal', margin, pageHeight - 10)
    doc.text(`Seite ${doc.getNumberOfPages()}`, pageWidth - margin - 20, pageHeight - 10)

    doc.save(`DMG-Objekte-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Objekte werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between lg:mb-10">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">OBJEKTÜBERSICHT</div>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Meine Objekte</h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            {totalObjects} Immobilien • Verwalten Sie Häuser, Wohnungen und Ferienimmobilien
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {objects.length > 0 && (
            <button
              type="button"
              onClick={exportToPDF}
              className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              📄 Als PDF exportieren
            </button>
          )}
          <Link href="/dashboard/objects/new" className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
            <Plus className="h-5 w-5 shrink-0" />
            Neues Objekt hinzufügen
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      {objects.length > 0 && (
        <div className="mb-5 sm:mb-8">
          <div className="relative max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen nach Name, Adresse, Notizen..."
              className="input w-full pl-12 pr-10 py-3 text-base"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-slate-500 mt-2">
              {filteredObjects.length} von {objects.length} Objekten gefunden
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {objects.length === 0 ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Home className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Noch keine Objekte</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Legen Sie Ihr erstes Objekt an — z. B. Ihr Haus, die Wohnung oder die Ferienimmobilie.
          </p>
          <Link href="/dashboard/objects/new" className="btn-primary inline-flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 shrink-0" />
            Erstes Objekt anlegen
          </Link>
        </div>
      ) : filteredObjects.length === 0 && searchTerm ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Search className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Keine Treffer</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Keine Objekte gefunden für „{searchTerm}“. Versuchen Sie eine andere Suche.
          </p>
          <button type="button" onClick={() => setSearchTerm('')} className="btn-secondary">
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        /* Objects Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {filteredObjects.map((obj) => (
            <div key={obj.id} className="card group flex flex-col overflow-hidden transition-all hover:border-emerald-500/50">
              <div className="flex-1 p-5 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>

                <h3 className="mb-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-emerald-400 sm:text-2xl">
                  {obj.name}
                </h3>

                {(obj.street || obj.city) && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <MapPin className="w-4 h-4" />
                    {[obj.street, obj.postal_code, obj.city].filter(Boolean).join(', ')}
                  </div>
                )}

                {obj.notes && (
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                    {obj.notes}
                  </p>
                )}
              </div>

              <div className="flex gap-2 px-5 pb-5 sm:gap-3 sm:px-6 sm:pb-6">
                <Link 
                  href={`/dashboard/objects/${obj.id}`} 
                  className="flex-1 btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
                >
                  Details ansehen
                </Link>
                <Link 
                  href={`/dashboard/objects/${obj.id}`} 
                  className="px-4 py-2.5 text-sm border border-slate-700 hover:bg-slate-800 rounded-2xl transition flex items-center"
                >
                  Bearbeiten
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-xs text-slate-500 sm:mt-8">
        Tipp: Klicken Sie auf ein Objekt, um Anlagen, Termine und Dokumente zu verwalten. • PDF-Export enthält alle Objekte mit Adresse und Notizen. Verwenden Sie die Suche für schnelle Filterung.
      </div>
    </div>
  )
}
