import type { RegistrationForm } from '@/models'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvue'

export const registrationRules: DryvValidationRuleSet<RegistrationForm> = {
  name: 'RegistrationForm',
  validators: {
    firstName: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.firstName?.trim()
            ? { type: 'error', text: 'First name is required.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.firstName && $m.firstName.length < 2
            ? { type: 'error', text: 'First name must be at least 2 characters.', group: null }
            : null
      }
    ],
    lastName: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.lastName?.trim()
            ? { type: 'error', text: 'Last name is required.', group: null }
            : null
      }
    ],
    email: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.email?.trim()
            ? { type: 'error', text: 'Email address is required.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($m.email)
            ? { type: 'error', text: 'Please enter a valid email address.', group: null }
            : null
      }
    ],
    password: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.password
            ? { type: 'error', text: 'Password is required.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.password && $m.password.length < 8
            ? { type: 'error', text: 'Password must be at least 8 characters.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.password && !/[A-Z]/.test($m.password)
            ? { type: 'warning', text: 'Consider adding an uppercase letter for a stronger password.', group: null }
            : null
      }
    ],
    confirmPassword: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.confirmPassword
            ? { type: 'error', text: 'Please confirm your password.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.confirmPassword && $m.password && $m.confirmPassword !== $m.password
            ? { type: 'error', text: 'Passwords do not match.', group: null }
            : null
      }
    ],
    agreeTerms: [
      {
        validate: ($m) =>
          !$m.agreeTerms
            ? { type: 'error', text: 'You must agree to the terms and conditions.', group: null }
            : null
      }
    ]
  }
}
