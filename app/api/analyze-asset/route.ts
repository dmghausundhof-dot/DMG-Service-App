import { NextRequest, NextResponse } from 'next/server'
import type { MaintenanceGuide } from '@/lib/maintenance-guide'

/** Längere Laufzeit für Reasoning-/Vision-Aufrufe (Vercel). */
export const maxDuration = 120

export type { MaintenanceGuide } from '@/lib/maintenance-guide'

type VisionAnalysis = {
  category: string
  manufacturer: string | null
  model: string | null
  year_built: number | null
  capacity: string | null
  filter_type: string | null
  confidence: number
}

type WebEnrichment = Partial<VisionAnalysis> & {
  web_sources?: string[] | null
  web_notes?: string | null
}

const VISION_PROMPT = `Du bist ein Experte für technische Hausinstallationen. Analysiere dieses Bild einer Anlage (Balkonkraftwerk, Wärmepumpe, Filteranlage, etc.).

Gib NUR ein valides JSON-Objekt zurück mit exakt diesen Feldern (kein Markdown, kein extra Text):
{
  "category": "Balkonkraftwerk" | "Wärmepumpe" | "Entsalzungsanlage" | "Wärmespeicher" | "Filteranlage" | "Wallbox" | "Starlink" | "Sonstiges",
  "manufacturer": string | null,
  "model": string | null,
  "year_built": number | null,
  "capacity": string | null (z.B. "5.2 kWp", "300 Liter", "8 kW"),
  "filter_type": string | null,
  "confidence": number (0.0 - 1.0)
}

Wenn du dir unsicher bist, setze das Feld auf null und senke confidence. Sei präzise und konservativ.`

function parseJsonObject<T>(raw: string): T {
  const trimmed = raw.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fence ? fence[1].trim() : trimmed)
  const jsonMatch = body.match(/\{[\s\S]*\}/)
  const slice = jsonMatch ? jsonMatch[0] : body
  return JSON.parse(slice) as T
}

function extractResponsesOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }
  const out = payload.output
  if (!Array.isArray(out)) return ''
  const chunks: string[] = []
  for (const item of out) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (o.type === 'message' && Array.isArray(o.content)) {
      for (const c of o.content) {
        if (c && typeof c === 'object') {
          const cc = c as Record<string, unknown>
          if (cc.type === 'output_text' && typeof cc.text === 'string') chunks.push(cc.text)
        }
      }
    }
  }
  return chunks.join('\n').trim()
}

async function runVision(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  visionModel: string,
): Promise<VisionAnalysis> {
  let mime = (mimeType && mimeType.includes('/') ? mimeType : 'image/jpeg').toLowerCase()
  if (mime === 'image/jpg') mime = 'image/jpeg'
  const imageUrl = `data:${mime};base64,${imageBase64}`

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: visionModel,
      temperature: 0.1,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'high',
            },
            {
              type: 'input_text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Vision API error:', errorText)
    throw new Error(
      errorText.slice(0, 280) || 'Bildanalyse (Vision): API-Fehler ohne Details',
    )
  }

  const payload = (await response.json()) as Record<string, unknown>
  const text = extractResponsesOutputText(payload)
  if (!text) throw new Error('Leere Vision-Antwort (responses)')
  try {
    return parseJsonObject<VisionAnalysis>(text)
  } catch (e) {
    console.warn('Vision JSON parse:', text.slice(0, 800))
    throw new Error(
      'Vision-Antwort war kein erwartetes JSON. Bitte erneut fotografieren oder anderes Bild.',
    )
  }
}

async function runWebEnrichment(
  apiKey: string,
  vision: VisionAnalysis,
  webModel: string,
): Promise<WebEnrichment | null> {
  const hint = [
    `Kategorie: ${vision.category}`,
    vision.manufacturer ? `Hersteller (Bild): ${vision.manufacturer}` : null,
    vision.model ? `Modell (Bild): ${vision.model}` : null,
    vision.capacity ? `Leistung (Bild): ${vision.capacity}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Du hast folgenden ersten Befund aus einer Fotos-Analyse einer technischen Hausanlage:

${hint}

Nutze Websuche, um Hersteller, Modell, typische Leistungsdaten und ggf. Baujahr zu verifizieren oder zu ergänzen. Widerspricht das Web dem Befund, bevorzuge belastbare Web-Infos und erwähne das in web_notes.

Gib NUR valides JSON zurück (kein Markdown):
{
  "category": string,
  "manufacturer": string | null,
  "model": string | null,
  "year_built": number | null,
  "capacity": string | null,
  "filter_type": string | null,
  "confidence": number (0-1),
  "web_sources": string[] (kurze URLs oder Quellenbezeichner, max 5),
  "web_notes": string | null
}`

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: webModel,
      input: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search' }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.warn('Web enrichment API error:', errorText)
    return null
  }

  const payload = (await response.json()) as Record<string, unknown>
  const text = extractResponsesOutputText(payload)
  if (!text) return null

  try {
    return parseJsonObject<WebEnrichment>(text)
  } catch {
    console.warn('Web enrichment parse failed:', text.slice(0, 500))
    return null
  }
}

