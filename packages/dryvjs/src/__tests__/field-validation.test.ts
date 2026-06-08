import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Field Validation', () => {
  it('should validate a field and return error when rule returns a string', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Name is required' }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    const result = await nameValidator.validate()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
    expect(nameValidator.text).toBe('Name is required')
    expect(nameValidator.type).toBe('error')
    expect(nameValidator.hasErrors).toBe(true)
  })

  it('should validate a field and return success when rule returns null', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    const result = await nameValidator.validate()

    expect(result.success).toBe(true)
    expect(result.hasErrors).toBe(false)
    expect(nameValidator.text).toBeNull()
    expect(nameValidator.type).toBe('success')
  })

  it('should validate a field and return success when rule returns true', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => true }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet)
    const result = await validator.fields.name!.validate()

    expect(result.success).toBe(true)
  })

  it('should validate a field and return warning when rule returns warning result', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => ({ type: 'warning', text: 'Name is short' }) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'Jo', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    const result = await nameValidator.validate()

    expect(result.success).toBe(false)
    expect(result.hasWarnings).toBe(true)
    expect(result.hasErrors).toBe(false)
    expect(nameValidator.text).toBe('Name is short')
    expect(nameValidator.type).toBe('warning')
    expect(nameValidator.hasWarnings).toBe(true)
    expect(nameValidator.hasErrors).toBe(false)
  })

  it('should run multiple rules in sequence and stop at first error', async () => {
    const rule1 = vi.fn().mockReturnValue(null)
    const rule2 = vi.fn().mockReturnValue('Error from rule 2')
    const rule3 = vi.fn().mockReturnValue('Error from rule 3')

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [
          { validate: rule1 },
          { validate: rule2 },
          { validate: rule3 }
        ]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    await nameValidator.validate()

    expect(rule1).toHaveBeenCalled()
    expect(rule2).toHaveBeenCalled()
    expect(rule3).not.toHaveBeenCalled()
    expect(nameValidator.text).toBe('Error from rule 2')
  })

  it('should pass the model to the validation rule', async () => {
    const rule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: rule }]
      } as any
    })

    const model = { name: 'John', email: 'john@test.com', age: 25 }
    const { validator } = createObjectValidator(model, ruleSet)

    await validator.fields.name!.validate()

    expect(rule).toHaveBeenCalledWith(expect.objectContaining({ name: 'John', email: 'john@test.com', age: 25 }), expect.anything())
  })

  it('should clear field validation state on clear()', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    await nameValidator.validate()
    expect(nameValidator.text).toBe('Error')

    nameValidator.clear()
    expect(nameValidator.text).toBeNull()
    expect(nameValidator.type).toBeNull()
    expect(nameValidator.group).toBeNull()
  })

  it('should support async validation rules', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        email: [{
          async: true,
          validate: async () => {
            await new Promise((r) => setTimeout(r, 10))
            return 'Email is invalid'
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'bad', age: 0 }, ruleSet)
    const emailValidator = validator.fields.email!

    const result = await emailValidator.validate()

    expect(result.hasErrors).toBe(true)
    expect(emailValidator.text).toBe('Email is invalid')
  })

  it('should set group on validation result when rule has group', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Required', group: 'personal' }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const nameValidator = validator.fields.name!

    await nameValidator.validate()

    expect(nameValidator.group).toBe('personal')
  })

  it('should expose path correctly for fields', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    expect(validator.fields.name!.path).toBe('name')
    expect(validator.fields.email!.path).toBe('email')
    expect(validator.fields.age!.path).toBe('age')
  })

  it('should mark field as required when rule has required annotation', () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null, annotations: { required: true } }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

    expect(validator.fields.name!.required).toBe(true)
    expect(validator.fields.email!.required).toBe(false)
  })
})
