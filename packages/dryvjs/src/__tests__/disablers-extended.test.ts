import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Disablers — Extended Edge Cases', () => {
  describe('async disablers', () => {
    it('should support async disabler rules', async () => {
      const validator = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: validator }]
        } as any,
        disablers: {
          name: [{
            validate: async () => {
              await new Promise((r) => setTimeout(r, 10))
              return true
            }
          }]
        } as any
      })

      const { validator: objValidator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await objValidator.fields.name!.validate()

      expect(result.success).toBe(true)
      expect(validator).not.toHaveBeenCalled()
    })
  })

  describe('disabler returning various falsy values', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['0', 0],
      ['empty string', ''],
      ['false', false],
    ])('should run validation when disabler returns %s', async (_label, value) => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any,
        disablers: {
          name: [{ validate: () => value }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(false)
    })
  })

  describe('disabler returning various truthy values', () => {
    it.each([
      ['true', true],
      ['1', 1],
      ['non-empty string', 'skip'],
      ['object', {}],
    ])('should skip validation when disabler returns %s', async (_label, value) => {
      const validator = vi.fn().mockReturnValue('Error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: validator }]
        } as any,
        disablers: {
          name: [{ validate: () => value }]
        } as any
      })

      const { validator: objValidator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await objValidator.fields.name!.validate()

      expect(result.success).toBe(true)
      expect(validator).not.toHaveBeenCalled()
    })
  })

  describe('no disablers defined', () => {
    it('should run validation normally when disablers is undefined', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any
        // disablers is undefined
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(false)
    })

    it('should run validation normally when disablers is empty object', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any,
        disablers: {} as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(false)
    })

    it('should run validation when disabler list for field is empty', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any,
        disablers: {
          name: []
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await validator.fields.name!.validate()

      expect(result.success).toBe(false)
    })
  })

  describe('field-level vs object-level disabler independence', () => {
    it('should disable one field but not another', async () => {
      const nameRule = vi.fn().mockReturnValue('Name error')
      const emailRule = vi.fn().mockReturnValue('Email error')

      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: nameRule }],
          email: [{ validate: emailRule }]
        } as any,
        disablers: {
          name: [{ validate: () => true }]
          // email has no disabler
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      const result = await validator.validate()

      expect(nameRule).not.toHaveBeenCalled()
      expect(emailRule).toHaveBeenCalled()
      expect(validator.fields.name!.text).toBeNull()
      expect(validator.fields.email!.text).toBe('Email error')
    })
  })
})