async function runMaintenanceGuide(
  apiKey: string,
  merged: VisionAnalysis & { web_sources?: string[]; web_notes?: string | null },
  webModel: string,
): Promise<MaintenanceGuide | null> {
  const hint = [
    `Gerätetyp/Kategorie: ${merged.category}`,
    merged.manufacturer ? `Hersteller: ${merged.manufacturer}` : null,
    merged.model ? `Modellbezeichnung: ${merged.model}` : null,
    merged.capacity ? `Leistung/Kapazität: ${merged.capacity}` : null,
    merged.filter_type ? `Filter-/Medientyp: ${merged.filter_type}` : null,
    merged.web_notes ? `Kontext (Web): ${merged.web_notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Du bist Servicetechniker für Haus- und Gebäudetechnik.

Anhand der folgenden Angaben (teilweise aus Fotos + Web-Recherche, kann unvollständig sein) soll recherchiert werden, WIE diese Anlage typischerweise gewartet oder gepflegt wird (Intervall, Kontrollpunkte, Verbrauchsmaterial, Sicherheit).

Geräteinformationen:
${hint}

Nutze Websuche nach Hersteller-Handbuch, typischen Wartungsintervallen und offiziellen Hinweisen. Wenn keine belastbaren Daten: checklist kürzer halten und typical_interval_months auf null setzen.

Gib NUR gültiges JSON ohne Markdown zurück:
{
  "summary": string (kurz, max. 4 Sätze, Deutsch),
  "typical_interval_months": number | null (nur wenn aus Quellen plausibel),
  "checklist": string[] (kurze Stichpunkte, max 12, praktisch umsetzbar für Eigentümer WO sinnvoll — sonst „Fachbetrieb beauftragen“),
  "safety_notes": string | null (z. B. elektrische/thermische Risiken, nur wenn relevant),
  "when_to_call_professional": string | null (wann Fachfirma nötig ist),
  "sources": string[] (max 5 URLs oder Quellentitel aus der Suche)
}`

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: webModel,
      temperature: 0.2,
      input: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search' }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.warn('Maintenance guide API error:', errorText)
    return null
  }

  const payload = (await response.json()) as Record<string, unknown>
  const text = extractResponsesOutputText(payload)
  if (!text) return null

  try {
    return parseJsonObject<MaintenanceGuide>(text)
  } catch {
    console.warn('Maintenance guide parse failed:', text.slice(0, 500))
    return null
  }
}

function mergeVisionAndWeb(vision: VisionAnalysis, web: WebEnrichment | null): VisionAnalysis & { web_sources?: string[]; web_notes?: string | null } {
  if (!web) {
    return { ...vision }
  }
  const pick = <K extends keyof VisionAnalysis>(k: K): VisionAnalysis[K] => {
    const w = web[k]
    const v = vision[k]
    if (w !== undefined && w !== null && w !== '') return w as VisionAnalysis[K]
    return v
  }
  return {
    category: pick('category'),
    manufacturer: pick('manufacturer'),
    model: pick('model'),
    year_built: pick('year_built'),
    capacity: pick('capacity'),
    filter_type: pick('filter_type'),
    confidence: Math.max(
      vision.confidence ?? 0,
      typeof web.confidence === 'number' ? web.confidence : 0,
    ),
    web_sources: web.web_sources ?? undefined,
    web_notes: web.web_notes ?? null,
  }
}

const DEMO_VISION: VisionAnalysis = {
  category: 'Balkonkraftwerk',
  manufacturer: 'Anker',
  model: 'Solarbank 2 E1600',
  year_built: 2024,
  capacity: '1.6 kWh',
  filter_type: null,
  confidence: 0.85,
}

