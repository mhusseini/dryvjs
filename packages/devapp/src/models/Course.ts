export interface Course {
  name?: string
  people: {
    attendees: Attendee[]
  }
}

export interface Attendee {
  name?: string
  email?: string
  phone?: string
}
