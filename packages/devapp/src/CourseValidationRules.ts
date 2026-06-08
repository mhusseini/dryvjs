import type { Course } from '@/models'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvue'
import type { Attendee } from '@/models/Course'

export const courseValidationRules: DryvValidationRuleSet<Course> = {
  validators: {
    name: [
      {
        annotations: {
          required: true
        },
        validate: function ($m: Course) {
          return !/\S/.test($m.name || '') ? "Please provide the course's name" : null
        }
      }
    ],
    'people.attendees.name': [
      {
        annotations: {
          required: true
        },
        validate: function ($m: Attendee) {
          return !/\S/.test($m?.name || '') ? "Please provide the attendee's name" : null
        }
      }
    ]
  }
}
