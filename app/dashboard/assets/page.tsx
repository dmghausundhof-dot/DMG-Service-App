'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Wrench, Calendar, AlertTriangle, CheckCircle, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import jsPDF from 'jspdf'

// Base64 encoded DMG house logo (80x80 PNG, transparent background)
const DMG_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAB0ElEQVR4nO3aMU4DMRBG4QFBRQMdPXeBmgPQ0YRDgOAQ0NBxAGpyF3o6kBAVBRRoBYrExvZvexz7vTZR1v40kZXNmhEREfXa7u3iy3sNc217L2CuCa9lxGYBV9FaRdzyXsBqIVCfF3dB675/eExCPz87DXZpagJDp6ylaWwGMBalFcQmAFMxWkB0B1QRvBFdAXNt3hNxx+OiJTY8fWboCZ2r6hNYelpqT2NVwFqbq4lYDbD2ZNS6XhVA75OyZEUPkZ7hpopN4Ah4ZoUAR8EzKwA4Ep5ZZsDR8MwyHSIjwk3JEzgynpkIODqemQAI3k9JgOD9Fn2IbBLe4n1Z/BrB9842CS5XIfcWg77CI+KZhe17rfDch+wdHcauqdk+nl/+fW1uEpNvf+8/XXc3lW8nV9EeSadwj3hmafuKBuwVbyp2f+7/C296AIoBKAagWLY/lV6PL4Pfe7C8yXVZ93UwgWIAigEoBqAYgGIAigEo5vKE6t/m7sOF5nlfkgkUA1As21e45M+zmGqvgwkUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AsGjDlQexNKnZ/SRPYK2K1p/RTL9Zyve2HiIiIaE3fKyiFGxkYX8QAAAAASUVORK5CYII='

interface Asset {
  id: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  last_maintenance: string | null
  next_maintenance_due: string | null
  image_url: string | null
  object_id: string
  objects: {
    name: string
    city: string | null
  } | null
}

function getAssetStatus(asset: Asset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (asset.next_maintenance_due) {
    const dueDate = new Date(asset.next_maintenance_due)
    if (dueDate < today) {
      return { 
        label: 'Wartung überfällig', 
        color: 'red', 
        bg: 'bg-red-600/20 text-red-400 border-red-900/50',
        icon: AlertTriangle 
      }
    }
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    if (diffDays <= 30) {
      return { 
        label: `Wartung in ${diffDays} Tagen`, 
        color: 'amber', 
        bg: 'bg-amber-600/20 text-amber-400 border-amber-900/50',
        icon: Calendar 
      }
    }
  }

  if (asset.last_maintenance) {
    return { 
      label: 'Aktiv', 
      color: 'emerald', 
      bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50',
      icon: CheckCircle 
    }
  }

  return { 
    label: 'Neu', 
    color: 'blue', 
    bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50',
    icon: Wrench 
  }
}

