export * from './Lieferadresse'
export * from './Course'

export interface PersonalData extends Object {
  anrede: string
  vorname: string
  nachname: string
  geburtsdatum?: string
  emailAdresse?: string
  telefonNummer?: string
  werberVertragsnummer?: string
  child?: PersonalData
  location?: Location
  numbers?: number[]
}

export interface Location {
  street: string
  city: string
  zip: string
}
