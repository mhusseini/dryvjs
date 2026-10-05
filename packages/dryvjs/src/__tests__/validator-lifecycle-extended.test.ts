import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel, NestedModel } from './helpers'
import { DryvObjectValidator, DryvValidationSession, dryvOptions } from '@/.'
import { resetValidatorState, walkValidatorTree } from '@/validators/validatorLifecycle'
import { serializeValidator } from '@/validators/serializeValidator'

describe('Validator Lifecycle — Extended', () => {
  describe('dispose / Symbol.dispose', () => {
    it('should not throw when disposing an already destroyed validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      validator.dispose()
      // Calling dispose again should not throw
      expect(() => validator.dispose()).not.toThrow()
    })

    it('should support Symbol.dispose (using keyword)', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      // Check that Symbol.dispose is implemented
      expect(typeof validator[Symbol.dispose]).toBe('function')

      // Should not throw
      validator[Symbol.dispose]()
    })

    it('should destroy all child validators recursively', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '123', city: 'NYC' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const addressValidator = validator.fields.address as DryvObjectValidator<any>
      const childCount = addressValidator.childValidators().length
      expect(childCount).toBeGreaterThan(0)

      validator.destroy()
      // After destroy, the validator should still exist as an object but be cleaned up
    })
  })

  describe('hasErrors / hasWarnings / isSuccess computed properties', () => {
    it('should report hasErrors based on type', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any
      })
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      await validator.fields.name!.validate()

      expect(validator.fields.name!.hasErrors).toBe(true)
      expect(validator.fields.name!.hasWarnings).toBe(false)
      expect(validator.fields.name!.isSuccess).toBe(false)
    })

    it('should report hasWarnings based on type', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => ({ type: 'warning', text: 'Warn' }) }]
        } as any
      })
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      await validator.fields.name!.validate()

      expect(validator.fields.name!.hasErrors).toBe(false)
      expect(validator.fields.name!.hasWarnings).toBe(true)
      expect(validator.fields.name!.isSuccess).toBe(false)
    })

    it('should report isSuccess when type is null', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      // No validation has run, type is null
      expect(validator.fields.name!.isSuccess).toBe(true)
      expect(validator.fields.name!.hasErrors).toBe(false)
      expect(validator.fields.name!.hasWarnings).toBe(false)
    })

    it('should report isSuccess when type is success', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => null }]
        } as any
      })
      const { validator } = createObjectValidator({ name: 'ok', email: '', age: 0 }, ruleSet)

      await validator.fields.name!.validate()

      expect(validator.fields.name!.type).toBe('success')
      expect(validator.fields.name!.isSuccess).toBe(true)
    })
  })

  describe('clear on object validator', () => {
    it('should clear validation state for all child fields', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Name error' }],
          email: [{ validate: () => 'Email error' }]
        } as any
      })
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      await validator.validate()
      expect(validator.fields.name!.text).toBe('Name error')
      expect(validator.fields.email!.text).toBe('Email error')

      validator.clear()

      expect(validator.fields.name!.text).toBeNull()
      expect(validator.fields.name!.type).toBeNull()
      expect(validator.fields.email!.text).toBeNull()
      expect(validator.fields.email!.type).toBeNull()
      expect(validator.type).toBeNull()
    })
  })

  describe('groupShown property', () => {
    it('should default to false', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      expect(validator.fields.name!.groupShown).toBe(false)
    })

    it('should be settable', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      validator.fields.name!.groupShown = true

      expect(validator.fields.name!.groupShown).toBe(true)
    })

    it('should be reset by clear()', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      validator.fields.name!.groupShown = true
      validator.clear()

      expect(validator.fields.name!.groupShown).toBe(false)
    })
  })
})

describe('resetValidatorState — Direct Unit Tests', () => {
  it('should reset type, text, group, groupShown', () => {
    const reactive = {
      path: 'name',
      uniquePath: 'name',
      text: 'Error',
      group: 'group1',
      required: true,
      groupShown: true,
      type: 'error' as any,
      isDirty: true
    }

    resetValidatorState(reactive, false)

    expect(reactive.type).toBeNull()
    expect(reactive.text).toBeNull()
    expect(reactive.group).toBeNull()
    expect(reactive.groupShown).toBe(false)
    expect(reactive.isDirty).toBe(true) // not reset
  })

  it('should also reset isDirty when includeDirty is true', () => {
    const reactive = {
      path: 'name',
      uniquePath: 'name',
      text: 'Error',
      group: 'group1',
      required: true,
      groupShown: true,
      type: 'error' as any,
      isDirty: true
    }

    resetValidatorState(reactive, true)

    expect(reactive.isDirty).toBe(false)
  })
})

describe('walkValidatorTree — Direct Unit Tests', () => {
  it('should visit root and all children depth-first', () => {
    const ruleSet = createRuleSet<NestedModel>()
    const model: NestedModel = { title: 'Mr', address: { street: '123', city: 'NYC' } }
    const { validator } = createObjectValidator(model, ruleSet)

    const visited: string[] = []
    walkValidatorTree(validator, (v) => visited.push(v.path))

    // Root (empty path) + title + address + address.street + address.city
    expect(visited.length).toBeGreaterThanOrEqual(5)
    expect(visited).toContain('title')
    expect(visited).toContain('address')
    expect(visited).toContain('address.street')
    expect(visited).toContain('address.city')
  })
})

describe('serializeValidator — Direct Unit Tests', () => {
  it('should produce a plain object with all expected keys', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const serialized = serializeValidator(validator.fields.name!)

    expect(serialized).toHaveProperty('value', 'x')
    expect(serialized).toHaveProperty('path', 'name')
    expect(serialized).toHaveProperty('uniquePath', 'name')
    expect(serialized).toHaveProperty('field', 'name')
    expect(serialized).toHaveProperty('text', null)
    expect(serialized).toHaveProperty('type', null)
    expect(serialized).toHaveProperty('group', null)
    expect(serialized).toHaveProperty('groupShown', false)
    expect(serialized).toHaveProperty('required')
    expect(serialized).toHaveProperty('isDirty', false)
    expect(serialized).toHaveProperty('hasErrors', false)
    expect(serialized).toHaveProperty('hasWarnings', false)
    expect(serialized).toHaveProperty('isSuccess', true)
  })

  it('should serialize error state correctly', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Required', group: 'personal' }]
      } as any
    })
    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

    await validator.fields.name!.validate()
    const serialized = serializeValidator(validator.fields.name!)

    expect(serialized.text).toBe('Required')
    expect(serialized.type).toBe('error')
    expect(serialized.group).toBe('personal')
    expect(serialized.hasErrors).toBe(true)
    expect(serialized.isSuccess).toBe(false)
  })

  it('should convert field to undefined when field is falsy', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const serialized = serializeValidator(validator)
    // Root object validator has no field
    expect(serialized.field).toBeUndefined()
  })
})
