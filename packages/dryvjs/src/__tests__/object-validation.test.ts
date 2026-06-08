import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel, NestedModel } from './helpers'
import { DryvObjectValidator, DryvValidationSession } from '@/.'

describe('Object Validation', () => {
  it('should validate all fields of an object and return combined result', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Name required' }],
        email: [{ validate: () => 'Email required' }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const result = await validator.validate()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
    expect(result.results.length).toBeGreaterThanOrEqual(2)
  })

  it('should return success when all fields pass validation', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }],
        email: [{ validate: () => null }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)
    const result = await validator.validate()

    expect(result.success).toBe(true)
    expect(result.hasErrors).toBe(false)
    expect(result.hasWarnings).toBe(false)
  })

  it('should report hasWarnings when a field has a warning', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => ({ type: 'warning', text: 'Name too short' }) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'Jo', email: '', age: 0 }, ruleSet)
    const result = await validator.validate()

    expect(result.success).toBe(false)
    expect(result.hasWarnings).toBe(true)
    expect(result.hasErrors).toBe(false)
  })

  it('should report hasNewWarnings on first warning occurrence', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => ({ type: 'warning', text: 'Warning text' }) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'Jo', email: '', age: 0 }, ruleSet)

    const result1 = await validator.validate()
    expect(result1.hasNewWarnings).toBe(true)

    const result2 = await validator.validate()
    expect(result2.hasNewWarnings).toBe(false)
  })

  it('should validate nested objects', async () => {
    const ruleSet = createRuleSet<NestedModel>({
      validators: {
        'address.street': [{ validate: () => 'Street required' }]
      } as any
    })

    const model: NestedModel = { title: 'Mr', address: { street: '', city: 'NYC' } }
    const { validator } = createObjectValidator(model, ruleSet)
    const result = await validator.validate()

    const addressValidator = validator.fields.address as unknown as DryvObjectValidator<NestedModel['address']>
    const streetValidator = addressValidator.fields.street!

    expect(streetValidator.path).toBe('address.street')
    expect(streetValidator.text).toBe('Street required')
    expect(result.hasErrors).toBe(true)
  })

  it('should set type on object validator after validation', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    await validator.validate()

    expect(validator.type).toBe('error')
  })

  it('should set type to success when no errors or warnings', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet)
    await validator.validate()

    expect(validator.type).toBe('success')
  })

  it('should expose child validators', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const children = validator.childValidators()
    expect(children.length).toBe(3)
  })

  it('should provide access to the model via value', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const model = { name: 'x', email: 'y', age: 1 }
    const { validator } = createObjectValidator(model, ruleSet)

    expect(validator.value.name).toBe('x')
    expect(validator.value.email).toBe('y')
    expect(validator.value.age).toBe(1)
  })

  it('should track session results for fields', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Required' }],
        email: [{ validate: () => null }]
      } as any
    })

    const { validator, session } = createObjectValidator({ name: '', email: 'x@x.com', age: 0 }, ruleSet)
    await validator.validate()

    expect(session.results.fields['name']).toBeDefined()
    expect(session.results.fields['name']!.text).toBe('Required')
    expect(session.results.fields['email']).toBeUndefined()
  })

  it('should track session results for groups', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Required', group: 'personal' }]
      } as any
    })

    const { validator, session } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    await validator.validate()

    expect(session.results.groups['personal']).toBeDefined()
    expect(session.results.groups['personal']!.text).toBe('Required')
  })
})
