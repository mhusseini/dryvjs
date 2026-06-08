import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Dirty Tracking', () => {
  it('should not be dirty initially', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

    expect(validator.fields.name!.isDirty).toBe(false)
    expect(validator.isDirty).toBe(false)
  })

  it('should mark field as dirty when value changes via proxy', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

    validator.proxy.name = 'Jane'

    expect(validator.fields.name!.isDirty).toBe(true)
  })

  it('should propagate dirty state to parent', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

    validator.proxy.name = 'Jane'

    expect(validator.isDirty).toBe(true)
  })

  it('should not be dirty when value is set back to initial value', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

    validator.proxy.name = 'Jane'
    expect(validator.fields.name!.isDirty).toBe(true)

    validator.proxy.name = 'John'
    expect(validator.fields.name!.isDirty).toBe(false)
  })

  describe('revert', () => {
    it('should revert field value to initial value', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

      validator.proxy.name = 'Jane'
      validator.fields.name!.revert()

      expect(validator.fields.name!.value).toBe('John')
      expect(validator.fields.name!.isDirty).toBe(false)
    })

    it('should clear validation state on revert', async () => {
      const ruleSet = createRuleSet<SimpleModel>({
        validators: {
          name: [{ validate: () => 'Error' }]
        } as any
      })

      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)
      await validator.fields.name!.validate()
      expect(validator.fields.name!.text).toBe('Error')

      validator.fields.name!.revert()
      expect(validator.fields.name!.text).toBeNull()
      expect(validator.fields.name!.type).toBeNull()
    })

    it('should revert all fields when called on object validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

      validator.proxy.name = 'Jane'
      validator.proxy.email = 'new@t.com'

      validator.revert()

      expect(validator.fields.name!.value).toBe('John')
      expect(validator.fields.email!.value).toBe('j@t.com')
      expect(validator.isDirty).toBe(false)
    })
  })

  describe('commit', () => {
    it('should update the initial value so field is no longer dirty', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

      validator.proxy.name = 'Jane'
      expect(validator.fields.name!.isDirty).toBe(true)

      validator.fields.name!.commit()
      expect(validator.fields.name!.isDirty).toBe(false)
    })

    it('should make revert restore to the committed value', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

      validator.proxy.name = 'Jane'
      validator.fields.name!.commit()

      validator.proxy.name = 'Bob'
      validator.fields.name!.revert()

      expect(validator.fields.name!.value).toBe('Jane')
    })

    it('should commit all fields when called on object validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'John', email: 'j@t.com', age: 25 }, ruleSet)

      validator.proxy.name = 'Jane'
      validator.proxy.email = 'new@t.com'

      validator.commit()

      validator.proxy.name = 'Bob'
      validator.revert()

      expect(validator.fields.name!.value).toBe('Jane')
      expect(validator.fields.email!.value).toBe('new@t.com')
    })
  })
})
