import Link from 'next/link'
import Image from 'next/image'
import { House, Calendar, FileText, Users, ArrowRight, Phone, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Image
              src="/dmg-smart-house-logo.png"
              alt="DMG Service Logo"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl"
            />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight sm:text-xl">DMG Service</div>
              <div className="-mt-0.5 text-[9px] tracking-wide text-slate-500 sm:text-[10px]">KUNDENPORTAL</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:text-white sm:px-6 sm:py-2.5 sm:text-sm"
            >
              Anmelden
            </Link>
            <Link href="/register" className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm sm:gap-2 sm:px-6 sm:py-3 sm:text-base">
              <span className="hidden min-[380px]:inline">Registrieren</span>
              <span className="min-[380px]:hidden">Start</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-16 pt-[4.5rem] sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-4xl px-0 pt-10 text-center sm:pt-14 md:pt-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 sm:mb-6 sm:px-4">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-emerald-400 sm:text-sm">Wiesloch & Rhein-Neckar</span>
          </div>

          <h1 className="mb-5 text-4xl font-semibold leading-[1.08] tracking-tighter sm:mb-6 sm:text-5xl md:text-6xl lg:leading-none">
            <span className="block sm:inline">Ihr persönliches </span>
            <span className="block sm:inline">DMG Service Portal</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 sm:mb-12 sm:text-xl md:text-2xl">
            Verwalten Sie Ihre Anlagen, Termine und Dokumente – einfach, übersichtlich und jederzeit verfügbar.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="btn-primary group flex items-center justify-center gap-2 px-6 py-3.5 text-base sm:gap-3 sm:px-10 sm:py-4 sm:text-lg"
            >
              Kostenlos starten
              <ArrowRight className="transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="#features"
              className="flex items-center justify-center rounded-2xl border border-slate-700 px-6 py-3.5 text-base transition hover:bg-slate-900 sm:px-10 sm:py-4 sm:text-lg"
            >
              Mehr erfahren
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-2 text-xs font-semibold tracking-[2px] text-emerald-500 sm:mb-3 sm:text-sm sm:tracking-[3px]">ALLES AN EINEM ORT</div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="block lg:inline">Alles, was Sie brauchen – </span>
            <span className="block lg:inline">direkt in Ihrem Portal</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {[
            {
              icon: <House className="w-7 h-7" />,
              title: "Ihre Objekte & Anlagen",
              desc: "Haus, Wohnung oder Ferienimmobilie – alle Anlagen (Balkonkraftwerk, Heizung, Filter etc.) übersichtlich verwalten."
            },
            {
              icon: <FileText className="w-7 h-7" />,
              title: "Dokumente & Berichte",
              desc: "Angebote, Rechnungen und Serviceberichte jederzeit einsehen, herunterladen oder teilen."
            },
            {
              icon: <Calendar className="w-7 h-7" />,
              title: "Termine & Wartung",
              desc: "Einfach Termine für Wartung, Filterwechsel oder Reparatur anfragen – mit optionalem Foto-Upload."
            },
            {
              icon: <Users className="w-7 h-7" />,
              title: "Persönliches Profil",
              desc: "Ihre Daten, Kontakte und Präferenzen zentral gespeichert – für schnelle und persönliche Betreuung."
            },
            {
              icon: <div className="text-3xl">📸</div>,
              title: "Anlagen mit Foto erfassen",
              desc: "Foto der Anlage hochladen und Stammdaten eingeben oder aus Vorschlägen übernehmen."
            },
            {
              icon: <div className="text-3xl">🔔</div>,
              title: "Wartungserinnerungen",
              desc: "Automatische Erinnerungen per E-Mail oder WhatsApp – damit nichts vergessen wird."
            }
          ].map((feature, index) => (
            <div key={index} className="card group p-5 transition-all hover:border-emerald-900 sm:p-6 lg:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-emerald-500 transition-transform group-hover:scale-110 sm:mb-6 sm:h-14 sm:w-14">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold tracking-tight sm:mb-3 sm:text-2xl">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-900 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-2 text-xs font-semibold tracking-[2px] text-emerald-500 sm:mb-3 sm:text-sm sm:tracking-[3px]">SO EINFACH GEHT'S</div>
          <h2 className="mb-10 text-3xl font-semibold tracking-tight sm:mb-14 sm:text-4xl lg:mb-16 lg:text-5xl">In 3 Schritten zu Ihrem Portal</h2>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { step: "01", title: "Registrieren", desc: "Mit Ihrer E-Mail-Adresse und einem Passwort anmelden – in unter 2 Minuten." },
              { step: "02", title: "Objekte & Anlagen anlegen", desc: "Ihre Immobilien eintragen und Anlagen per Foto oder manuell hinzufügen." },
              { step: "03", title: "Alles im Blick behalten", desc: "Termine buchen, Dokumente abrufen und Wartungen planen – jederzeit und überall." }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 select-none text-[4.5rem] font-bold leading-none text-slate-800 sm:-top-10 sm:text-7xl md:text-[120px] md:-top-12">
                  {item.step}
                </div>
                <div className="relative pt-12 sm:pt-14 md:pt-16">
                  <h3 className="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl md:text-3xl">{item.title}</h3>
                  <p className="text-base leading-relaxed text-slate-400 sm:text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:mb-6 sm:text-4xl lg:text-5xl">Bereit für den nächsten Schritt?</h2>
          <p className="mb-8 text-lg text-slate-400 sm:mb-10 sm:text-xl lg:text-2xl">Eröffnen Sie jetzt Ihr persönliches DMG Service Kundenportal.</p>

          <Link
            href="/register"
            className="inline-flex items-center gap-3 rounded-3xl bg-emerald-600 px-8 py-4 text-base font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.985] sm:gap-4 sm:px-12 sm:py-5 sm:text-lg md:px-14 md:text-xl"
          >
            Jetzt kostenlos registrieren
            <ArrowRight className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
          </Link>

          <p className="mt-5 text-xs text-slate-500 sm:mt-6 sm:text-sm">Keine Kreditkarte nötig • Sofort nutzbar</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-black px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-y-10 md:grid-cols-12 md:gap-y-12">
          <div className="md:col-span-5">
            <div className="mb-4 flex items-center gap-3 sm:mb-6">
              <Image
                src="/dmg-smart-house-logo.png"
                alt="DMG Service Logo"
                width={36}
                height={36}
                className="rounded-xl"
              />
              <span className="text-xl font-semibold sm:text-2xl">DMG Service</span>
            </div>
            <p className="max-w-xs text-sm text-slate-400 sm:text-base">Technischer Handwerksservice in Wiesloch und der Rhein-Neckar-Region seit über 10 Jahren.</p>
          </div>

          <div className="md:col-span-3">
            <div className="font-semibold mb-4 text-sm tracking-widest text-slate-500">KONTAKT</div>
            <div className="space-y-2 text-sm">
              <a href="tel:+4917656193281" className="flex items-center gap-2 hover:text-emerald-400 transition">
                <Phone className="w-4 h-4" /> 0176 56193281
              </a>
              <a href="https://wa.me/4917656193281" target="_blank" className="flex items-center gap-2 hover:text-emerald-400 transition">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
              <a href="mailto:info@dmgservice.org" className="hover:text-emerald-400 transition">info@dmgservice.org</a>
            </div>
          </div>

          <div className="md:col-span-4 text-sm text-slate-400">
            <div className="font-semibold mb-4 text-sm tracking-widest text-slate-500">DMG SERVICE</div>
            <div>Sandbrunnenweg 39<br />69168 Wiesloch</div>
            <div className="mt-6 text-xs">© {new Date().getFullYear()} DMG Service. Alle Rechte vorbehalten.</div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link href="/impressum" className="text-slate-500 hover:text-emerald-400 transition">
                Impressum
              </Link>
              <Link href="/datenschutz" className="text-slate-500 hover:text-emerald-400 transition">
                Datenschutz
              </Link>
              <Link href="/agb" className="text-slate-500 hover:text-emerald-400 transition">
                Nutzungsbedingungen
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
