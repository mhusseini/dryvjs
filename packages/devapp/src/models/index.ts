export interface RegistrationForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

export interface ContactForm {
  email: string
  phone: string
  preferredContact: string
  message: string
}

export interface EventBooking {
  eventName: string
  date: string
  attendees: Attendee[]
}

export interface Attendee {
  name: string
  email: string
}

export interface ProfileForm {
  displayName: string
  bio: string
  website: string
  birthDate: string
  country: string
}

export interface FileUploadForm {
  title: string
  files: File[]
}
