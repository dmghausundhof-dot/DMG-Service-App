/** 00:00 … 23:30 in 30-Minuten-Schritten (24 h) */
export function buildHalfHourSlots(): string[] {
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return out
}

export const APPOINTMENT_TIME_SLOTS = buildHalfHourSlots()

export function timeToMinutes(t: string): number {
  const [h, min] = t.split(':').map(Number)
  return h * 60 + min
}

/** Liest „HH:MM–HH:MM“ aus gespeichertem Text (z. B. „09:30-17:00“). */
export function parseStoredTimeWindow(raw: string | null | undefined): { from: string; to: string } {
  if (!raw?.trim()) return { from: '', to: '' }
  const t = raw.trim()
  const re = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/
  const m = t.match(re)
  if (!m?.[1] || !m[2]) return { from: '', to: '' }
  const norm = (s: string) => {
    const [h, min] = s.split(':').map(Number)
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  return { from: norm(m[1]), to: norm(m[2]) }
}
