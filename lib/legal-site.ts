/**
 * Einheitliche Angaben wie auf www.dmgservice.org — verwendet von Impressum, Datenschutz, AGB,
 * Footer und weiteren rechtlichen Texten des Kundenportals.
 */
export const LEGAL_SITE = {
  serviceName: 'DMG Service Kundenportal',

  operatorTradeName: 'DMG Service',
  /** Kurzbeschreibung wie auf der öffentlichen Website */
  operatorTagline: 'Technischer Handwerks- & Montageservice',
  /** Einsatzgebiet wie auf dmgservice.org */
  serviceRegion: 'Wiesloch und die Rhein-Neckar-Region',

  /** Inhaber wie auf der öffentlichen Website angegeben („… mit mir – Luka“). */
  proprietorDisplayName: 'Luka',

  street: 'Sandbrunnenweg 39',
  zip: '69168',
  city: 'Wiesloch',
  country: 'Deutschland',

  email: 'info@dmgservice.org',
  phoneTel: '+4917656193281',
  phoneDisplay: '0176 56193281',

  /** Wie auf der Homepage */
  publicWebsiteUrl: 'https://www.dmgservice.org',
  whatsAppUrl: 'https://wa.me/4917656193281',
} as const
