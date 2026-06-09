import { describe, it, expect } from 'vitest'
import { serializeValidator } from '@/validators/serializeValidator'
import { computeValidatorPaths } from '@/internal/computeValidatorPaths'
import { createProxyLifecycle } from '@/internal/proxyLifecycle'
import { DryvObjectValidator } from '@/validators/DryvObjectValidator'
import { DryvArrayValidator } from '@/validators/DryvArrayValidator'
import { DryvValidator } from '@/validators/DryvValidator'
import { DryvCompositeValidator } from '@/validators/DryvCompositeValidator'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('serializeValidator (6.1 extraction)', () => {
  it('should produce the same output as the old toJSON', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const json = serializeValidator(validator)

    expect(json.path).toBe('')
    expect(json.isSuccess).toBe(true)
    expect(json.hasErrors).toBe(false)
    expect(json.hasWarnings).toBe(false)
    expect(json.isDirty).toBe(false)
  })

  it('should serialize field validators with value', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'hello', email: 'y', age: 1 }, ruleSet)

    const json = serializeValidator(validator.fields.name!)

    expect(json.value).toBe('hello')
    expect(json.path).toBe('name')
    expect(json.field).toBe('name')
  })

  it('should be usable via JSON.stringify through toJSON delegation', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { validator } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const parsed = JSON.parse(JSON.stringify(validator))

    expect(parsed.path).toBeDefined()
    expect(parsed.isSuccess).toBe(true)
  })
})

describe('computeValidatorPaths (6.1 hierarchy extraction)', () => {
  it('should compute path from parent path and field', () => {
    const result = computeValidatorPaths('parent', 'parent', 'child', undefined)
    expect(result.path).toBe('parent.child')
    expect(result.uniquePath).toBe('parent.child')
  })

  it('should compute root-level path when no parent path', () => {
    const result = computeValidatorPaths(null, null, 'name', undefined)
    expect(result.path).toBe('name')
    expect(result.uniquePath).toBe('name')
  })

  it('should include index in uniquePath', () => {
    const result = computeValidatorPaths('items', 'items', 'value', 3)
    expect(result.path).toBe('items.value')
    expect(result.uniquePath).toBe('items.3.value')
  })

  it('should handle index 0 correctly', () => {
    const result = computeValidatorPaths('items', 'items', undefined, 0)
    expect(result.uniquePath).toBe('items.0')
  })

  it('should produce empty path when no parent and no field', () => {
    const result = computeValidatorPaths(null, null, undefined, undefined)
    expect(result.path).toBe('')
    expect(result.uniquePath).toBe('')
  })
})

describe('createProxyLifecycle (6.4 extraction)', () => {
  it('should wrap a proxy factory result and allow registration', () => {
    const events: string[] = []
    const mockProxyResult = {
      proxy: { value: 42 },
      register: (handler: (e: string) => void) => {
        events.push('registered')
        return 1
      },
      unregister: (id: number) => {
        events.push(`unregistered:${id}`)
      }
    }

    const lifecycle = createProxyLifecycle(mockProxyResult)

    expect(lifecycle.proxy).toBe(mockProxyResult.proxy)
    lifecycle.register((e) => {})
    expect(events).toContain('registered')
  })

  it('should unregister on destroy', () => {
    const events: string[] = []
    const mockProxyResult = {
      proxy: {},
      register: (_handler: (e: string) => void) => {
        return 7
      },
      unregister: (id: number) => {
        events.push(`unregistered:${id}`)
      }
    }

    const lifecycle = createProxyLifecycle(mockProxyResult)
    lifecycle.register(() => {})
    lifecycle.destroy()

    expect(events).toContain('unregistered:7')
  })

  it('should unregister previous handler when re-registering', () => {
    const events: string[] = []
    let nextId = 0
    const mockProxyResult = {
      proxy: {},
      register: (_handler: (e: string) => void) => {
        return ++nextId
      },
      unregister: (id: number) => {
        events.push(`unregistered:${id}`)
      }
    }

    const lifecycle = createProxyLifecycle(mockProxyResult)
    lifecycle.register(() => {})
    lifecycle.register(() => {})

    expect(events).toContain('unregistered:1')
  })

  it('should be safe to call destroy multiple times', () => {
    const events: string[] = []
    const mockProxyResult = {
      proxy: {},
      register: (_handler: (e: string) => void) => 1,
      unregister: (id: number) => {
        events.push(`unregistered:${id}`)
      }
    }

    const lifecycle = createProxyLifecycle(mockProxyResult)
    lifecycle.register(() => {})
    lifecycle.destroy()
    lifecycle.destroy()

    expect(events.filter((e) => e === 'unregistered:1')).toHaveLength(1)
  })
})

