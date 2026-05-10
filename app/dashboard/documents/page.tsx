'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Download, Eye, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import jsPDF from 'jspdf'

// Base64 encoded DMG house logo (80x80 PNG, transparent background)
const DMG_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAB0ElEQVR4nO3aMU4DMRBG4QFBRQMdPXeBmgPQ0YRDgOAQ0NBxAGpyF3o6kBAVBRRoBYrExvZvexz7vTZR1v40kZXNmhEREfXa7u3iy3sNc217L2CuCa9lxGYBV9FaRdzyXsBqIVCfF3dB675/eExCPz87DXZpagJDp6ylaWwGMBalFcQmAFMxWkB0B1QRvBFdAXNt3hNxx+OiJTY8fWboCZ2r6hNYelpqT2NVwFqbq4lYDbD2ZNS6XhVA75OyZEUPkZ7hpopN4Ah4ZoUAR8EzKwA4Ep5ZZsDR8MwyHSIjwk3JEzgynpkIODqemQAI3k9JgOD9Fn2IbBLe4n1Z/BrB9842CS5XIfcWg77CI+KZhe17rfDch+wdHcauqdk+nl/+fW1uEpNvf+8/XXc3lW8nV9EeSadwj3hmafuKBuwVbyp2f+7/C296AIoBKAagWLY/lV6PL4Pfe7C8yXVZ93UwgWIAigEoBqAYgGIAigEo5vKE6t/m7sOF5nlfkgkUA1As21e45M+zmGqvgwkUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AMQDEAxQAUA1AsGjDlQexNKnZ/SRPYK2K1p/RTL9Zyve2HiIiIaE3fKyiFGxkYX8QAAAAASUVORK5CYII='

