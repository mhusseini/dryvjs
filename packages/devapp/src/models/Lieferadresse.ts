export interface Lieferadresse {
  abweichendeRechnungsadresse?: boolean
  lieferadresse: {
    postleitzahl?: string | null
    ort?: string | null
    strasse?: string | null
    hausnummer?: string | null
  }
  rechnungsadresse: {
    anrede?: string | null
    vorname?: string | null
    nachname?: string | null
    postleitzahl?: string | null
    ort?: string | null
    strasse?: string | null
    hausnummer?: string | null
  }
}