const DEMO_WEB: WebEnrichment = {
  category: 'Balkonkraftwerk',
  manufacturer: 'Anker',
  model: 'Solarbank 2 E1600 Pro',
  year_built: 2024,
  capacity: '1,6 kWh Speicher, passend zu Mini-PV',
  filter_type: null,
  confidence: 0.88,
  web_sources: ['Hersteller-Datenblatt (Demo)', 'Fachhandel-Übersicht (Demo)'],
  web_notes: 'Demo: XAI_API_KEY nicht gesetzt – keine Web-Ergänzung.',
}

const DEMO_MAINTENANCE: MaintenanceGuide = {
  summary:
    'Demo: Bei Speicher-Mini-PV-Anlagen prüfen Sie regelmäßig sichtbare Beschädigungen, Reinheit der Module und die Verkabelung nur bei spannungsfreiem Zustand durch den Fachbetrieb.',
  typical_interval_months: 12,
  checklist: [
    'Visualprüfung Wechselrichter/Modul auf Risse, lose Kabel',
    'App/Herstellersoftware auf Fehlermeldungen prüfen (Demo)',
    'Keine Öffnung von Schutzgehäusen ohne Fachkunde',
  ],
  safety_notes: 'Arbeiten unter Spannung nur durch Elektrofachkraft.',
  when_to_call_professional:
    'Bei Fehlercodes, erhitzten Komponenten, Leistungseinbruch oder Gewährleistungsthemen den installierenden Betrieb kontaktieren.',
  sources: ['Demo – keine Live-Suche ohne API-Key'],
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', includeMaintenanceGuide = true } =
      await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    const defaultModel = 'grok-4-1-fast-reasoning'
    const sharedModel = process.env.XAI_MODEL
    const visionModel = process.env.XAI_VISION_MODEL || sharedModel || defaultModel
    const webModel = process.env.XAI_WEB_MODEL || sharedModel || defaultModel

    if (!apiKey) {
      const merged = mergeVisionAndWeb(DEMO_VISION, DEMO_WEB)
      return NextResponse.json({
        success: true,
        visionAnalysis: DEMO_VISION,
        webEnrichment: DEMO_WEB,
        merged,
        maintenanceGuide: includeMaintenanceGuide ? DEMO_MAINTENANCE : null,
        maintenanceGuideUsed: Boolean(includeMaintenanceGuide),
        webSearchUsed: false,
        message: DEMO_WEB.web_notes ?? 'Demo-Modus: XAI_API_KEY nicht gesetzt.',
      })
    }

    let vision: VisionAnalysis
    try {
      vision = await runVision(apiKey, imageBase64, mimeType, visionModel)
    } catch (e) {
      console.error(e)
      const detail = e instanceof Error ? e.message : 'Unbekannter Fehler'
      return NextResponse.json({ error: 'Bildanalyse fehlgeschlagen', detail }, { status: 502 })
    }

    let web: WebEnrichment | null = null
    try {
      web = await runWebEnrichment(apiKey, vision, webModel)
    } catch (e) {
      console.warn('Web enrichment skipped:', e)
    }

    const merged = mergeVisionAndWeb(vision, web)

    let maintenanceGuide: MaintenanceGuide | null = null
    if (includeMaintenanceGuide) {
      try {
        maintenanceGuide = await runMaintenanceGuide(apiKey, merged, webModel)
      } catch (e) {
        console.warn('Maintenance guide skipped:', e)
      }
    }

    return NextResponse.json({
      success: true,
      visionAnalysis: vision,
      webEnrichment: web,
      merged,
      maintenanceGuide,
      maintenanceGuideUsed: maintenanceGuide !== null,
      webSearchUsed: web !== null,
      message: web
        ? maintenanceGuide
          ? 'Auswertung inkl. Wartungshinweisen (KI + Web).'
          : 'Auswertung abgeschlossen (Bild und Web).'
        : maintenanceGuide
          ? 'Bild ausgewertet; Wartungshinweise ergänzt.'
          : 'Auswertung aus Bild; Web-Ergänzung nicht verfügbar.',
    })
  } catch (error) {
    console.error('Analyze asset error:', error)
    return NextResponse.json({ error: 'Interner Fehler bei der Analyse' }, { status: 500 })
  }
}
