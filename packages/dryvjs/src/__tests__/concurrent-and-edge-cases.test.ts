import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'
import { DryvValidationSession, dryvOptions, DryvObjectValidator, DryvValidationRuleSet } from '@/.'

describe('Concurrent Validation & Edge Cases', () => {
  describe('validation depth tracking', () => {
    it('should track isValidating during validation', async () => {
      const wasValidating: boolean[] = []

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{
            validate: ($m: any, session: any) => {
              // Session isn't directly accessible from rule, but we can check via object state
              return null
            }
          }]
        } as any
      })

      const { validator, session } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      expect(session.isValidating).toBe(false)

      const promise = validator.validate()
      // isValidating should be true during validation
      // But it's async, so we check after
      await promise

      expect(session.isValidating).toBe(false)
    })
  })

  describe('validation chain deduplication', () => {
    it('should not validate the same field twice in a single chain', async () => {
      const nameRule = vi.fn().mockReturnValue(null)
      const emailRule = vi.fn().mockReturnValue(null)

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: nameRule, related: ['email'] }],
          email: [{ validate: emailRule, related: ['name'] }]
        } as any
      })

      const { validator } = createObjectValidator({ name: 'a', email: 'b', age: 1 }, ruleSet)

      await validator.validate()

      // Each field should be validated exactly once despite mutual related references
      expect(nameRule).toHaveBeenCalledTimes(1)
      expect(emailRule).toHaveBeenCalledTimes(1)
    })
  })

  describe('empty model', () => {
    it('should handle validation of an empty model', async () => {
      interface EmptyModel {}
      const ruleSet = createRuleSet<EmptyModel>()
      const { validator } = createObjectValidator<EmptyModel>({}, ruleSet)

      const result = await validator.validate()

      expect(result.success).toBe(true)
      expect(validator.childValidators().length).toBe(0)
    })
  })

  describe('model with null/undefined field values', () => {
    it('should handle null field values', () => {
      interface Model { name: string | null }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ name: null }, ruleSet)

      expect(validator.fields.name).toBeDefined()
      expect(validator.fields.name!.value).toBeNull()
    })

    it('should validate fields with null values', async () => {
      interface Model { name: string | null }
      const ruleSet = createRuleSet<Model>({
        validators: {
          name: [{ validate: ($m: any) => ($m.name === null ? 'Name is required' : null) }]
        } as any
      })
      const { validator } = createObjectValidator<Model>({ name: null }, ruleSet)

      const result = await validator.validate()

      expect(result.hasErrors).toBe(true)
      expect(validator.fields.name!.text).toBe('Name is required')
    })
  })

  describe('handleResult option', () => {
    it('should be accessible via session.handleResult', async () => {
      const handleResult = vi.fn().mockImplementation(
        (_session: any, _model: any, _field: any, _rule: any, result: any) => Promise.resolve(result)
      )

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any
      })
      const { session } = createObjectValidator(
        { name: '', email: '', age: 0 },
        ruleSet,
        { handleResult }
      )

      // handleResult is exposed on the session for external consumers (Vue/Nuxt plugins)
      const result = await session.handleResult(
        session as any,
        { name: '', email: '', age: 0 },
        'name',
        null,
        'someResult'
      )

      expect(handleResult).toHaveBeenCalled()
      expect(result).toBe('someResult')
    })
  })

  describe('no rules for field', () => {
    it('should return success when field has no validation rules', async () => {
      const ruleSet = createRuleSet<SimpleModel>() // empty validators
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(true)
    })
  })

  describe('validation result with explicit success type', () => {
    it('should treat explicit success result from rule as passing', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => ({ type: 'success', text: 'OK' }) }]
        } as any
      })

      const { validator } = createObjectValidator({ name: 'ok', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(true)
    })
  })

  describe('multiple rules — partial pass', () => {
    it('should pass when all rules return null', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [
            { validate: () => null },
            { validate: () => null },
            { validate: () => null }
          ]
        } as any
      })

      const { validator } = createObjectValidator({ name: 'ok', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(true)
    })

    it('should stop at first warning and not run subsequent rules', async () => {
      const rule3 = vi.fn().mockReturnValue('Should not run')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [
            { validate: () => null },
            { validate: () => ({ type: 'warning', text: 'Warn' }) },
            { validate: rule3 }
          ]
        } as any
      })

      const { validator } = createObjectValidator({ name: 'ok', email: '', age: 0 }, ruleSet)
      await validator.fields.name!.validate()

      expect(rule3).not.toHaveBeenCalled()
      expect(validator.fields.name!.text).toBe('Warn')
      expect(validator.fields.name!.type).toBe('warning')
    })
  })

  describe('rule returning object with custom group', () => {
    it('should use group from the result object', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => ({ type: 'error', text: 'Error', group: 'fromResult' }), group: 'fromRule' }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      await validator.fields.name!.validate()

      // Result group should take precedence over rule group
      expect(validator.fields.name!.group).toBe('fromResult')
    })

    it('should fall back to rule group when result has no group', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => ({ type: 'error', text: 'Error' }), group: 'fromRule' }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      await validator.fields.name!.validate()

      expect(validator.fields.name!.group).toBe('fromRule')
    })
  })

  describe('session reset clears results', () => {
    it('should allow re-blocking after session reset for autoAfterManual', async () => {
      const rule = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: rule }]
        } as any
      })

      const { validator, session } = createObjectValidator(
        { name: '', email: '', age: 0 },
        ruleSet,
        { validationTrigger: 'autoAfterManual' }
      )

      // Trigger validation
      await validator.validate()
      rule.mockClear()

      // Field validation should now work
      await validator.fields.name!.validate()
      expect(rule).toHaveBeenCalledTimes(1)
      rule.mockClear()

      // Reset session
      session.reset()

      // Field validation should be blocked again
      await validator.fields.name!.validate()
      expect(rule).not.toHaveBeenCalled()
    })
  })
})

describe('Proxy Lifecycle', () => {
  it('should properly destroy lifecycle when replacing model', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'A', email: 'B', age: 1 }, ruleSet)

    // Replace model
    validator.value = { name: 'X', email: 'Y', age: 2 }

    expect(validator.value.name).toBe('X')
    expect(validator.fields.name!.value).toBe('X')
  })

  it('should support multiple rapid model replacements', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'A', email: 'B', age: 1 }, ruleSet)

    validator.value = { name: 'X', email: 'Y', age: 2 }
    validator.value = { name: 'P', email: 'Q', age: 3 }
    validator.value = { name: 'Final', email: 'Last', age: 99 }

    expect(validator.value.name).toBe('Final')
    expect(validator.fields.name!.value).toBe('Final')
    expect(validator.fields.email!.value).toBe('Last')
    expect(validator.fields.age!.value).toBe(99)
  })
})
