import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      // Fallback for demo: return mock data
      console.warn('XAI_API_KEY not set - returning demo analysis')
      return NextResponse.json({
        success: true,
        analysis: {
          category: "Balkonkraftwerk",
          manufacturer: "Anker",
          model: "Solarbank 2 E1600",
          year_built: 2024,
          capacity: "1.6 kWh",
          filter_type: null,
          confidence: 0.92
        },
        message: "Demo-Modus: Grok API Key nicht gesetzt. In Produktion echte Analyse."
      })
    }

    const prompt = `Du bist ein Experte für technische Hausinstallationen. Analysiere dieses Bild einer Anlage (Balkonkraftwerk, Wärmepumpe, Filteranlage, etc.).

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

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision', // oder 'grok-4-vision' / aktuellstes Modell
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Grok API error:', errorText)
      return NextResponse.json({ error: 'Grok API Fehler' }, { status: 500 })
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    // Try to parse JSON from response (Grok sometimes adds ```json )
    let analysis
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse Grok response:', content)
      return NextResponse.json({ error: 'Analyse konnte nicht geparst werden' }, { status: 500 })
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Analyze asset error:', error)
    return NextResponse.json({ error: 'Interner Fehler bei der Analyse' }, { status: 500 })
  }
}
