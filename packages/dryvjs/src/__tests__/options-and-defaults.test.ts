import { describe, it, expect, vi } from 'vitest'
import { defaultDryvOptions, dryvOptions } from '@/.'

describe('Options and Defaults', () => {
  describe('defaultDryvOptions', () => {
    it('should have reactiveWrapper that returns input unchanged', () => {
      const obj = { x: 1 }
      expect(defaultDryvOptions.reactiveWrapper(obj)).toBe(obj)
    })

    it('should have validationTrigger set to autoAfterManual', () => {
      expect(defaultDryvOptions.validationTrigger).toBe('autoAfterManual')
    })

    it('should have excludedFields with patterns for _ and $ prefixes', () => {
      expect(defaultDryvOptions.excludedFields).toBeDefined()
      expect(defaultDryvOptions.excludedFields!.length).toBeGreaterThan(0)

      const patterns = defaultDryvOptions.excludedFields!
      expect(patterns.some((p) => p.test('_private'))).toBe(true)
      expect(patterns.some((p) => p.test('$special'))).toBe(true)
      expect(patterns.some((p) => p.test('normalField'))).toBe(false)
    })

    it('should have parseDate that parses date strings', () => {
      const result = defaultDryvOptions.parseDate!('2023-01-15', '', '')
      expect(result).toBe(new Date('2023-01-15').valueOf())
    })

    it('should have format that converts to string', () => {
      expect(defaultDryvOptions.format!(42, '')).toBe('42')
      expect(defaultDryvOptions.format!(null, '')).toBe('')
      expect(defaultDryvOptions.format!(undefined, '')).toBe('')
    })

    it('should have callServer that calls fetch', async () => {
      const mockResponse = { json: () => Promise.resolve({ valid: true }) }
      const fetchMock = vi.fn().mockResolvedValue(mockResponse)
      globalThis.fetch = fetchMock as any

      const result = await defaultDryvOptions.callServer!('/api/test', 'POST', { name: 'test' })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' })
      })
      expect(result).toEqual({ valid: true })
    })

    it('should append query params for GET requests in callServer', async () => {
      const mockResponse = { json: () => Promise.resolve({}) }
      const fetchMock = vi.fn().mockResolvedValue(mockResponse)
      globalThis.fetch = fetchMock as any

      await defaultDryvOptions.callServer!('/api/test', 'GET', { name: 'foo', age: '30' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test?name=foo&age=30',
        { method: 'GET', body: undefined }
      )
    })

    it('should append with & when URL already has query params', async () => {
      const mockResponse = { json: () => Promise.resolve({}) }
      const fetchMock = vi.fn().mockResolvedValue(mockResponse)
      globalThis.fetch = fetchMock as any

      await defaultDryvOptions.callServer!('/api/test?existing=1', 'GET', { name: 'foo' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test?existing=1&name=foo',
        { method: 'GET', body: undefined }
      )
    })
  })

  describe('dryvOptions', () => {
    it('should merge overrides with defaults', () => {
      const merged = dryvOptions({ validationTrigger: 'manual' } as any)

      expect(merged.validationTrigger).toBe('manual')
      expect(merged.reactiveWrapper).toBeDefined()
    })

    it('should handle undefined overrides', () => {
      const merged = dryvOptions(undefined)

      expect(merged.validationTrigger).toBe('autoAfterManual')
    })

    it('should apply multiple overrides in order', () => {
      const merged = dryvOptions(
        { validationTrigger: 'manual' } as any,
        { validationTrigger: 'auto' } as any
      )

      expect(merged.validationTrigger).toBe('auto')
    })
  })
})