export default function AssetsListPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const objectFilter = searchParams.get('object')

  const [assets, setAssets] = useState<Asset[]>([])
  const [totalAssets, setTotalAssets] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAssets() {
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

        let query = supabase
          .from('assets')
          .select(`
            id, 
            name, 
            category, 
            manufacturer, 
            model, 
            last_maintenance, 
            next_maintenance_due, 
            image_url, 
            object_id,
            objects (name, city)
          `, { count: 'exact' })
          .in('object_id', idFilter)
          .order('next_maintenance_due', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (objectFilter) {
          query = query.eq('object_id', objectFilter)
        }

        const { data: assetsData, count } = await query
        const rows = assetsData ?? []
        const normalized: Asset[] = rows.map((row) => {
          const rel = row.objects as
            | { name: string; city: string | null }
            | { name: string; city: string | null }[]
            | null
          const objects = Array.isArray(rel) ? rel[0] ?? null : rel
          return { ...row, objects }
        })
        setAssets(normalized)
        setTotalAssets(count || 0)
      }
      setLoading(false)
    }
    loadAssets()
  }, [supabase, objectFilter])

  // Live filter
  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (
      asset.name.toLowerCase().includes(term) ||
      asset.category.toLowerCase().includes(term) ||
      (asset.manufacturer?.toLowerCase().includes(term) ?? false) ||
      (asset.model?.toLowerCase().includes(term) ?? false) ||
      (asset.objects?.name.toLowerCase().includes(term) ?? false) ||
      (asset.objects?.city?.toLowerCase().includes(term) ?? false)
    )
  })

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = 297
    const pageHeight = 210
    const margin = 15
    const usableWidth = pageWidth - margin * 2
    const headerHeight = 32
    const footerHeight = 12
    const rowHeight = 6.5
    const usableHeight = pageHeight - margin * 2 - headerHeight - footerHeight - 8
    
    const rowsToExport = filteredAssets.length > 0 ? filteredAssets : assets
    const rowsPerPage = Math.floor(usableHeight / rowHeight)
    const totalPages = Math.max(1, Math.ceil(rowsToExport.length / rowsPerPage))
    
    let currentPage = 1
    let yPos = margin + 5
    
    const drawHeader = (pageNum: number) => {
      // Logo
      doc.addImage(DMG_LOGO_BASE64, 'PNG', margin, 8, 16, 16)
      
      // Company name
      doc.setFontSize(18)
      doc.setTextColor(16, 185, 129)
      doc.text('DMG Service', margin + 20, 14)
      
      doc.setFontSize(10)
      doc.setTextColor(75, 85, 99)
      doc.text('Kundenportal • Anlagen-Übersicht', margin + 20, 20)
      
      // Date
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 20, 26)
      
      // Green accent line
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.8)
      doc.line(margin, 30, pageWidth - margin, 30)
      
      // Filter info
      if (objectFilter || searchTerm) {
        doc.setFontSize(7)
        doc.setTextColor(75, 85, 99)
        let info = 'Gefiltert: '
        if (objectFilter) info += 'Nach Objekt • '
        if (searchTerm) info += `Suche: "${searchTerm}" `
        doc.text(info.trim(), margin, 35)
        yPos = 40
      } else {
        yPos = 36
      }
      
      // Table header
      const headers = ['Name', 'Kategorie', 'Hersteller / Modell', 'Objekt / Ort', 'Status', 'Letzte Wartung', 'Nächste Wartung']
      const colWidths = [32, 26, 48, 38, 30, 34, 34] // total ~242mm fits in 267
      
      doc.setFillColor(16, 185, 129)
      doc.rect(margin, yPos, usableWidth, 6.5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      
      let xPos = margin + 2
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPos + 4.5)
        xPos += colWidths[i]
      })
      
      yPos += 8
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(31, 41, 55)
    }
    
    const drawFooter = (pageNum: number) => {
      doc.setDrawColor(209, 213, 219)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
      
      doc.setFontSize(6.5)
      doc.setTextColor(107, 114, 128)
      doc.text('DMG Service Kundenportal • Alle Daten sind nur für Sie sichtbar • Vertraulich', margin, pageHeight - 7)
      doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth - margin - 25, pageHeight - 7)
    }
    
    // First page header
    drawHeader(currentPage)
    
    // Data rows
    rowsToExport.forEach((asset, index) => {
      if (yPos > pageHeight - 20) {
        drawFooter(currentPage)
        doc.addPage()
        currentPage++
        yPos = margin + 5
        drawHeader(currentPage)
      }
      
      const status = getAssetStatus(asset)
      const objectName = asset.objects ? `${asset.objects.name}${asset.objects.city ? ' • ' + asset.objects.city : ''}` : '—'
      const herstellerModell = `${asset.manufacturer || '—'}${asset.model ? ' / ' + asset.model : ''}`
      
      const rowData = [
        asset.name.length > 22 ? asset.name.substring(0, 19) + '...' : asset.name,
        asset.category,
        herstellerModell.length > 26 ? herstellerModell.substring(0, 23) + '...' : herstellerModell,
        objectName.length > 24 ? objectName.substring(0, 21) + '...' : objectName,
        status.label,
        asset.last_maintenance ? new Date(asset.last_maintenance).toLocaleDateString('de-DE') : '—',
        asset.next_maintenance_due ? new Date(asset.next_maintenance_due).toLocaleDateString('de-DE') : 'Nicht geplant'
      ]
      
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, yPos - 1, usableWidth, rowHeight, 'F')
      }
      
      let xPos = margin + 2
      rowData.forEach((cell, i) => {
        if (i === 4) { // Status column - color it
          if (status.color === 'red') doc.setTextColor(185, 28, 28)
          else if (status.color === 'amber') doc.setTextColor(180, 83, 9)
          else if (status.color === 'emerald') doc.setTextColor(16, 185, 129)
          else doc.setTextColor(30, 64, 175)
        } else {
          doc.setTextColor(31, 41, 55)
        }
        doc.text(String(cell), xPos, yPos + 4)
        xPos += [32, 26, 48, 38, 30, 34, 34][i]
      })
      
      yPos += rowHeight
    })
    
    // Final footer
    drawFooter(currentPage)
    
    doc.save(`DMG-Anlagen-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Anlagen werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between lg:mb-10">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">ANLAGENÜBERSICHT</div>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Meine Anlagen</h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            {objectFilter ? (
              <>Gefiltert • {filteredAssets.length} Anlagen{searchTerm && ` (Suche: "${searchTerm}")`}</>
            ) : (
              <>{totalAssets} wartungsintensive Anlagen • {filteredAssets.filter(a => {
                const status = getAssetStatus(a)
                return status.label.includes('fällig') || status.label.includes('überfällig')
              }).length} benötigen Aufmerksamkeit</>
            )}
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
          <Link href="/dashboard/assets/new" className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
            <Plus className="h-5 w-5 shrink-0" />
            Neue Anlage hinzufügen
          </Link>
        </div>
      </div>

      {/* Object Filter Banner */}
      {objectFilter && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-900/50 bg-emerald-950/30 p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
            <div className="w-fit shrink-0 rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-400">OBJEKT-FILTER AKTIV</div>
            <span className="min-w-0 text-slate-300">
              Anzeige nur für dieses Objekt.{' '}
              <Link href="/dashboard/assets" className="text-emerald-400 hover:underline">
                Alle Anlagen anzeigen →
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {assets.length > 0 && (
        <div className="mb-5 sm:mb-8">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400">
              <Search className="h-5 w-5 shrink-0" aria-hidden />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen…"
              className="input-search py-3 text-base"
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
              {filteredAssets.length} von {assets.length} Anlagen gefunden
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {assets.length === 0 ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Wrench className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Noch keine Anlagen</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Fügen Sie Ihre erste Anlage hinzu — z.&nbsp;B. Balkonkraftwerk, Wärmepumpe oder Filteranlage.
          </p>
          <Link href="/dashboard/assets/new" className="btn-primary inline-flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 shrink-0" />
            Erste Anlage anlegen
          </Link>
        </div>
      ) : filteredAssets.length === 0 && searchTerm ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <Search className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Keine Treffer</h3>
          <p className="mx-auto mb-6 max-w-md text-base text-slate-400 sm:mb-8 sm:text-lg">
            Keine Anlagen gefunden für „{searchTerm}“. Versuchen Sie eine andere Suche.
          </p>
          <button type="button" onClick={() => setSearchTerm('')} className="btn-secondary">
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        /* Assets Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {filteredAssets.map((asset) => {
            const status = getAssetStatus(asset)
            const StatusIcon = status.icon

            return (
              <div key={asset.id} className="card group overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col">
                {/* Image or Placeholder */}
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-slate-900 sm:h-56">
                  {asset.image_url ? (
                    <img 
                      src={asset.image_url} 
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Wrench className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-500">Kein Foto hinterlegt</p>
                    </div>
                  )}
                  
                  {/* Category Badge on Image */}
                  <div className="absolute top-4 left-4">
                    <div className="px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/10">
                      {asset.category}
                    </div>
                  </div>

                  {/* Status Badge on Image */}
                  <div className="absolute top-4 right-4">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0">
                        <Link href={`/dashboard/assets/${asset.id}`} className="transition-colors group-hover:text-emerald-400">
                          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{asset.name}</h3>
                        </Link>
                        {asset.objects && (
                          <p className="text-sm text-slate-500 mt-0.5">
                            {asset.objects.name} {asset.objects.city && `• ${asset.objects.city}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {(asset.manufacturer || asset.model) && (
                      <p className="text-sm text-slate-400 mb-4">
                        {asset.manufacturer} {asset.model && `• ${asset.model}`}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">LETZTE WARTUNG</div>
                        <div className="font-medium">
                          {asset.last_maintenance 
                            ? new Date(asset.last_maintenance).toLocaleDateString('de-DE')
                            : '—'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">NÄCHSTE WARTUNG</div>
                        <div className="font-medium">
                          {asset.next_maintenance_due 
                            ? new Date(asset.next_maintenance_due).toLocaleDateString('de-DE')
                            : 'Nicht geplant'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-2 border-t border-slate-800 pt-5 sm:mt-6 sm:flex-row sm:gap-3 sm:pt-6">
                    <button 
                      type="button"
                      onClick={() => alert('Wartungs-Termin planen: Hier würde ein Termin-Formular mit vorausgefüllter Anlage erscheinen.')}
                      className="btn-secondary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      Wartung planen
                    </button>
                    <Link
                      href={`/dashboard/assets/${asset.id}`}
                      className="flex flex-1 items-center justify-center rounded-2xl border border-slate-700 px-4 py-2.5 text-sm transition hover:bg-slate-800 sm:flex-initial"
                    >
                      Details &amp; Bearbeiten
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer Info */}
      {assets.length > 0 && (
        <div className="mt-6 text-center text-xs text-slate-500 sm:mt-8">
          Tipp: Klicken Sie auf „Details &amp; Bearbeiten“, um die Anlage zu bearbeiten oder einen Termin zu planen. • PDF-Export enthält Logo, Tabelle und farbige Status.
        </div>
      )}
    </div>
  )
}
