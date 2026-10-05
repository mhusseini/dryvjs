import { describe, it, expect } from 'vitest'
import { getValidationTriggerPolicy } from '@/session/validationTriggerPolicy'

describe('Validation Trigger Policies — Direct Unit Tests', () => {
  describe('immediate trigger', () => {
    it('should always allow validation', () => {
      const policy = getValidationTriggerPolicy('immediate')

      expect(policy.canValidate(false, false)).toBe(true)
      expect(policy.canValidate(true, false)).toBe(true)
      expect(policy.canValidate(false, true)).toBe(true)
      expect(policy.canValidate(true, true)).toBe(true)
    })
  })

  describe('auto trigger', () => {
    it('should always allow validation', () => {
      const policy = getValidationTriggerPolicy('auto')

      expect(policy.canValidate(false, false)).toBe(true)
      expect(policy.canValidate(true, false)).toBe(true)
      expect(policy.canValidate(false, true)).toBe(true)
      expect(policy.canValidate(true, true)).toBe(true)
    })
  })

  describe('manual trigger', () => {
    it('should only allow validation when isValidating is true', () => {
      const policy = getValidationTriggerPolicy('manual')

      expect(policy.canValidate(false, false)).toBe(false)
      expect(policy.canValidate(true, false)).toBe(true)
      expect(policy.canValidate(false, true)).toBe(false)
      expect(policy.canValidate(true, true)).toBe(true)
    })
  })

  describe('autoAfterManual trigger', () => {
    it('should allow when triggered or validating', () => {
      const policy = getValidationTriggerPolicy('autoAfterManual')

      expect(policy.canValidate(false, false)).toBe(false)
      expect(policy.canValidate(true, false)).toBe(true) // validating
      expect(policy.canValidate(false, true)).toBe(true)  // triggered
      expect(policy.canValidate(true, true)).toBe(true)   // both
    })
  })

  describe('default (undefined) trigger', () => {
    it('should fall back to immediate', () => {
      const policy = getValidationTriggerPolicy(undefined)

      expect(policy.canValidate(false, false)).toBe(true)
    })
  })

  describe('unknown trigger name', () => {
    it('should fall back to immediate', () => {
      const policy = getValidationTriggerPolicy('unknown' as any)

      expect(policy.canValidate(false, false)).toBe(true)
    })
  })
})
