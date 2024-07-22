export interface Course {
  name?: string
  attendees?: Attendee[]
}

export interface Attendee {
  name?: string
  email?: string
  phone?: string
}
