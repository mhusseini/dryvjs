import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet } from './helpers'
import { DryvObjectValidator, DryvArrayValidator } from '@/.'
import { DryvFieldValidator } from '@/validators/DryvFieldValidator'

describe('createChildValidator — Type Dispatching', () => {
  it('should create DryvFieldValidator for string fields', () => {
    interface Model { name: string }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ name: 'hello' }, ruleSet)

    expect(validator.fields.name).toBeInstanceOf(DryvFieldValidator)
  })

  it('should create DryvFieldValidator for number fields', () => {
    interface Model { count: number }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ count: 42 }, ruleSet)

    expect(validator.fields.count).toBeInstanceOf(DryvFieldValidator)
  })

  it('should create DryvFieldValidator for boolean fields', () => {
    interface Model { active: boolean }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ active: true }, ruleSet)

    expect(validator.fields.active).toBeInstanceOf(DryvFieldValidator)
  })

  it('should create DryvObjectValidator for object fields', () => {
    interface Model { nested: { value: string } }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ nested: { value: 'x' } }, ruleSet)

    expect(validator.fields.nested).toBeInstanceOf(DryvObjectValidator)
  })

  it('should create DryvArrayValidator for array fields', () => {
    interface Model { items: string[] }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ items: ['a', 'b'] }, ruleSet)

    expect(validator.fields.items).toBeInstanceOf(DryvArrayValidator)
  })

  it('should return null for function fields', () => {
    interface Model { fn: () => void; name: string }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ fn: () => {}, name: 'test' }, ruleSet)

    expect(validator.fields.fn).toBeNull()
  })

  it('should create DryvFieldValidator for special types (ArrayBuffer)', () => {
    interface Model { buf: ArrayBuffer }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ buf: new ArrayBuffer(8) }, ruleSet)

    expect(validator.fields.buf).toBeInstanceOf(DryvFieldValidator)
  })

  it('should create DryvFieldValidator for special types (Error)', () => {
    interface Model { err: Error }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ err: new Error('test') }, ruleSet)

    expect(validator.fields.err).toBeInstanceOf(DryvFieldValidator)
  })

  it('should set required annotation from rules', () => {
    interface Model { name: string; email: string }
    const ruleSet = createRuleSet<Model>({
      validators: {
        name: [{ validate: () => null, annotations: { required: true } }],
        email: [{ validate: () => null }]
      } as any
    })
    const { validator } = createObjectValidator<Model>({ name: '', email: '' }, ruleSet)

    expect(validator.fields.name!.required).toBe(true)
    expect(validator.fields.email!.required).toBe(false)
  })

  it('should not set required when no rules exist for the field', () => {
    interface Model { name: string }
    const ruleSet = createRuleSet<Model>()
    const { validator } = createObjectValidator<Model>({ name: '' }, ruleSet)

    expect(validator.fields.name!.required).toBe(false)
  })
})
