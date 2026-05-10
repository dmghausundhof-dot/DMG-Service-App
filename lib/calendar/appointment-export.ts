/**
 * Kalenderexport für bestätigte Termine (ICS + Deep-Links).
 * preferred_date im Format YYYY-MM-DD (Postgres date).
 */

export function icsEscapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function formatIcsUtcStamp(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const sec = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${day}T${h}${min}${sec}Z`
}

/** Ganztägiges Ereignis (lokales Datum ohne Zeitzonen-Verschiebung). */
function ymdParts(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function nextDayYmd(ymd: string): string {
  const p = ymdParts(ymd)
  if (!p) return ymd
  const dt = new Date(p.y, p.m - 1, p.d + 1)
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export type AppointmentCalendarInput = {
  id: string
  title: string
  /** YYYY-MM-DD */
  preferredDate: string
  timeWindow?: string | null
  description?: string | null
  location?: string | null
}

export function buildGoogleCalendarUrl(a: AppointmentCalendarInput): string {
  const p = ymdParts(a.preferredDate)
  if (!p) return '#'
  const start = `${String(p.y)}${String(p.m).padStart(2, '0')}${String(p.d).padStart(2, '0')}`
  const endP = ymdParts(nextDayYmd(a.preferredDate))
  if (!endP) return '#'
  const end = `${String(endP.y)}${String(endP.m).padStart(2, '0')}${String(endP.d).padStart(2, '0')}`

  const details = [a.timeWindow ? `Zeitfenster: ${a.timeWindow}` : null, a.description?.trim() || null]
    .filter(Boolean)
    .join('\n\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: a.title,
    dates: `${start}/${end}`,
    details,
    location: a.location?.trim() || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Outlook Web (Microsoft 365 / live) – ganztägig via halboffenes Intervall in UTC. */
export function buildOutlookWebCalendarUrl(a: AppointmentCalendarInput): string {
  const p = ymdParts(a.preferredDate)
  if (!p) return '#'
  const startIso = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}T00:00:00.000Z`
  const endP = ymdParts(nextDayYmd(a.preferredDate))
  const endIso = endP
    ? `${endP.y}-${String(endP.m).padStart(2, '0')}-${String(endP.d).padStart(2, '0')}T00:00:00.000Z`
    : startIso

  const body = [a.timeWindow ? `Zeitfenster: ${a.timeWindow}` : null, a.description?.trim() || null]
    .filter(Boolean)
    .join('\n\n')

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: a.title,
    startdt: startIso,
    enddt: endIso,
    body,
    location: a.location?.trim() || '',
    allday: 'true',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function buildAppointmentIcs(a: AppointmentCalendarInput): string {
  const p = ymdParts(a.preferredDate)
  if (!p) return ''
  const endYmd = nextDayYmd(a.preferredDate)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DMG Service//Termin//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a.id}@dmg-service.app`,
    `DTSTAMP:${formatIcsUtcStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${String(p.y)}${String(p.m).padStart(2, '0')}${String(p.d).padStart(2, '0')}`,
    `DTEND;VALUE=DATE:${(() => {
      const e = ymdParts(endYmd)
      return e
        ? `${String(e.y)}${String(e.m).padStart(2, '0')}${String(e.d).padStart(2, '0')}`
        : ''
    })()}`,
    `SUMMARY:${icsEscapeText(a.title)}`,
  ]
  const desc = [
    a.timeWindow ? `Zeitfenster: ${a.timeWindow}` : null,
    a.description?.trim() || null,
  ]
    .filter(Boolean)
    .join('\\n')
  if (desc) lines.push(`DESCRIPTION:${icsEscapeText(desc)}`)
  if (a.location?.trim()) lines.push(`LOCATION:${icsEscapeText(a.location.trim())}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadCalendarFile(body: string, filename: string) {
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
