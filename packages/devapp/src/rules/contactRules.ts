import type { ContactForm } from '@/models'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvue'

export const contactRules: DryvValidationRuleSet<ContactForm> = {
  name: 'ContactForm',
  validators: {
    email: [
      {
        related: ['phone'],
        validate: ($m) =>
          !$m.email?.trim() && !$m.phone?.trim()
            ? { type: 'error', text: 'Please provide either an email or a phone number.', group: 'contactMethod' }
            : null
      },
      {
        validate: ($m) =>
          $m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($m.email)
            ? { type: 'error', text: 'Please enter a valid email address.', group: null }
            : null
      }
    ],
    phone: [
      {
        related: ['email'],
        validate: ($m) =>
          !$m.email?.trim() && !$m.phone?.trim()
            ? { type: 'error', text: 'Please provide either an email or a phone number.', group: 'contactMethod' }
            : null
      },
      {
        validate: ($m) =>
          $m.phone && !/^[+\d\s\-()]{7,20}$/.test($m.phone)
            ? { type: 'error', text: 'Please enter a valid phone number.', group: null }
            : null
      }
    ],
    message: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.message?.trim()
            ? { type: 'error', text: 'Please enter a message.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.message && $m.message.length < 10
            ? { type: 'warning', text: 'Your message is quite short. Consider adding more detail.', group: null }
            : null
      }
    ]
  }
}
