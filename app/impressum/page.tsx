import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_SITE } from '@/lib/legal-site'

export const metadata: Metadata = {
  title: 'Impressum | DMG Service',
  description: 'Impressum und Anbieterkennzeichnung – DMG Service Kundenportal.',
  robots: { index: true, follow: true },
}

export default function ImpressumPage() {
  const siteHost = LEGAL_SITE.publicWebsiteUrl.replace(/^https?:\/\//, '')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zur Startseite
        </Link>

        <h1 className="mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">Impressum</h1>

        <div className="space-y-8 text-sm leading-relaxed text-slate-300 sm:text-base">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Angaben gemäß §&nbsp;5 TMG</h2>
            <address className="not-italic text-slate-200">
              <span className="font-medium text-white">{LEGAL_SITE.operatorTradeName}</span>
              <br />
              {LEGAL_SITE.operatorTagline}
              <br />
              Inhaber: {LEGAL_SITE.proprietorDisplayName}
              <br />
              <br />
              {LEGAL_SITE.street}
              <br />
              {LEGAL_SITE.zip} {LEGAL_SITE.city}
              <br />
              {LEGAL_SITE.country}
            </address>
            <p className="mt-4 text-slate-400">
              Öffentlicher Auftritt und Kontakt auch unter{' '}
              <a
                href={LEGAL_SITE.publicWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {siteHost}
              </a>{' '}
              ({LEGAL_SITE.serviceRegion}).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Kontakt</h2>
            <p>
              E-Mail:{' '}
              <a href={`mailto:${LEGAL_SITE.email}`} className="text-emerald-400 hover:underline">
                {LEGAL_SITE.email}
              </a>
            </p>
            <p className="mt-1">
              Telefon:{' '}
              <a href={`tel:${LEGAL_SITE.phoneTel}`} className="text-emerald-400 hover:underline">
                {LEGAL_SITE.phoneDisplay}
              </a>
            </p>
            <p className="mt-1">
              WhatsApp:{' '}
              <a
                href={LEGAL_SITE.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Nachricht senden (WhatsApp)
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Verantwortlich für den Inhalt</h2>
            <p>
              Verantwortlich im Sinne von §&nbsp;55 Abs.&nbsp;2 RStV:{' '}
              <strong className="font-medium text-slate-200">{LEGAL_SITE.proprietorDisplayName}</strong>, erreichbar über die
              obigen Kontaktdaten und die Adresse von {LEGAL_SITE.operatorTradeName}.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Hinweis zum Kundenportal</h2>
            <p>
              Dieses Impressum gilt auch für das registrierpflichtige{' '}
              <strong className="font-medium text-slate-200">{LEGAL_SITE.serviceName}</strong>. Informative Inhalte und die
              Darstellung der Leistungen entsprechen dem öffentlichen Webauftritt unter{' '}
              <a
                href={LEGAL_SITE.publicWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {siteHost}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen, soweit gesetzlich nicht etwas anderes gilt.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Haftung für Inhalte und Links</h2>
            <p>
              Als Diensteanbieter sind wir gemäß §&nbsp;7 Abs.&nbsp;1 TMG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Für die Inhalte externer Links übernehmen wir keine Haftung; für den
              Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </section>

          <p className="text-center">
            <Link href="/datenschutz" className="text-emerald-400 hover:underline">
              Datenschutzerklärung
            </Link>
            {' · '}
            <Link href="/agb" className="text-emerald-400 hover:underline">
              Nutzungsbedingungen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
