import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel, NestedModel } from './helpers'
import { getDryvValidator, DryvObjectValidator, DryvArrayValidator } from '@/.'

describe('Object Facade Proxy (Layer 2)', () => {
  describe('__dryvValidator passthrough', () => {
    it('should pass through __dryvValidator from underlying validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      // The _-prefix passthrough delegates to Reflect.get on the validator
      const facade = validator.facadeProxy as any
      expect(facade.__dryvValidator).toBe(true)
    })

    it('should make getDryvValidator recognize the facade as a validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      const resolved = getDryvValidator(facade)
      // getDryvValidator returns the facade itself (not the underlying validator)
      // because __dryvValidator is truthy on the facade via passthrough
      expect(resolved).toBeDefined()
      expect((resolved as any).__dryvValidator).toBe(true)
    })
  })

  describe('property access through facade', () => {
    it('should return field validators for scalar fields', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      const nameField = facade.name

      // For field validators, resolveFacade returns the validator itself
      expect(nameField).toBeDefined()
      expect(nameField).toBe(validator.fields.name)
    })

    it('should return nested object facade for object fields', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '123', city: 'NYC' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const facade = validator.facadeProxy as any
      const addressFacade = facade.address

      // For composite validators, resolveFacade returns facadeProxy
      const addressValidator = validator.fields.address as DryvObjectValidator<any>
      expect(addressFacade).toBe(addressValidator.facadeProxy)
    })
  })

  describe('property setting through facade', () => {
    it('should set value on the underlying field validator', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'old', email: 'e', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      facade.name = 'new'

      expect(validator.fields.name!.value).toBe('new')
    })
  })

  describe('_ and $ prefixed properties pass through to validator', () => {
    it('should access __dryvValidator on the validator object', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      expect(facade.__dryvValidator).toBe(true)
    })
  })

  describe('has trap', () => {
    it('should return true for existing fields', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      expect('name' in facade).toBe(true)
      expect('email' in facade).toBe(true)
    })

    it('should return false for non-existing fields', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      expect('nonexistent' in facade).toBe(false)
    })
  })

  describe('ownKeys', () => {
    it('should return the keys of the proxy model', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const facade = validator.facadeProxy as any
      const keys = Object.keys(facade)

      expect(keys).toContain('name')
      expect(keys).toContain('email')
      expect(keys).toContain('age')
    })
  })
})

describe('Array Facade Proxy (Layer 2)', () => {
  interface ItemModel { value: string }
  interface ParentModel { items: ItemModel[] }

  function createArraySetup() {
    const ruleSet = createRuleSet<ParentModel>()
    const { validator } = createObjectValidator<ParentModel>(
      { items: [{ value: 'a' }, { value: 'b' }] },
      ruleSet
    )
    const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>
    return { validator, arrValidator }
  }

  describe('$validator access', () => {
    it('should expose the underlying array validator via $validator', () => {
      const { arrValidator } = createArraySetup()

      const facade = arrValidator.facadeProxy as any
      expect(facade.$validator).toBe(arrValidator)
    })
  })

  describe('index access', () => {
    it('should return child validator facade for numeric indices', () => {
      const { arrValidator } = createArraySetup()

      const facade = arrValidator.facadeProxy as any
      const first = facade[0]

      expect(first).toBeDefined()
    })
  })

  describe('array methods forwarding', () => {
    it('should forward push to the observable proxy', () => {
      const { arrValidator } = createArraySetup()

      const facade = arrValidator.facadeProxy as any
      facade.push({ value: 'c' })

      expect(arrValidator.childValidators().length).toBe(3)
    })
  })

  describe('value assignment through facade', () => {
    it('should replace the array contents when setting .value', () => {
      const { validator, arrValidator } = createArraySetup()

      const facade = arrValidator.facadeProxy as any
      facade.value = [{ value: 'x' }, { value: 'y' }, { value: 'z' }]

      expect(arrValidator.value).toHaveLength(3)
      expect(arrValidator.childValidators()).toHaveLength(3)
      expect(arrValidator.value[0]).toEqual({ value: 'x' })
      expect(arrValidator.value[1]).toEqual({ value: 'y' })
      expect(arrValidator.value[2]).toEqual({ value: 'z' })
    })

    it('should update the parent model when setting .value', () => {
      const { validator, arrValidator } = createArraySetup()

      const facade = arrValidator.facadeProxy as any
      facade.value = [{ value: 'replaced' }]

      // The parent model's items array should reflect the change
      const parentModel = validator.value as ParentModel
      expect(parentModel.items).toHaveLength(1)
      expect(parentModel.items[0]).toEqual({ value: 'replaced' })
    })
  })
})
