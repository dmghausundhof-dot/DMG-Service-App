import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_SITE } from '@/lib/legal-site'

export const metadata: Metadata = {
  title: 'Nutzungsbedingungen | DMG Service',
  description: 'Allgemeine Nutzungsbedingungen für das DMG Service Kundenportal.',
  robots: { index: true, follow: true },
}

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zur Startseite
        </Link>

        <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">Nutzungsbedingungen</h1>
        <p className="mb-10 text-sm text-slate-500">für das {LEGAL_SITE.serviceName}</p>

        <div className="space-y-8 text-sm leading-relaxed text-slate-300 sm:text-base">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Geltungsbereich</h2>
            <p>
              Diese Nutzungsbedingungen regeln die Nutzung des Online-Kundenportals der {LEGAL_SITE.operatorTradeName}
              (nachfolgend „Anbieter“) unter der jeweils angegebenen Internetadresse. Mit der Registrierung oder Nutzung
              des Portals erkennen Sie diese Bedingungen an.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Vertragsschluss und Konto</h2>
            <p>
              Ein Nutzungsvertrag kommt durch Ihre erfolgreiche Registrierung und ggf. Bestätigung Ihrer E-Mail-Adresse
              zustande. Sie verpflichten sich, wahre und vollständige Angaben zu machen und Zugangsdaten vertraulich zu
              behandeln. Der Anbieter kann Nutzerkonten sperren oder löschen, wenn ein wichtiger Grund vorliegt (z.&nbsp;B.
              Missbrauch, Rechtsverletzung, längere Inaktivität nach vorheriger Ankündigung, soweit zulässig).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Leistungsumfang</h2>
            <p>
              Das Portal dient zur Kommunikation und Organisation rund um Ihre Objekte, Anlagen, Termine und Dokumente
              sowie zu weiteren vom Anbieter bereitgestellten Funktionen. Einzelergebnisse (z.&nbsp;B. vorläufige
              Terminwünsche, automatisch aus Bildern abgeleitete Vorschläge) sind unverbindlich, sofern nicht ausdrücklich
              anders vereinbart.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Pflichten des Nutzers</h2>
            <p>
              Sie dürfen das Portal nicht missbräuchlich nutzen, keine rechtswidrigen Inhalte einstellen und keine
              Rechte Dritter verletzen. Hochgeladene Inhalte (Texte, Fotos) sollten nur Daten enthalten, für die Sie die
              erforderlichen Rechte haben.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Haftung</h2>
            <p>
              Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach Maßgabe des Produkthaftungsgesetzes.
              Im Übrigen haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten und deren Erfüllung die ordnungsgemäße
              Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Nutzer regelmäßig vertrauen darf
              (Kardinalpflichten); in diesem Fall ist die Haftung auf den typischerweise vorhersehbaren Schaden begrenzt. Die
              vorstehende Haftungsbeschränkung gilt nicht bei Verletzung von Leben, Körper oder Gesundheit.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Änderungen</h2>
            <p>
              Der Anbieter kann diese Bedingungen mit Wirkung für die Zukunft ändern. Über wesentliche Änderungen werden Sie
              in geeigneter Weise informiert, sofern dies gesetzlich oder vertraglich erforderlich ist.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Anwendbares Recht</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit nicht zwingendes
              Verbraucherschutzrecht eines anderen Staates eingreift.
            </p>
          </section>

          <p className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500">
            Diese Nutzungsbedingungen sind eine sachliche Grundlage und ersetzen keine individuelle juristische Prüfung für
            Ihr Unternehmen.
          </p>

          <p className="text-center">
            <Link href="/datenschutz" className="text-emerald-400 hover:underline">
              Datenschutzerklärung
            </Link>
            {' · '}
            <Link href="/impressum" className="text-emerald-400 hover:underline">
              Impressum
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
