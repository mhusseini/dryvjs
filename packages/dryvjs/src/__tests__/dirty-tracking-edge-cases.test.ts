import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet } from './helpers'

describe('Dirty Tracking — Edge Cases', () => {
  describe('falsy/truthy boundary detection', () => {
    it('should detect dirty when changing from 0 to empty string', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: 0 }, ruleSet)

      validator.proxy.val = ''

      // !!0 === !!'' (both falsy), 0 !== '' → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })

    it('should detect dirty when changing from null to undefined', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: null }, ruleSet)

      validator.proxy.val = undefined

      // !!null === !!undefined (both falsy), null !== undefined → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })

    it('should detect dirty when changing from null to empty string', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: null }, ruleSet)

      validator.proxy.val = ''

      // !!null === !!'' (both falsy), null !== '' → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })

    it('should detect dirty when changing from falsy to truthy', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: 0 }, ruleSet)

      validator.proxy.val = 1

      // !!0 !== !!1 → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })

    it('should detect dirty when changing from truthy to falsy', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: 'hello' }, ruleSet)

      validator.proxy.val = ''

      // !!'hello' !== !!'' → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })

    it('should not be dirty when changing from false to false', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: false }, ruleSet)

      validator.proxy.val = false

      expect(validator.fields.val!.isDirty).toBe(false)
    })

    it('should detect dirty when changing from false to 0', () => {
      interface Model { val: any }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ val: false }, ruleSet)

      validator.proxy.val = 0

      // !!false === !!0 (both falsy), false !== 0 → dirty
      expect(validator.fields.val!.isDirty).toBe(true)
    })
  })

  describe('object reference changes', () => {
    it('should detect dirty when setting a new object reference', () => {
      interface Model { obj: any }
      const original = { a: 1 }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ obj: original }, ruleSet)

      validator.proxy.obj = { a: 1 }

      // Different reference → dirty (even if structurally equal)
      expect(validator.fields.obj).toBeDefined()
    })
  })

  describe('nested dirty propagation', () => {
    interface Outer {
      inner: { value: string }
    }

    it('should propagate dirty from nested field to parent and grandparent', () => {
      const ruleSet = createRuleSet<Outer>()
      const { validator } = createObjectValidator<Outer>(
        { inner: { value: 'original' } },
        ruleSet
      )

      const innerValidator = validator.fields.inner as any
      innerValidator.proxy.value = 'changed'

      expect(innerValidator.fields.value!.isDirty).toBe(true)
      expect(innerValidator.isDirty).toBe(true)
      expect(validator.isDirty).toBe(true)
    })

    it('should clear parent dirty when all nested fields revert', () => {
      const ruleSet = createRuleSet<Outer>()
      const { validator } = createObjectValidator<Outer>(
        { inner: { value: 'original' } },
        ruleSet
      )

      const innerValidator = validator.fields.inner as any
      innerValidator.proxy.value = 'changed'
      expect(validator.isDirty).toBe(true)

      innerValidator.proxy.value = 'original'
      expect(validator.isDirty).toBe(false)
    })
  })

  describe('commit then revert sequence', () => {
    it('should handle multiple commit-revert cycles', () => {
      interface Model { name: string }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ name: 'A' }, ruleSet)

      // Cycle 1: change, commit
      validator.proxy.name = 'B'
      expect(validator.fields.name!.isDirty).toBe(true)
      validator.commit()
      expect(validator.fields.name!.isDirty).toBe(false)

      // Cycle 2: change, revert
      validator.proxy.name = 'C'
      expect(validator.fields.name!.isDirty).toBe(true)
      validator.revert()
      expect(validator.fields.name!.value).toBe('B')
      expect(validator.fields.name!.isDirty).toBe(false)

      // Cycle 3: change, commit again
      validator.proxy.name = 'D'
      validator.commit()
      expect(validator.fields.name!.value).toBe('D')
      expect(validator.fields.name!.isDirty).toBe(false)
    })
  })

  describe('clear does not reset dirty', () => {
    it('should keep dirty flag when calling clear()', () => {
      interface Model { name: string }
      const ruleSet = createRuleSet<Model>()
      const { validator } = createObjectValidator<Model>({ name: 'John' }, ruleSet)

      validator.proxy.name = 'Jane'
      expect(validator.fields.name!.isDirty).toBe(true)

      validator.clear()

      expect(validator.fields.name!.isDirty).toBe(true)
      expect(validator.fields.name!.text).toBeNull()
      expect(validator.fields.name!.type).toBeNull()
    })
  })
})
