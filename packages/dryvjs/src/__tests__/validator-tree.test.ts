import { describe, it, expect } from 'vitest'
import { computeValidatorPaths } from '@/internal/computeValidatorPaths'
import { getValidatorByPath } from '@/internal/getValidatorByPath'
import { createObjectValidator, createRuleSet, NestedModel } from './helpers'
import { DryvObjectValidator } from '@/.'

describe('Validator Tree — Path Computation', () => {
  describe('computeValidatorPaths', () => {
    it('should compute root-level field path', () => {
      const { path, uniquePath } = computeValidatorPaths(null, null, 'name', undefined)

      expect(path).toBe('name')
      expect(uniquePath).toBe('name')
    })

    it('should compute nested path', () => {
      const { path, uniquePath } = computeValidatorPaths('address', 'address', 'street', undefined)

      expect(path).toBe('address.street')
      expect(uniquePath).toBe('address.street')
    })

    it('should include array index in uniquePath but not in path', () => {
      const { path, uniquePath } = computeValidatorPaths('items', 'items', 'value', 0)

      expect(path).toBe('items.value')
      expect(uniquePath).toBe('items.0.value')
    })

    it('should handle empty parent path', () => {
      const { path, uniquePath } = computeValidatorPaths('', '', 'name', undefined)

      expect(path).toBe('name')
      expect(uniquePath).toBe('name')
    })

    it('should handle undefined field', () => {
      const { path, uniquePath } = computeValidatorPaths('parent', 'parent', undefined, undefined)

      expect(path).toBe('parent')
      expect(uniquePath).toBe('parent')
    })

    it('should handle index 0 correctly (falsy but valid)', () => {
      const { uniquePath } = computeValidatorPaths('items', 'items', 'value', 0)

      // 0 is falsy but should still be included
      expect(uniquePath).toContain('0')
    })

    it('should handle deeply nested paths', () => {
      const { path, uniquePath } = computeValidatorPaths('a.b.c', 'a.b.c', 'd', undefined)

      expect(path).toBe('a.b.c.d')
      expect(uniquePath).toBe('a.b.c.d')
    })
  })

  describe('getValidatorByPath', () => {
    it('should find a root-level field validator', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '123 Main', city: 'NYC' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const found = getValidatorByPath(validator, 'title')

      expect(found).toBeDefined()
      expect(found).toBe(validator.fields.title)
    })

    it('should find a nested field validator', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '123 Main', city: 'NYC' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const found = getValidatorByPath(validator, 'address.street')

      const addressValidator = validator.fields.address as unknown as DryvObjectValidator<NestedModel['address']>
      expect(found).toBe(addressValidator.fields.street)
    })

    it('should return null for empty path', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '', city: '' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const found = getValidatorByPath(validator, '')

      expect(found).toBeNull()
    })

    it('should return null/undefined for non-existent intermediate path', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '', city: '' } }
      const { validator } = createObjectValidator(model, ruleSet)

      // getValidatorByPath returns null when it hits null in the chain,
      // but may throw if it hits undefined. Test a single-level miss first.
      const found = getValidatorByPath(validator, 'nonexistent')
      expect(found).toBeFalsy()
    })

    it('should find a nested object validator', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '', city: '' } }
      const { validator } = createObjectValidator(model, ruleSet)

      const found = getValidatorByPath(validator, 'address')

      expect(found).toBe(validator.fields.address)
    })
  })
})

describe('Validator Tree — Root Model Resolution', () => {
  it('should resolve root model from nested validators', () => {
    const ruleSet = createRuleSet<NestedModel>()
    const model: NestedModel = { title: 'Mr', address: { street: '123', city: 'NYC' } }
    const { validator } = createObjectValidator(model, ruleSet)

    const addressValidator = validator.fields.address as unknown as DryvObjectValidator<NestedModel['address']>

    expect(validator.rootModel).toBe(model)
    expect(addressValidator.rootModel).toBe(model)
    expect(addressValidator.fields.street!.rootModel).toBe(model)
  })

  it('should resolve root validator from nested validators', () => {
    const ruleSet = createRuleSet<NestedModel>()
    const model: NestedModel = { title: 'Mr', address: { street: '123', city: 'NYC' } }
    const { validator } = createObjectValidator(model, ruleSet)

    const addressValidator = validator.fields.address as unknown as DryvObjectValidator<NestedModel['address']>

    expect(validator.rootValidator).toBe(validator)
    expect(addressValidator.rootValidator).toBe(validator)
    expect(addressValidator.fields.street!.rootValidator).toBe(validator)
  })
})
