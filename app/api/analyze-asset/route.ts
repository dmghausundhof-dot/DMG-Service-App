import { NextRequest, NextResponse } from 'next/server'

/** Längere Laufzeit für Reasoning-/Vision-Aufrufe (Vercel). */
export const maxDuration = 120

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
  /** Volle https-URLs zu Handbüchern, Datenblättern, Support-PDFs (Websuche) */
  document_links?: string[] | null
}

function sanitizeHttpsUrls(raw: unknown, max = 8): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') continue
    const u = x.trim()
    if (!/^https:\/\//i.test(u)) continue
    try {
      const parsed = new URL(u)
      if (parsed.protocol === 'https:') out.push(u)
    } catch {
      continue
    }
    if (out.length >= max) break
  }
  return out.length ? out : undefined
}

const VISION_PROMPT = `Du bist ein Experte für technische Hausinstallationen. Analysiere dieses Bild einer Anlage (Balkonkraftwerk, Heizung/Wärmepumpe, Filteranlage, etc.).

Gib NUR ein valides JSON-Objekt zurück mit exakt diesen Feldern (kein Markdown, kein extra Text):
{
  "category": "Balkonkraftwerk" | "Heizung" | "Entsalzungsanlage" | "Wärmespeicher" | "Filteranlage" | "Wallbox" | "Starlink" | "Sonstiges",
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
    const parsed = parseJsonObject<VisionAnalysis>(text)
    if (parsed.category === 'Wärmepumpe') parsed.category = 'Heizung'
    return parsed
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

Nutze Websuche, um Hersteller und Modell zu verifizieren, ggf. Baujahr zu ergänzen und — besonders wichtig — offizielle Herstellerquellen zu finden.

Priorisiere in document_links vollständige https-URLs zu: Bedienungsanleitungen, Montage-/Installationsanleitungen, Datenblättern (PDF), Produktseiten mit Download-Bereich, Support-Dokumentation. Nur verlässliche Quellen (Hersteller, Fachhändler mit direktem PDF-Link). Keine generischen Blog-Artikel ohne Dokument.

Wenn keine sichere URL gefunden wird: document_links null oder leeres Array.

Widerspricht das Web dem Befund, bevorzuge belastbare Web-Infos und erwähne das in web_notes.

Gib NUR valides JSON zurück (kein Markdown):
{
  "category": string,
  "manufacturer": string | null,
  "model": string | null,
  "year_built": number | null,
  "capacity": string | null,
  "filter_type": string | null,
  "confidence": number (0-1),
  "document_links": string[] | null (nur vollständige https://… URLs, max 8, sonst []),
  "web_sources": string[] (kurze Bezeichner oder URLs zur Einordnung, max 5),
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
    const parsed = parseJsonObject<WebEnrichment>(text)
    return {
      ...parsed,
      document_links: sanitizeHttpsUrls(parsed.document_links),
    }
  } catch {
    console.warn('Web enrichment parse failed:', text.slice(0, 500))
    return null
  }
}

function mergeVisionAndWeb(
  vision: VisionAnalysis,
  web: WebEnrichment | null,
): VisionAnalysis & {
  web_sources?: string[]
  web_notes?: string | null
  document_links?: string[]
} {
  if (!web) {
    return { ...vision }
  }
  const pick = <K extends keyof VisionAnalysis>(k: K): VisionAnalysis[K] => {
    const w = web[k]
    const v = vision[k]
    if (w !== undefined && w !== null && w !== '') return w as VisionAnalysis[K]
    return v
  }
  const docLinks = sanitizeHttpsUrls(web.document_links) ?? sanitizeHttpsUrls(web.web_sources)
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
    document_links: docLinks,
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
  document_links: ['https://www.anker.com/de'],
  web_notes: 'Demo: XAI_API_KEY nicht gesetzt – keine Web-Ergänzung.',
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await request.json()

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
    if (merged.category === 'Wärmepumpe') merged.category = 'Heizung'

    return NextResponse.json({
      success: true,
      visionAnalysis: vision,
      webEnrichment: web,
      merged,
      webSearchUsed: web !== null,
      message: web
        ? 'Auswertung abgeschlossen (Bild und Web).'
        : 'Auswertung aus Bild; Web-Ergänzung nicht verfügbar.',
    })
  } catch (error) {
    console.error('Analyze asset error:', error)
    return NextResponse.json({ error: 'Interner Fehler bei der Analyse' }, { status: 500 })
  }
}
