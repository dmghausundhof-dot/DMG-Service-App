import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_SITE } from '@/lib/legal-site'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | DMG Service',
  description: 'Informationen zur Verarbeitung personenbezogener Daten im DMG Service Kundenportal.',
  robots: { index: true, follow: true },
}

export default function DatenschutzPage() {
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

        <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">Datenschutzerklärung</h1>
        <p className="mb-10 text-sm text-slate-500">Stand: {new Intl.DateTimeFormat('de-DE').format(new Date())}</p>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300 sm:text-base">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Verantwortliche Stelle</h2>
            <p>
              Verantwortlich für die Datenverarbeitung im Zusammenhang mit diesem Online-Angebot ({LEGAL_SITE.serviceName}{' '}
              und zusammenhängende Auftritte) entspricht der öffentlichen Darstellung unter{' '}
              <a
                href={LEGAL_SITE.publicWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {siteHost}
              </a>
              :
            </p>
            <address className="mt-3 not-italic text-slate-200">
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
              <br />
              E-Mail:{' '}
              <a href={`mailto:${LEGAL_SITE.email}`} className="text-emerald-400 hover:underline">
                {LEGAL_SITE.email}
              </a>
              <br />
              Telefon:{' '}
              <a href={`tel:${LEGAL_SITE.phoneTel}`} className="text-emerald-400 hover:underline">
                {LEGAL_SITE.phoneDisplay}
              </a>
              <br />
              WhatsApp:{' '}
              <a
                href={LEGAL_SITE.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Kontakt (WhatsApp)
              </a>
            </address>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Allgemeines</h2>
            <p>
              Wir verarbeiten personenbezogene Daten im Einklang mit der Datenschutz-Grundverordnung (DSGVO) und dem
              Bundesdatenschutzgesetz (BDSG). Personenbezogene Daten sind alle Informationen, die sich auf eine
              identifizierte oder identifizierbare natürliche Person beziehen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Hosting & Infrastruktur</h2>
            <p>
              Der öffentliche Auftritt unter {siteHost} und dieses{' '}
              <strong className="font-medium text-slate-200">{LEGAL_SITE.serviceName}</strong> werden über Hosting-Anbieter
              betrieben (z.&nbsp;B. Vercel Inc., USA, bzw. entsprechende Rechenzentren innerhalb der EU – je nach
              Konfiguration des Deployments). Der Hoster verarbeitet Bestands- und Nutzungsdaten in dem Maße, wie dies zur
              Bereitstellung der Seite und zur Sicherheit (z.&nbsp;B. Zugriffsprotokolle) erforderlich ist.
              Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse an sicherem und stabilem
              Betrieb). Mit dem Hoster bestehen – soweit erforderlich – Auftragsverträge gemäß Art.&nbsp;28 DSGVO. Bei einer
              Datenübermittlung in ein Drittland (z.&nbsp;B. USA) stützen wir uns auf geeignete Garantien (z.&nbsp;B.
              EU-Standardvertragsklauseln), sofern kein Angemessenheitsbeschluss vorliegt.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Authentifizierung und Kundenkonto (Supabase)</h2>
            <p>
              Für Registrierung, Login und die Speicherung Ihrer Stammdaten nutzen wir die Plattform{' '}
              <strong className="font-medium text-slate-200">Supabase</strong> (Supabase Inc., Anbieter mit
              EU-Bezug je nach Projektregion). Dort werden u.&nbsp;a. E-Mail-Adresse, technische Kennungen und von Ihnen
              eingegebene Profil- und Objektdaten verarbeitet. Rechtsgrundlage für die Vertragsdurchführung ist Art.&nbsp;6
              Abs.&nbsp;1 lit.&nbsp;b DSGVO; für Sicherheitsmaßnahmen ggf. Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO. Mit Supabase
              besteht ein Auftragsvertrag (Art.&nbsp;28 DSGVO), soweit die Rolle als Auftragsverarbeiter vorliegt.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Nutzung des Portals (Anlagen, Termine, Dokumente)</h2>
            <p>
              Von Ihnen eingegebene oder hochgeladene Inhalte (z.&nbsp;B. Objekte, Anlagen, Terminwünsche, Fotos,
              Dokumentmetadaten) werden zur Erbringung der vereinbarten Dienstleistungen verarbeitet und gespeichert.
              Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO (Vertrag / vorvertragliche Maßnahmen), soweit es um
              die Erfüllung des Nutzungsverhältnisses geht.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Bild-Auswertung (optional)</h2>
            <p>
              Wenn Sie eine Bild-Auswertung zur Unterstützung bei der Erfassung von Anlagendaten nutzen, wird das Bild
              verarbeitungsbedürftig an einen technischen Dienst (z.&nbsp;B. xAI / API-Anbieter außerhalb der EU möglich)
              übermittelt. Umfang und Zweck beschränken sich auf die Ableitung technischer Angaben aus dem von Ihnen
              freigegebenen Bild. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO (Durchführung des Vertrags)
              bzw. bei rein optionaler Nutzung Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (Einwilligung), wenn Sie diese Funktion
              aktiv anstoßen. Es werden – soweit mit dem Anbieter vereinbart – die Vorgaben zu Auftragsverarbeitung oder
              Standardvertragsklauseln eingehalten.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Cookies, lokale Speicherung, PWA</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-slate-200">Sitzung / Login:</strong> Technisch notwendige Cookies oder
                vergleichbare Mechanismen speichern Ihren Anmeldestatus. Ohne diese Funktion ist das Portal nicht nutzbar.
                Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO bzw. für Sicherheit Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO.
              </li>
              <li>
                <strong className="font-medium text-slate-200">Progressive Web App (PWA):</strong> Beim „Zum Home-Bildschirm
                hinzufügen“ kann Ihr Browser einen Service Worker und lokale Caches nutzen, um die Anwendung offlinefähiger
                zu machen. Es werden keine Werbeprofile gebildet. Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO
                (nutzerfreundlicher Betrieb) bzw. bei zwingend notwendiger technischer Funktion Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b
                DSGVO.
              </li>
              <li>
                Wir setzen <strong className="font-medium text-slate-200">keine</strong> nicht notwendigen Marketing- oder
                Analyse-Cookies ohne Ihre Einwilligung ein.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Speicherdauer</h2>
            <p>
              Wir speichern personenbezogene Daten nur so lange, wie dies für den jeweiligen Zweck erforderlich ist oder
              gesetzliche Aufbewahrungsfristen bestehen. Konto- und Vertragsdaten werden gelöscht oder anonymisiert,
              sobald die Speicherung nicht mehr erforderlich ist und keine Pflichten der Aufbewahrung entgegenstehen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Ihre Rechte</h2>
            <p>Sie haben – jeweils nach den gesetzlichen Voraussetzungen – insbesondere folgende Rechte:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Auskunft (Art.&nbsp;15 DSGVO)</li>
              <li>Berichtigung (Art.&nbsp;16 DSGVO)</li>
              <li>Löschung (Art.&nbsp;17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art.&nbsp;18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art.&nbsp;20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art.&nbsp;21 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Zur Geltendmachung wenden Sie sich an die oben genannten Kontaktdaten. Außerdem haben Sie das Recht,
              Beschwerde bei einer Datenschutz-Aufsichtsbehörde einzureichen.
            </p>
            <p className="mt-3">
              <strong className="font-medium text-slate-200">Löschung des Nutzerkontos (Art.&nbsp;17 DSGVO):</strong> Im
              geschützten Bereich unter <strong className="font-medium text-slate-200">Profil</strong> können Sie nach
              Prüfung Ihres Passworts und ausdrücklicher Bestätigung Ihr Konto und die damit im Portal gespeicherten
              personenbezogenen Daten unwiderruflich löschen. Technisch umfasst dies u.&nbsp;a. die Entfernung Ihres
              Nutzerzugangs (Authentifizierung), die Löschung der zugehörigen Datensätze in der Anwendungsdatenbank sowie
              die Beseitigung zugehöriger Dateien im Speicher (z.&nbsp;B. hochgeladene Bilder und Dokumente), soweit keine
              gesetzlichen Aufbewahrungspflichten oder sonstigen in Art.&nbsp;17 Abs.&nbsp;3 DSGVO genannten Gründe
              entgegenstehen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Änderungen</h2>
            <p>
              Wir können diese Erklärung anpassen, wenn sich Rechtslage oder Dienste ändern. Die jeweils aktuelle Fassung
              finden Sie auf dieser Seite.
            </p>
          </section>

          <p className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500">
            Hinweis: Diese Darstellung ersetzt keine individuelle Rechtsberatung. Lassen Sie die endgültige Fassung ggf.
            durch eine Rechtsanwalts- oder Datenschutzkanzlei prüfen, insbesondere bei internationalen Übermittlungen
            und konkretem Verarbeitungsumfang.
          </p>

          <p className="text-center">
            <Link href="/impressum" className="text-emerald-400 hover:underline">
              Impressum
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