interface Document {
  id: string
  type: string
  title: string
  file_url: string
  file_name: string | null
  file_size: number | null
  created_at: string
  object_id: string
  objects: {
    name: string
    city: string | null
  } | null
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'invoice':
      return { label: 'Rechnung', bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50' }
    case 'offer':
      return { label: 'Angebot', bg: 'bg-purple-600/20 text-purple-400 border-purple-900/50' }
    case 'report':
      return { label: 'Servicebericht', bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50' }
    case 'customer_upload':
      return { label: 'Kunden-Datei', bg: 'bg-slate-600/20 text-slate-300 border-slate-700/50' }
    case 'other':
      return { label: 'Andere', bg: 'bg-amber-600/20 text-amber-400 border-amber-900/50' }
    default:
      return { label: type, bg: 'bg-slate-600/20 text-slate-400 border-slate-900/50' }
  }
}

export default function DocumentsListPage() {
  const supabase = createClient()
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      await getOrCreateProfileId(supabase, user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      const admin = profile?.role === 'admin'
      setIsAdmin(!!admin)

      const normalizeRows = (rows: Record<string, unknown>[]): Document[] =>
        rows.map((row) => {
          const rel = row.objects as
            | { name: string; city: string | null }
            | { name: string; city: string | null }[]
            | null
          const objects = Array.isArray(rel) ? rel[0] ?? null : rel
          return {
            ...(row as unknown as Document),
            objects,
          }
        })

      if (admin) {
        const { data: documentsData, count } = await supabase
          .from('documents')
          .select(`
            id,
            type,
            title,
            file_url,
            file_name,
            file_size,
            created_at,
            object_id,
            objects (name, city)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })

        setDocuments(normalizeRows((documentsData as Record<string, unknown>[]) ?? []))
        setTotalDocuments(count || 0)
      } else if (profile?.id) {
        const pid = profile.id
        const { data: userObjs } = await supabase.from('objects').select('id').eq('profile_id', pid)
        const objectIds = userObjs?.map((o) => o.id) ?? []
        if (objectIds.length === 0) {
          setDocuments([])
          setTotalDocuments(0)
        } else {
          const { data: documentsData, count } = await supabase
            .from('documents')
            .select(`
            id, 
            type, 
            title, 
            file_url, 
            file_name, 
            file_size, 
            created_at, 
            object_id,
            objects (name, city)
          `, { count: 'exact' })
            .in('object_id', objectIds)
            .order('created_at', { ascending: false })

          setDocuments(normalizeRows((documentsData as Record<string, unknown>[]) ?? []))
          setTotalDocuments(count || 0)
        }
      } else {
        setDocuments([])
        setTotalDocuments(0)
      }
      setLoading(false)
    }
    loadDocuments()
  }, [supabase])

  // Live filter
  const filteredDocuments = documents.filter((doc) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (
      doc.title.toLowerCase().includes(term) ||
      (doc.objects?.name.toLowerCase().includes(term) ?? false) ||
      doc.type.toLowerCase().includes(term)
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
    
    const rowsToExport = filteredDocuments.length > 0 ? filteredDocuments : documents
    const rowsPerPage = Math.floor(usableHeight / rowHeight)
    const totalPages = Math.max(1, Math.ceil(rowsToExport.length / rowsPerPage))
    
    let currentPage = 1
    let yPos = margin + 3
    
    const drawHeader = (pageNum: number) => {
      doc.addImage(DMG_LOGO_BASE64, 'PNG', margin, 6, 14, 14)
      
      doc.setFontSize(16)
      doc.setTextColor(16, 185, 129)
      doc.text('DMG Service', margin + 18, 11)
      
      doc.setFontSize(9)
      doc.setTextColor(75, 85, 99)
      doc.text('Kundenportal • Dokumenten-Übersicht', margin + 18, 17)
      
      doc.setFontSize(7)
      doc.setTextColor(107, 114, 128)
      doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, margin + 18, 22)
      
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.6)
      doc.line(margin, 26, pageWidth - margin, 26)
      
      if (searchTerm) {
        doc.setFontSize(6.5)
        doc.setTextColor(75, 85, 99)
        doc.text(`Gefiltert: Suche "${searchTerm}"`, margin, 31)
        yPos = 35
      } else {
        yPos = 30
      }
      
      // Table header
      const headers = ['Titel / Typ', 'Objekt', 'Datum', 'Größe']
      const colWidths = [90, 55, 40, 35]
      
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
      doc.text('DMG Service Kundenportal • Vertraulich • Alle Dokumente in Supabase Storage', margin, pageHeight - 6)
      doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth - margin - 22, pageHeight - 6)
    }
    
    drawHeader(currentPage)
    
    rowsToExport.forEach((d, index) => {
      if (yPos > pageHeight - 18) {
        drawFooter(currentPage)
        doc.addPage()
        currentPage++
        yPos = margin + 3
        drawHeader(currentPage)
      }
      
      const typeInfo = getTypeBadge(d.type)
      const fileSize = d.file_size ? (d.file_size / 1024).toFixed(1) + ' KB' : '—'
      const objectInfo = d.objects ? `${d.objects.name}${d.objects.city ? ' • ' + d.objects.city : ''}` : '—'
      
      const rowData = [
        `${d.title} (${typeInfo.label})`,
        objectInfo,
        new Date(d.created_at).toLocaleDateString('de-DE'),
        fileSize
      ]
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, yPos - 1, usableWidth, rowHeight, 'F')
      }
      
      let xPos = margin + 2
      rowData.forEach((cell, i) => {
        doc.setTextColor(31, 41, 55)
        doc.text(String(cell).substring(0, i === 0 ? 55 : 35), xPos, yPos + 4.5)
        xPos += [90, 55, 40, 35][i]
      })
      
      yPos += rowHeight
    })
    
    drawFooter(currentPage)
    
    doc.save(`DMG-Dokumente-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Dokumente werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="text-emerald-500 text-sm font-semibold tracking-[2px] mb-2">DOKUMENTENÜBERSICHT</div>
          <h1 className="text-5xl font-semibold tracking-tighter">
            {isAdmin ? 'Alle Dokumente' : 'Meine Dokumente'}
          </h1>
          <p className="text-xl text-slate-400 mt-2">
            {totalDocuments}{' '}
            {isAdmin
              ? ' Einträge (Belege & Kunden-Dateien)'
              : ' Dokumente – Belege durch DMG, eigene Bilder oder PDFs von Ihnen'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button 
            onClick={exportToPDF}
            className="btn-secondary flex items-center gap-2 px-5 py-3 text-sm"
          >
            📄 Als PDF exportieren
          </button>
          {isAdmin && (
            <Link
              href="/dashboard/admin/documents/new"
              className="btn-secondary flex items-center gap-2 px-5 py-3 text-sm"
            >
              Admin: Beleg anlegen
            </Link>
          )}
          <Link 
            href="/dashboard/documents/new" 
            className="btn-primary flex items-center gap-3 text-base px-8 py-4 w-fit"
          >
            <Plus className="w-5 h-5" />
            Datei hochladen
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      {documents.length > 0 && (
        <div className="mb-8">
          <div className="relative max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen nach Titel, Objekt oder Typ..."
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
              {filteredDocuments.length} von {documents.length} Dokumenten gefunden
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {documents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-semibold mb-4">Noch keine Dokumente</h3>
          <p className="text-xl text-slate-400 max-w-md mx-auto mb-8">
            {isAdmin
              ? 'Noch keine Einträge. Kunden-Dateien erscheinen hier, sobald Kunden sie hochladen; Belegen legen Sie unter „Admin: Belege“ an.'
              : 'DMG kann Ihre Rechnungen & Berichte hier ablegen. Sie können eigene Fotos oder PDFs mit „Datei hochladen“ ergänzen.'}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard/documents/new" className="btn-primary inline-flex items-center gap-3 px-8 py-4 text-lg">
              <Plus className="w-5 h-5" />
              Datei hochladen
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/admin/documents/new"
                className="btn-secondary inline-flex items-center gap-3 px-8 py-4 text-lg"
              >
                Beleg für Kunden
              </Link>
            )}
          </div>
        </div>
      ) : filteredDocuments.length === 0 && searchTerm ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-semibold mb-4">Keine Treffer</h3>
          <p className="text-xl text-slate-400 max-w-md mx-auto mb-8">
            Keine Dokumente gefunden für „{searchTerm}“.
          </p>
          <button 
            onClick={() => setSearchTerm('')}
            className="btn-secondary px-8 py-4 text-lg"
          >
            Suche zurücksetzen
          </button>
        </div>
      ) : (
        /* Documents List */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                  <th className="px-6 py-4 font-normal">Dokument</th>
                  <th className="px-6 py-4 font-normal">Objekt</th>
                  <th className="px-6 py-4 font-normal">Datum</th>
                  <th className="px-6 py-4 font-normal">Größe</th>
                  <th className="px-6 py-4 font-normal text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredDocuments.map((doc) => {
                  const typeInfo = getTypeBadge(doc.type)
                  const fileSize = doc.file_size 
                    ? (doc.file_size / 1024).toFixed(1) + ' KB' 
                    : '—'

                  return (
                    <tr key={doc.id} className="hover:bg-slate-900/50 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeInfo.bg}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">{doc.title}</div>
                            <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${typeInfo.bg}`}>
                              {typeInfo.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {doc.objects ? (
                          <div>
                            {doc.objects.name}
                            {doc.objects.city && <span className="block text-xs">{doc.objects.city}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {fileSize}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                            title="Öffnen"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <a 
                            href={doc.file_url} 
                            download={doc.file_name || doc.title}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                            title="Herunterladen"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-500">
        Alle Dokumente sind sicher in Ihrem Supabase Storage gespeichert und nur für Sie sichtbar.
      </div>
    </div>
  )
}
