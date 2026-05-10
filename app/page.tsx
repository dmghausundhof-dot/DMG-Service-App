import Link from 'next/link'
import Image from 'next/image'
import { House, Calendar, FileText, Users, ArrowRight, Phone, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">
          <div className="flex items-center gap-3">
            <Image 
              src="/dmg-smart-house-logo.png" 
              alt="DMG Service Logo" 
              width={40} 
              height={40} 
              className="rounded-xl" 
            />
            <div>
              <div className="font-semibold text-xl tracking-tight">DMG Service</div>
              <div className="text-[10px] text-slate-500 -mt-1">KUNDENPORTAL</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-6 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Anmelden
            </Link>
            <Link 
              href="/register" 
              className="btn-primary flex items-center gap-2"
            >
              Jetzt registrieren
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center pt-16">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1 mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-emerald-400 font-medium">Wiesloch & Rhein-Neckar</span>
          </div>

          <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-6">
            Ihr persönliches<br />DMG Service Portal
          </h1>
          
          <p className="max-w-2xl mx-auto text-2xl text-slate-400 mb-12">
            Verwalten Sie Ihre Anlagen, Termine und Dokumente – einfach, übersichtlich und jederzeit verfügbar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="btn-primary text-lg px-10 py-4 flex items-center justify-center gap-3 group"
            >
              Kostenlos starten
              <ArrowRight className="group-hover:translate-x-1 transition" />
            </Link>
            
            <Link 
              href="#features" 
              className="px-10 py-4 text-lg border border-slate-700 hover:bg-slate-900 rounded-2xl transition flex items-center justify-center"
            >
              Mehr erfahren
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <div className="text-emerald-500 text-sm font-semibold tracking-[3px] mb-3">ALLES AN EINEM ORT</div>
          <h2 className="text-5xl font-semibold tracking-tight">Alles, was Sie brauchen –<br />direkt in Ihrem Portal</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <House className="w-7 h-7" />,
              title: "Ihre Objekte & Anlagen",
              desc: "Haus, Wohnung oder Ferienimmobilie – alle Anlagen (Balkonkraftwerk, Wärmepumpe, Filter etc.) übersichtlich verwalten."
            },
            {
              icon: <FileText className="w-7 h-7" />,
              title: "Dokumente & Berichte",
              desc: "Angebote, Rechnungen und Serviceberichte jederzeit einsehen, herunterladen oder teilen."
            },
            {
              icon: <Calendar className="w-7 h-7" />,
              title: "Termine & Wartung",
              desc: "Einfach Termine für Wartung, Filterwechsel oder Reparatur buchen – mit Foto-Upload und Dringlichkeit."
            },
            {
              icon: <Users className="w-7 h-7" />,
              title: "Persönliches Profil",
              desc: "Ihre Daten, Kontakte und Präferenzen zentral gespeichert – für schnelle und persönliche Betreuung."
            },
            {
              icon: <div className="text-3xl">📸</div>,
              title: "KI-gestützte Anlagenerkennung",
              desc: "Einfach Foto hochladen – Grok erkennt automatisch Hersteller, Typ und Wartungsdaten. Sie bestätigen nur noch."
            },
            {
              icon: <div className="text-3xl">🔔</div>,
              title: "Wartungserinnerungen",
              desc: "Automatische Erinnerungen per E-Mail oder WhatsApp – damit nichts vergessen wird."
            }
          ].map((feature, index) => (
            <div key={index} className="card p-8 group hover:border-emerald-900 transition-all">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-900 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-emerald-500 text-sm font-semibold tracking-[3px] mb-3">SO EINFACH GEHT'S</div>
          <h2 className="text-5xl font-semibold tracking-tight mb-16">In 3 Schritten zu Ihrem Portal</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Registrieren", desc: "Mit Ihrer E-Mail-Adresse und einem Passwort anmelden – in unter 2 Minuten." },
              { step: "02", title: "Objekte & Anlagen anlegen", desc: "Ihre Immobilien eintragen und Anlagen per Foto oder manuell hinzufügen." },
              { step: "03", title: "Alles im Blick behalten", desc: "Termine buchen, Dokumente abrufen und Wartungen planen – jederzeit und überall." }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-[120px] font-bold text-slate-800 absolute -top-12 left-1/2 -translate-x-1/2 select-none">{item.step}</div>
                <div className="relative pt-16">
                  <h3 className="text-3xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-6">Bereit für den nächsten Schritt?</h2>
          <p className="text-2xl text-slate-400 mb-10">Eröffnen Sie jetzt Ihr persönliches DMG Service Kundenportal.</p>
          
          <Link 
            href="/register" 
            className="inline-flex items-center gap-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-medium px-14 py-5 rounded-3xl transition-all active:scale-[0.985]"
          >
            Jetzt kostenlos registrieren
            <ArrowRight className="w-6 h-6" />
          </Link>

          <p className="mt-6 text-sm text-slate-500">Keine Kreditkarte nötig • Sofort nutzbar</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-800 py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-y-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <Image 
                src="/dmg-smart-house-logo.png" 
                alt="DMG Service Logo" 
                width={36} 
                height={36} 
                className="rounded-xl" 
              />
              <span className="font-semibold text-2xl">DMG Service</span>
            </div>
            <p className="text-slate-400 max-w-xs">Technischer Handwerksservice in Wiesloch und der Rhein-Neckar-Region seit über 10 Jahren.</p>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
