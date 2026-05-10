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
            <h2 className="mb-3 text-lg font-semibold text-white">Angaben gemäß § 5 TMG / § 55 RStV</h2>
            <address className="not-italic text-slate-200">
              {LEGAL_SITE.operatorTradeName}
              <br />
              {LEGAL_SITE.street}
              <br />
              {LEGAL_SITE.zip} {LEGAL_SITE.city}
              <br />
              {LEGAL_SITE.country}
            </address>
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
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Verantwortlich für den Inhalt</h2>
            <p>
              Verantwortlich im Sinne von §&nbsp;55 Abs.&nbsp;2 RStV: die Geschäftsführung / der Betrieb der{' '}
              {LEGAL_SITE.operatorTradeName}, erreichbar über die oben genannten Kontaktdaten.
            </p>
            <p className="mt-2 text-slate-400">
              (Falls juristische Person: Gesellschaft, Registergericht, Registernummer und vertretungsberechtigte Person
              hier ergänzen – bitte durch Ihre unternehmensrechtlichen Angaben ersetzen.)
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Umsatzsteuer</h2>
            <p className="text-slate-400">
              Umsatzsteuer-Identifikationsnummer gemäß §&nbsp;27a UStG: <em>[falls vorhanden eintragen]</em>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Streitschlichtung</h2>
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
              Verbraucherschlichtungsstelle teilzunehmen, soweit nicht gesetzlich anders vorgeschrieben.
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
