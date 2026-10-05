import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel, NestedModel } from './helpers'
import { DryvObjectValidator } from '@/.'

describe('Server Validation — Extended', () => {
  describe('flat error map (non-structured response)', () => {
    it('should apply errors from a flat error map', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      const flatResponse = {
        name: { type: 'error', text: 'Name required', group: null },
        email: { type: 'error', text: 'Email required', group: null }
      }

      const isSuccess = validator.setValidationResult(flatResponse)

      expect(isSuccess).toBe(false)
      expect(validator.fields.name!.text).toBe('Name required')
      expect(validator.fields.email!.text).toBe('Email required')
    })
  })

  describe('nested object server validation', () => {
    it('should apply errors to nested validators', () => {
      const ruleSet = createRuleSet<NestedModel>()
      const model: NestedModel = { title: 'Mr', address: { street: '', city: '' } }
      const { validator } = createObjectValidator(model, ruleSet)

      validator.setValidationResult({
        success: false,
        messages: {
          'address.street': { type: 'error', text: 'Street required', group: null },
          'address.city': { type: 'error', text: 'City required', group: null }
        }
      })

      const addressValidator = validator.fields.address as unknown as DryvObjectValidator<NestedModel['address']>
      expect(addressValidator.fields.street!.text).toBe('Street required')
      expect(addressValidator.fields.city!.text).toBe('City required')
    })
  })

  describe('mixed errors and warnings', () => {
    it('should handle errors on one field and warnings on another', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'Name required', group: null },
          email: { type: 'warning', text: 'Email looks suspicious', group: null }
        }
      })

      expect(validator.fields.name!.type).toBe('error')
      expect(validator.fields.name!.hasErrors).toBe(true)
      expect(validator.fields.email!.type).toBe('warning')
      expect(validator.fields.email!.hasWarnings).toBe(true)
    })
  })

  describe('empty and missing messages', () => {
    it('should clear all fields when response has no messages', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      // First set an error
      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'Error', group: null }
        }
      })
      expect(validator.fields.name!.text).toBe('Error')

      // Then apply a response with no matching messages
      validator.setValidationResult({
        success: true,
        messages: {}
      })

      // Fields not in the response should be cleared
      expect(validator.fields.name!.text).toBeNull()
      expect(validator.fields.name!.type).toBeNull()
    })

    it('should return true when structured response has success=true with empty messages', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: 'ok', email: 'ok', age: 1 }, ruleSet)

      const isSuccess = validator.setValidationResult({
        success: true,
        messages: {}
      })

      expect(isSuccess).toBe(true)
    })
  })

  describe('overwriting previous server results', () => {
    it('should replace previous error with a new one', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'First error', group: null }
        }
      })
      expect(validator.fields.name!.text).toBe('First error')

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'Second error', group: null }
        }
      })
      expect(validator.fields.name!.text).toBe('Second error')
    })

    it('should clear error and replace with warning', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'Error text', group: null }
        }
      })
      expect(validator.fields.name!.hasErrors).toBe(true)

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'warning', text: 'Warning text', group: null }
        }
      })
      expect(validator.fields.name!.hasErrors).toBe(false)
      expect(validator.fields.name!.hasWarnings).toBe(true)
      expect(validator.fields.name!.text).toBe('Warning text')
    })
  })

  describe('server response with group', () => {
    it('should set group from server response', () => {
      const ruleSet = createRuleSet<SimpleModel>()
      const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

      validator.setValidationResult({
        success: false,
        messages: {
          name: { type: 'error', text: 'Required', group: 'personal' }
        }
      })

      expect(validator.fields.name!.group).toBe('personal')
    })
  })
})
