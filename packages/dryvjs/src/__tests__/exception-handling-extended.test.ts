import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Exception Handling — Extended', () => {
  it('should log error to console when rule throws', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            throw new Error('Test error')
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await validator.fields.name!.validate()

    expect(consoleSpy).toHaveBeenCalled()
    const errorMessage = consoleSpy.mock.calls[0].join(' ')
    expect(errorMessage).toContain('name')
    consoleSpy.mockRestore()
  })

  it('should handle async rule that rejects', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          async: true,
          validate: async () => {
            throw new Error('Async rejection')
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
    expect(validator.fields.name!.text).toBe('Validation failed.')
  })

  it('should handle TypeError thrown by rule', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            const obj: any = null
            return obj.nonexistent.method() // TypeError
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
  })

  it('should continue validating other fields when one throws with succeedValidation', async () => {
    const emailRule = vi.fn().mockReturnValue('Email error')

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: () => {
            throw new Error('Boom')
          }
        }],
        email: [{ validate: emailRule }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
      exceptionHandling: 'succeedValidation'
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await validator.validate()
    consoleSpy.mockRestore()

    // Email should still be validated
    expect(emailRule).toHaveBeenCalled()
    expect(validator.fields.email!.text).toBe('Email error')
  })

  it('should stop rule chain at the throwing rule', async () => {
    const rule1 = vi.fn().mockReturnValue(null)
    const rule3 = vi.fn().mockReturnValue('Should not run')

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [
          { validate: rule1 },
          {
            validate: () => {
              throw new Error('Rule 2 throws')
            }
          },
          { validate: rule3 }
        ]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet, {
      exceptionHandling: 'failValidation'
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await validator.fields.name!.validate()
    consoleSpy.mockRestore()

    expect(rule1).toHaveBeenCalled()
    expect(rule3).not.toHaveBeenCalled()
  })
})
