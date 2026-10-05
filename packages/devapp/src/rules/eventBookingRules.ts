import type { EventBooking, Attendee } from '@/models'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvue'

export const eventBookingRules: DryvValidationRuleSet<EventBooking> = {
  name: 'EventBooking',
  validators: {
    eventName: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.eventName?.trim()
            ? { type: 'error', text: 'Event name is required.', group: null }
            : null
      }
    ],
    date: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.date
            ? { type: 'error', text: 'Please select a date.', group: null }
            : null
      }
    ],
    'attendees.name': [
      {
        annotations: { required: true },
        validate: ($m: Attendee) =>
          !$m.name?.trim()
            ? { type: 'error', text: 'Attendee name is required.', group: null }
            : null
      }
    ],
    'attendees.email': [
      {
        validate: ($m: Attendee) =>
          $m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($m.email)
            ? { type: 'error', text: 'Invalid email address.', group: null }
            : null
      }
    ]
  }
}
