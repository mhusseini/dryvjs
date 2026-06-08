import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Exception Handling', () => {
  it('should fail validation when exceptionHandling is failValidation and rule throws', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            throw new Error('Unexpected error')
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
      exceptionHandling: 'failValidation'
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await validator.fields.name!.validate()
    consoleSpy.mockRestore()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
    expect(validator.fields.name!.text).toBe('Validation failed.')
  })

  it('should succeed validation when exceptionHandling is succeedValidation and rule throws', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            throw new Error('Unexpected error')
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
      exceptionHandling: 'succeedValidation'
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await validator.fields.name!.validate()
    consoleSpy.mockRestore()

    expect(result.success).toBe(true)
    expect(result.hasErrors).toBe(false)
  })

  it('should succeed validation by default (no exceptionHandling set) when rule throws', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            throw new Error('Unexpected error')
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await validator.fields.name!.validate()
    consoleSpy.mockRestore()

    expect(result.success).toBe(true)
  })
})