describe('DryvValidationSession direct method access (6.2)', () => {
  it('session.callServer should work directly', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        email: [{
          async: true,
          validate: async ($m: any, session: any) => {
            const result = await session.callServer('/api/test', 'POST', { email: $m.email })
            return result.valid ? null : 'Invalid'
          }
        }]
      } as any
    })

    const { validator } = createObjectValidator(
      { name: 'x', email: 'bad', age: 1 },
      ruleSet,
      { callServer: async () => ({ valid: false }) }
    )

    const result = await validator.validate()
    expect(result.hasErrors).toBe(true)
  })

  it('session.parseDate should be accessible directly', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { session } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const ts = session.parseDate('2023-01-01', 'en-US', 'YYYY-MM-DD')
    expect(typeof ts).toBe('number')
  })

  it('session.format should be accessible directly', () => {
    const ruleSet = createRuleSet<SimpleModel>()
    const { session } = createObjectValidator({ name: 'x', email: 'y', age: 1 }, ruleSet)

    const formatted = session.format(42, 'number')
    expect(formatted).toBe('42')
  })
})

describe('DryvCompositeValidator hierarchy (6.3)', () => {
  it('DryvObjectValidator should extend DryvCompositeValidator', () => {
    expect(Object.getPrototypeOf(DryvObjectValidator.prototype)).toBe(DryvCompositeValidator.prototype)
    expect(Object.getPrototypeOf(DryvCompositeValidator.prototype)).toBe(DryvValidator.prototype)
  })

  it('DryvArrayValidator should extend DryvCompositeValidator', () => {
    expect(Object.getPrototypeOf(DryvArrayValidator.prototype)).toBe(DryvCompositeValidator.prototype)
    expect(Object.getPrototypeOf(DryvCompositeValidator.prototype)).toBe(DryvValidator.prototype)
  })
})

describe('resetState consolidation (6.1)', () => {
  it('clear should reset type/text/group but not isDirty', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: ($m: any) => (!$m.name ? 'Required' : null) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'y', age: 1 }, ruleSet)
    await validator.validate()

    expect(validator.fields.name!.text).toBe('Required')

    // Simulate dirty
    validator.value.name = 'changed'

    validator.clear()

    expect(validator.fields.name!.text).toBeNull()
    expect(validator.fields.name!.type).toBeNull()
  })

  it('revert should reset type/text/group and isDirty', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: ($m: any) => (!$m.name ? 'Required' : null) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'y', age: 1 }, ruleSet)
    await validator.validate()

    validator.revert()

    expect(validator.fields.name!.text).toBeNull()
    expect(validator.fields.name!.type).toBeNull()
    expect(validator.fields.name!.isDirty).toBe(false)
  })

  it('commit should reset type/text/group and isDirty', async () => {
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: ($m: any) => (!$m.name ? 'Required' : null) }]
      } as any
    })

    const { validator } = createObjectValidator({ name: '', email: 'y', age: 1 }, ruleSet)
    await validator.validate()

    validator.commit()

    expect(validator.fields.name!.text).toBeNull()
    expect(validator.fields.name!.type).toBeNull()
    expect(validator.fields.name!.isDirty).toBe(false)
  })
})
