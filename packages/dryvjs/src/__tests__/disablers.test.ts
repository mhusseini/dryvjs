import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Disablers', () => {
  it('should skip field validation when disabler returns truthy', async () => {
    const validator = vi.fn().mockReturnValue('Error')

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: validator }]
      } as any,
      disablers: {
        name: [{ validate: () => true }]
      } as any
    })

    const { validator: objValidator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const nameValidator = objValidator.fields.name!

    const result = await nameValidator.validate()

    expect(result.success).toBe(true)
    expect(validator).not.toHaveBeenCalled()
    expect(nameValidator.text).toBeNull()
  })

  it('should run validation when disabler returns falsy', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any,
      disablers: {
        name: [{ validate: () => false }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const result = await validator.fields.name!.validate()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
  })

  it('should skip entire object validation when object-level disabler returns truthy', async () => {
    const validator = vi.fn().mockReturnValue('Error')

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: validator }]
      } as any,
      disablers: {
        '': [{ validate: () => true }]
      } as any
    })

    const { validator: objValidator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const result = await objValidator.validate()

    expect(result.success).toBe(true)
    expect(validator).not.toHaveBeenCalled()
  })

  it('should pass model to disabler function', async () => {
    const disabler = vi.fn().mockReturnValue(false)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any,
      disablers: {
        name: [{ validate: disabler }]
      } as any
    })

    const model = { name: '', email: 'test@test.com', age: 30 }
    const { validator } = createObjectValidator(model, ruleSet)
    await validator.fields.name!.validate()

    expect(disabler).toHaveBeenCalledWith(expect.objectContaining({ name: '', email: 'test@test.com', age: 30 }), expect.anything())
  })

  it('should support multiple disablers (first truthy wins)', async () => {
    const disabler1 = vi.fn().mockReturnValue(false)
    const disabler2 = vi.fn().mockReturnValue(true)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any,
      disablers: {
        name: [{ validate: disabler1 }, { validate: disabler2 }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
    const result = await validator.fields.name!.validate()

    expect(result.success).toBe(true)
    expect(disabler1).toHaveBeenCalled()
    expect(disabler2).toHaveBeenCalled()
  })
})
