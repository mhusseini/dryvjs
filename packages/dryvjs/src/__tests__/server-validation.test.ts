import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Server Validation', () => {
  it('should call server via session.callServer in validation rules', async () => {
    const callServer = vi.fn().mockResolvedValue({ success: true })

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        email: [{
          async: true,
          validate: async ($m: any, session: any) => {
            const result = await session.callServer('/api/validate-email', 'POST', { email: $m.email })
            return result.success ? null : 'Email already exists'
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'test@test.com', age: 0 }, ruleSet, {
      callServer
    })

    const result = await validator.fields.email!.validate()

    expect(callServer).toHaveBeenCalledWith('/api/validate-email', 'POST', { email: 'test@test.com' })
    expect(result.success).toBe(true)
  })

  it('should return error when server validation fails', async () => {
    const callServer = vi.fn().mockResolvedValue({ success: false })

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        email: [{
          async: true,
          validate: async ($m: any, session: any) => {
            const result = await session.callServer('/api/validate-email', 'POST', { email: $m.email })
            return result.success ? null : 'Email already exists'
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'taken@test.com', age: 0 }, ruleSet, {
      callServer,
      validationTrigger: 'auto'
    })

    const result = await validator.fields.email!.validate()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
    expect(validator.fields.email!.text).toBe('Email already exists')
  })

  it('should set validation result from server response via setValidationResult', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: '', email: '', age: 0 }, ruleSet)

    const serverResponse = {
      success: false,
      messages: {
        name: { type: 'error', text: 'Server: name required', group: null },
        email: { type: 'warning', text: 'Server: email suspicious', group: null }
      }
    }

    const isSuccess = validator.setValidationResult(serverResponse)

    expect(isSuccess).toBe(false)
    expect(validator.fields.name!.text).toBe('Server: name required')
    expect(validator.fields.name!.type).toBe('error')
    expect(validator.fields.email!.text).toBe('Server: email suspicious')
    expect(validator.fields.email!.type).toBe('warning')
  })

  it('should clear field state when server response has success type', () => {
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

    // Then clear it
    validator.setValidationResult({
      success: true,
      messages: {
        name: { type: 'success', text: null, group: null }
      }
    })
    expect(validator.fields.name!.text).toBeNull()
    expect(validator.fields.name!.type).toBeNull()
  })

  it('should use session parameters from rule set', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{
          validate: ($m: any, session: any) => {
            const minLength = session.parameter('minNameLength')
            return $m.name.length < minLength ? `Min ${minLength} chars` : null
          }
        }]
      } as any,
      parameters: { minNameLength: 3 } as any
    })

    const { validator } = createObjectValidator({ name: 'Jo', email: '', age: 0 }, ruleSet)
    const result = await validator.fields.name!.validate()

    expect(result.hasErrors).toBe(true)
    expect(validator.fields.name!.text).toBe('Min 3 chars')
  })
})
