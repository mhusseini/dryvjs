import { describe, it, expect } from 'vitest'
import { getDryvValidator, getDryvModel, DryvObjectValidator, DryvValidationSession, dryvOptions } from '@/.'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('getDryvValidator', () => {
  it('should return the validator from an object with __dryvValidator flag', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const result = getDryvValidator(validator)
    expect(result).toBe(validator)
  })

  it('should return undefined for plain objects', () => {
    const result = getDryvValidator({ name: 'test' })
    expect(result).toBeUndefined()
  })

  it('should return validator from object with $validator property', () => {
    // Objects that have a $validator property (e.g. manually constructed)
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const objWith$validator = { $validator: validator }
    const result = getDryvValidator(objWith$validator)
    expect(result).toBe(validator)
  })

  it('should return undefined for null/undefined', () => {
    expect(getDryvValidator(null)).toBeUndefined()
    expect(getDryvValidator(undefined)).toBeUndefined()
  })
})

describe('getDryvModel', () => {
  it('should return the model from a validator', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const model = { name: 'x', email: 'y', age: 1 }
    const { validator } = createObjectValidator(model, ruleSet)

    const result = getDryvModel(validator)
    expect(result).toBe(model)
  })

  it('should return the model from an object with $validator property', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const model = { name: 'x', email: 'y', age: 1 }
    const { validator } = createObjectValidator(model, ruleSet)

    const objWith$validator = { $validator: validator }
    const result = getDryvModel(objWith$validator)
    expect(result).toBe(model)
  })

  it('should return undefined for plain objects', () => {
    const result = getDryvModel({ name: 'test' })
    expect(result).toBeUndefined()
  })
})

describe('dryvRuleSet', () => {
  it('should return undefined when no resolvers are registered', async () => {
    const { dryvRuleSet } = await import('@/dryvRuleSet')
    const result = dryvRuleSet('nonexistent')
    expect(result).toBeUndefined()
  })
})
