/** Gespeichert in assets.ai_maintenance_guide; KI-Recherche, unverbindlich. */
export type MaintenanceGuide = {
  summary: string
  typical_interval_months: number | null
  checklist: string[]
  safety_notes: string | null
  when_to_call_professional: string | null
  sources: string[]
}

export function isMaintenanceGuide(value: unknown): value is MaintenanceGuide {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.summary === 'string' &&
    Array.isArray(o.checklist) &&
    o.checklist.every((x) => typeof x === 'string') &&
    Array.isArray(o.sources) &&
    o.sources.every((x) => typeof x === 'string')
  )
}

/** Für Terminanfrage (customer_notes / description Preview). */
export function formatMaintenanceGuideForAppointment(g: MaintenanceGuide): string {
  const lines: string[] = []
  lines.push('— KI-Wartungsüberblick (unverbindlich, Quellen siehe Daten zur Anlage) —')
  lines.push(g.summary.trim())
  if (typeof g.typical_interval_months === 'number' && !Number.isNaN(g.typical_interval_months)) {
    lines.push(`Übliches Intervall (Richtwert aus Recherche): ca. ${g.typical_interval_months} Monate`)
  }
  if (g.checklist.length > 0) {
    lines.push('Checkliste / Orientierung:')
    for (const c of g.checklist) lines.push(`• ${c}`)
  }
  if (g.safety_notes?.trim()) {
    lines.push(`Sicherheit: ${g.safety_notes.trim()}`)
  }
  if (g.when_to_call_professional?.trim()) {
    lines.push(`Fachfirma verständigen: ${g.when_to_call_professional.trim()}`)
  }
  if (g.sources.length > 0) {
    lines.push(`Quellen: ${g.sources.slice(0, 5).join(' · ')}`)
  }
  return lines.join('\n')
}
