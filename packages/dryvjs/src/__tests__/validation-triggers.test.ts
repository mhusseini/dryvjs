import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Validation Triggers', () => {
  describe('manual trigger', () => {
    it('should not validate fields when called outside of validateObject', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'manual'
      })

      await validator.fields.name!.validate()
      expect(rule).not.toHaveBeenCalled()
    })

    it('should validate fields when called through validateObject', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'manual'
      })

      await validator.validate()
      expect(rule).toHaveBeenCalled()
    })
  })

  describe('autoAfterManual trigger', () => {
    it('should not validate fields before first manual validation', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'autoAfterManual'
      })

      await validator.fields.name!.validate()
      expect(rule).not.toHaveBeenCalled()
    })

    it('should validate fields after first manual validation is triggered', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'autoAfterManual'
      })

      await validator.validate()
      rule.mockClear()

      await validator.fields.name!.validate()
      expect(rule).toHaveBeenCalled()
    })
  })

  describe('auto trigger', () => {
    it('should validate fields immediately on field validate call', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'auto'
      })

      await validator.fields.name!.validate()
      expect(rule).toHaveBeenCalled()
    })
  })

  describe('session reset', () => {
    it('should reset triggered state so autoAfterManual blocks again', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator, session } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
        validationTrigger: 'autoAfterManual'
      })

      await validator.validate()
      rule.mockClear()

      session.reset()

      await validator.fields.name!.validate()
      expect(rule).not.toHaveBeenCalled()
    })
  })
})
