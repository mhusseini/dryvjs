import { describe, it, expect, vi } from 'vitest'
import { DryvRuleContext } from '@/session/DryvRuleContext'
import type { DryvOptions, DryvValidationRuleSet } from '@/.'

describe('DryvRuleContext', () => {
  function createContext(
    optionOverrides: Partial<DryvOptions> = {},
    ruleSetOverrides: Partial<DryvValidationRuleSet> = {}
  ) {
    const options: DryvOptions = {
      reactiveWrapper: (obj: any) => obj,
      validationTrigger: 'auto',
      parseDate: vi.fn((d: string) => new Date(d).valueOf()),
      format: vi.fn((data: any, type: string) => String(data ?? '')),
      callServer: vi.fn(),
      handleResult: vi.fn(),
      ...optionOverrides
    } as any

    const ruleSet: DryvValidationRuleSet = {
      name: 'test',
      validators: {} as any,
      parameters: ruleSetOverrides.parameters ?? {},
      ...ruleSetOverrides
    } as any

    return { context: new DryvRuleContext(options, ruleSet), options }
  }

  describe('callServer', () => {
    it('should delegate to options.callServer', async () => {
      const callServer = vi.fn().mockResolvedValue({ ok: true })
      const { context } = createContext({ callServer })

      await context.callServer('/api/test', 'POST', { name: 'test' })

      expect(callServer).toHaveBeenCalledWith('/api/test', 'POST', { name: 'test' })
    })

    it('should throw when callServer is not configured', () => {
      const { context } = createContext({ callServer: undefined })

      expect(() => context.callServer('/api/test', 'POST', {}))
        .toThrow('DryvRuleContext: callServer option is not configured.')
    })

    it('should return the server response', async () => {
      const callServer = vi.fn().mockResolvedValue({ success: true, data: 42 })
      const { context } = createContext({ callServer })

      const result = await context.callServer('/api/test', 'GET', {})

      expect(result).toEqual({ success: true, data: 42 })
    })
  })

  describe('parseDate', () => {
    it('should delegate to options.parseDate', () => {
      const { context, options } = createContext()

      context.parseDate('2023-01-15', 'en-US', 'yyyy-MM-dd')

      expect(options.parseDate).toHaveBeenCalledWith('2023-01-15', 'en-US', 'yyyy-MM-dd')
    })

    it('should return the parsed timestamp', () => {
      const { context } = createContext()

      const result = context.parseDate('2023-01-15', '', '')
      expect(typeof result).toBe('number')
    })
  })

  describe('format', () => {
    it('should delegate to options.format', () => {
      const { context, options } = createContext()

      context.format(42, 'number')

      expect(options.format).toHaveBeenCalledWith(42, 'number', undefined)
    })

    it('should pass optional pattern parameter', () => {
      const { context, options } = createContext()

      context.format(3.14, 'number', '#.##')

      expect(options.format).toHaveBeenCalledWith(3.14, 'number', '#.##')
    })

    it('should return the formatted string', () => {
      const { context } = createContext()

      const result = context.format(42, 'number')
      expect(result).toBe('42')
    })
  })

  describe('parameter', () => {
    it('should return the parameter value from the rule set', () => {
      const { context } = createContext({}, {
        parameters: { minLength: 3, maxLength: 50 }
      } as any)

      expect(context.parameter('minLength')).toBe(3)
      expect(context.parameter('maxLength')).toBe(50)
    })

    it('should return undefined for missing parameters', () => {
      const { context } = createContext({}, {
        parameters: { existing: 'value' }
      } as any)

      expect(context.parameter('nonexistent')).toBeUndefined()
    })

    it('should return undefined when parameters is not defined', () => {
      const { context } = createContext({}, {
        parameters: undefined
      } as any)

      expect(context.parameter('anything')).toBeUndefined()
    })
  })
})
