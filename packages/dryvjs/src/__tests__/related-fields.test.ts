import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Related Fields', () => {
  it('should trigger validation of related fields', async () => {
    const emailRule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null, related: ['email'] }],
        email: [{ validate: emailRule }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet, {
      validationTrigger: 'auto'
    })

    await validator.fields.name!.validate()

    expect(emailRule).toHaveBeenCalled()
  })

  it('should not trigger validation of the same field as related', async () => {
    const nameRule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: nameRule, related: ['name'] }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet, {
      validationTrigger: 'auto'
    })

    await validator.fields.name!.validate()

    // Should only be called once (for the field itself, not as related)
    expect(nameRule).toHaveBeenCalledTimes(1)
  })

  it('should propagate errors from related fields to session results', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null, related: ['email'] }],
        email: [{ validate: () => 'Email is required' }]
      } as any
    })

    const { validator, session } = createObjectValidator({ name: 'John', email: '', age: 25 }, ruleSet, {
      validationTrigger: 'auto'
    })

    await validator.fields.name!.validate()

    expect(session.results.fields['email']).toBeDefined()
    expect(session.results.fields['email']!.text).toBe('Email is required')
  })
})
