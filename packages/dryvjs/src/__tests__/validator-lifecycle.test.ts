import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'
import { DryvObjectValidator } from '@/.'

describe('Validator Lifecycle', () => {
  describe('destroy', () => {
    it('should destroy child validators on destroy', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      // Should not throw
      validator.destroy()
    })
  })

  describe('value replacement', () => {
    it('should update model when value is set to a new object', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'old', email: 'old@t.com', age: 1 }, ruleSet)

      validator.value = { name: 'new', email: 'new@t.com', age: 2 }

      expect(validator.value.name).toBe('new')
      expect(validator.value.email).toBe('new@t.com')
      expect(validator.value.age).toBe(2)
    })

    it('should re-create field validators when model is replaced', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'Old', email: 'old@t.com', age: 1 }, ruleSet)

      const oldNameValidator = validator.fields.name

      // Replace the model
      validator.value = { name: 'New', email: 'new@t.com', age: 2 }

      // New field validators should be created
      expect(validator.fields.name).not.toBe(oldNameValidator)
      expect(validator.fields.name!.value).toBe('New')
      expect(validator.fields.email!.value).toBe('new@t.com')
    })
  })

  describe('toJSON', () => {
    it('should serialize validator state without circular references', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const json = JSON.stringify(validator)
      const parsed = JSON.parse(json)

      expect(parsed.path).toBeDefined()
      expect(parsed.hasErrors).toBe(false)
      expect(parsed.isSuccess).toBe(true)
    })

    it('should include value in JSON output', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

      const json = JSON.stringify(validator.fields.name!)
      const parsed = JSON.parse(json)

      expect(parsed.value).toBe('x')
    })
  })

  describe('nested objects', () => {
    interface Deep {
      level1: {
        level2: {
          value: string
        }
      }
    }

    it('should create deeply nested validators with correct paths', () => {
      const ruleSet = createRuleSet<Deep>()
      const model: Deep = { level1: { level2: { value: 'deep' } } }
      const { validator } = createObjectValidator(model, ruleSet)

      const l1 = validator.fields.level1 as unknown as DryvObjectValidator<Deep['level1']>
      expect(l1).toBeDefined()
      expect(l1.path).toBe('level1')

      const l2 = l1.fields.level2 as unknown as DryvObjectValidator<Deep['level1']['level2']>
      expect(l2).toBeDefined()
      expect(l2.path).toBe('level1.level2')

      expect(l2.fields.value!.path).toBe('level1.level2.value')
    })

    it('should validate deeply nested fields', async () => {
      interface Deep {
        level1: {
          level2: {
            value: string
          }
        }
      }

      const ruleSet = createRuleSet<Deep>({
        validators: {
          'level1.level2.value': [{ validate: ($m: any) => (!$m.value ? 'Deep required' : null) }]
        } as any
      })

      const model: Deep = { level1: { level2: { value: '' } } }
      const { validator } = createObjectValidator(model, ruleSet)

      const result = await validator.validate()

      const l1 = validator.fields.level1 as unknown as DryvObjectValidator<Deep['level1']>
      const l2 = l1.fields.level2 as unknown as DryvObjectValidator<Deep['level1']['level2']>

      expect(l2.fields.value!.text).toBe('Deep required')
      expect(result.hasErrors).toBe(true)
    })
  })
})
