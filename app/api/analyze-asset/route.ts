import { NextRequest, NextResponse } from 'next/server'

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
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const slice = jsonMatch ? jsonMatch[0] : raw
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
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Grok vision error:', errorText)
    throw new Error('Grok Vision API Fehler')
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = result.choices?.[0]?.message?.content
  if (!content) throw new Error('Leere Vision-Antwort')
  return parseJsonObject<VisionAnalysis>(content)
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
    console.warn('Grok web responses error:', errorText)
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
  web_notes: 'Demo: XAI_API_KEY nicht gesetzt – keine echte Websuche.',
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    const visionModel = process.env.XAI_VISION_MODEL || 'grok-2-vision'
    const webModel = process.env.XAI_WEB_MODEL || 'grok-3-fast'

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
      return NextResponse.json({ error: 'Bildanalyse fehlgeschlagen' }, { status: 500 })
    }

    let web: WebEnrichment | null = null
    try {
      web = await runWebEnrichment(apiKey, vision, webModel)
    } catch (e) {
      console.warn('Web enrichment skipped:', e)
    }

    const merged = mergeVisionAndWeb(vision, web)

    return NextResponse.json({
      success: true,
      visionAnalysis: vision,
      webEnrichment: web,
      merged,
      webSearchUsed: web !== null,
      message: web ? 'Bildanalyse und Websuche abgeschlossen.' : 'Bildanalyse ok; Websuche übersprungen oder nicht verfügbar.',
    })
  } catch (error) {
    console.error('Analyze asset error:', error)
    return NextResponse.json({ error: 'Interner Fehler bei der Analyse' }, { status: 500 })
  }
}
