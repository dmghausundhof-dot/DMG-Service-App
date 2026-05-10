'use client'

import {
  buildAppointmentIcs,
  buildGoogleCalendarUrl,
  buildOutlookWebCalendarUrl,
  downloadCalendarFile,
  type AppointmentCalendarInput,
} from '@/lib/calendar/appointment-export'
import { Calendar, Download } from 'lucide-react'

type Props = {
  appointmentId: string
  serviceType: string
  preferredDate: string | null | undefined
  timeWindow?: string | null
  /** z. B. "Objektname, Stadt" */
  locationLabel?: string | null
  description?: string | null
}

function inputFromProps(p: Props): AppointmentCalendarInput | null {
  if (!p.preferredDate?.trim()) return null
  return {
    id: p.appointmentId,
    title: `DMG Service: ${p.serviceType}`,
    preferredDate: p.preferredDate.trim(),
    timeWindow: p.timeWindow,
    description: p.description,
    location: p.locationLabel,
  }
}

export function AppointmentCalendarExports(props: Props) {
  const data = inputFromProps(props)
  if (!data) return null

  const google = buildGoogleCalendarUrl(data)
  const outlook = buildOutlookWebCalendarUrl(data)

  const onDownloadIcs = () => {
    const body = buildAppointmentIcs(data)
    if (!body) return
    downloadCalendarFile(body, `dmg-termin-${data.preferredDate}.ics`)
  }

  return (
    <div className="rounded-3xl border border-emerald-900/40 bg-emerald-950/20 p-6">
      <div className="flex items-center gap-2 font-semibold text-emerald-200 mb-4">
        <Calendar className="w-5 h-5 text-emerald-400" /> In Kalender übernehmen
      </div>
      <p className="text-sm text-slate-400 mb-4">
        ICS-Datei funktioniert mit Apple Kalender, Outlook und vielen anderen Apps
        („Abonnieren“ bzw. Datei öffnen). Google und Outlook-Web öffnen direkt im Browser.
      </p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <button
          type="button"
          onClick={onDownloadIcs}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm"
        >
          <Download className="w-4 h-4" />
          ICS / Apple &amp; Outlook
        </button>
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
        >
          Google Kalender
        </a>
        <a
          href={outlook}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
        >
          Outlook (Web)
        </a>
      </div>
    </div>
  )
}
