import { describe, it, expect } from 'vitest'
import {
  successResult,
  normalizeResults,
  computeWarningHash,
  buildAggregateResult,
  aggregateFieldResults,
  buildFieldResult,
  hashCode
} from '@/session/validationResults'

describe('Validation Results — Pure Functions', () => {
  describe('successResult', () => {
    it('should return a success result with the given path', () => {
      const result = successResult('name')

      expect(result.success).toBe(true)
      expect(result.hasErrors).toBe(false)
      expect(result.hasWarnings).toBe(false)
      expect(result.hasNewWarnings).toBe(false)
      expect(result.warningHash).toBeNull()
      expect(result.path).toBe('name')
      expect(result.results).toEqual([])
    })

    it('should return a success result for empty path', () => {
      const result = successResult('')
      expect(result.path).toBe('')
      expect(result.success).toBe(true)
    })
  })

  describe('normalizeResults', () => {
    it('should flatten nested results and propagate parent path', () => {
      const results = [
        {
          results: [{ type: 'Error', text: 'Required' }],
          success: false,
          hasErrors: true,
          hasWarnings: false,
          hasNewWarnings: false,
          warningHash: null,
          path: 'name'
        }
      ]

      const normalized = normalizeResults(results)

      expect(normalized.length).toBe(1)
      expect(normalized[0].path).toBe('name')
      expect(normalized[0].type).toBe('error') // lowercased
      expect(normalized[0].text).toBe('Required')
    })

    it('should lowercase types', () => {
      const results = [
        {
          results: [{ type: 'WARNING', text: 'Warn' }, { type: 'Error', text: 'Err' }],
          success: false,
          hasErrors: true,
          hasWarnings: true,
          hasNewWarnings: false,
          warningHash: null,
          path: 'field'
        }
      ]

      const normalized = normalizeResults(results)

      expect(normalized[0].type).toBe('warning')
      expect(normalized[1].type).toBe('error')
    })

    it('should filter out falsy results', () => {
      const results = [
        null as any,
        undefined as any,
        {
          results: [{ type: 'error', text: 'Err' }],
          success: false,
          hasErrors: true,
          hasWarnings: false,
          hasNewWarnings: false,
          warningHash: null,
          path: 'field'
        }
      ]

      const normalized = normalizeResults(results)

      expect(normalized.length).toBe(1)
    })

    it('should return empty array for empty input', () => {
      expect(normalizeResults([])).toEqual([])
    })

    it('should handle results with multiple field results', () => {
      const results = [
        {
          results: [
            { type: 'error', text: 'A' },
            { type: 'warning', text: 'B' }
          ],
          success: false,
          hasErrors: true,
          hasWarnings: true,
          hasNewWarnings: false,
          warningHash: null,
          path: 'multi'
        }
      ]

      const normalized = normalizeResults(results)
      expect(normalized.length).toBe(2)
      expect(normalized[0].path).toBe('multi')
      expect(normalized[1].path).toBe('multi')
    })
  })

  describe('computeWarningHash', () => {
    it('should return empty string when there are no warnings', () => {
      const normalized = [{ type: 'error', text: 'Error text' }]
      expect(computeWarningHash(normalized)).toBe('')
    })

    it('should compute a hash for warning texts that contain "warning"', () => {
      const normalized = [{ type: 'warning', text: 'This is a warning message' }]
      const hash = computeWarningHash(normalized)
      expect(hash).not.toBe('')
      expect(typeof hash).toBe('string')
    })

    it('should return the same hash for the same warning texts', () => {
      const normalized = [{ type: 'warning', text: 'warning: same text' }]
      const hash1 = computeWarningHash(normalized)
      const hash2 = computeWarningHash(normalized)
      expect(hash1).toBe(hash2)
    })

    it('should return different hashes for different warning texts', () => {
      const norm1 = [{ type: 'warning', text: 'warning: text A' }]
      const norm2 = [{ type: 'warning', text: 'warning: text B' }]
      expect(computeWarningHash(norm1)).not.toBe(computeWarningHash(norm2))
    })

    it('should filter based on text content containing "warning"', () => {
      // Note: computeWarningHash filters by r.text containing /warning/i, NOT by r.type
      const normalized = [{ type: 'warning', text: 'Field is too short' }]
      const hash = computeWarningHash(normalized)
      // text does not contain 'warning' so it won't be included in the hash
      expect(hash).toBe('')
    })
  })

  describe('buildAggregateResult', () => {
    it('should detect errors', () => {
      const normalized = [{ type: 'error', text: 'Error' }]
      const result = buildAggregateResult(normalized, '', null)

      expect(result.hasErrors).toBe(true)
      expect(result.hasWarnings).toBe(false)
      expect(result.success).toBe(false)
    })

    it('should detect warnings', () => {
      const normalized = [{ type: 'warning', text: 'Warn' }]
      const result = buildAggregateResult(normalized, 'abc', null)

      expect(result.hasWarnings).toBe(true)
      expect(result.hasErrors).toBe(false)
      expect(result.success).toBe(false)
    })

    it('should report success when no errors or warnings', () => {
      const normalized = [{ type: 'success', text: null }]
      const result = buildAggregateResult(normalized, '', null)

      expect(result.success).toBe(true)
      expect(result.hasErrors).toBe(false)
      expect(result.hasWarnings).toBe(false)
    })

    it('should detect new warnings when hash differs from previous', () => {
      const normalized = [{ type: 'warning', text: 'Warn' }]
      const result = buildAggregateResult(normalized, 'newHash', 'oldHash')

      expect(result.hasNewWarnings).toBe(true)
    })

    it('should NOT detect new warnings when hash matches previous', () => {
      const normalized = [{ type: 'warning', text: 'Warn' }]
      const result = buildAggregateResult(normalized, 'sameHash', 'sameHash')

      expect(result.hasNewWarnings).toBe(false)
    })

    it('should handle both errors and warnings simultaneously', () => {
      const normalized = [
        { type: 'error', text: 'Error' },
        { type: 'warning', text: 'Warn' }
      ]
      const result = buildAggregateResult(normalized, 'hash', null)

      expect(result.hasErrors).toBe(true)
      expect(result.hasWarnings).toBe(true)
      expect(result.success).toBe(false)
    })

    it('should handle empty normalized results as success', () => {
      const result = buildAggregateResult([], '', null)

      expect(result.success).toBe(true)
      expect(result.hasErrors).toBe(false)
      expect(result.hasWarnings).toBe(false)
    })

    it('should require both text and type for error/warning detection', () => {
      // A result with type but no text should not count
      const normalizedNoText = [{ type: 'error', text: null as any }]
      const result = buildAggregateResult(normalizedNoText, '', null)
      expect(result.hasErrors).toBe(false)

      // A result with text but no type should not count
      const normalizedNoType = [{ type: null as any, text: 'some text' }]
      const result2 = buildAggregateResult(normalizedNoType, '', null)
      expect(result2.hasErrors).toBe(false)
    })
  })

  describe('aggregateFieldResults', () => {
    it('should compose normalizeResults -> computeWarningHash -> buildAggregateResult', () => {
      const results = [
        {
          results: [{ type: 'Error', text: 'Required' }],
          success: false,
          hasErrors: true,
          hasWarnings: false,
          hasNewWarnings: false,
          warningHash: null,
          path: 'name'
        }
      ]

      const aggregated = aggregateFieldResults(results, null)

      expect(aggregated.hasErrors).toBe(true)
      expect(aggregated.success).toBe(false)
      expect(aggregated.results.length).toBe(1)
    })

    it('should handle empty results array', () => {
      const aggregated = aggregateFieldResults([], null)

      expect(aggregated.success).toBe(true)
      expect(aggregated.results).toEqual([])
    })
  })

  describe('buildFieldResult', () => {
    it('should return success result for null input', () => {
      const result = buildFieldResult(null, 'name')

      expect(result.success).toBe(true)
      expect(result.path).toBe('name')
      expect(result.results).toEqual([])
    })

    it('should return success result for success type', () => {
      const result = buildFieldResult({ type: 'success', text: '', group: null }, 'name')

      expect(result.success).toBe(true)
      expect(result.results).toEqual([])
    })

    it('should return error result', () => {
      const result = buildFieldResult({ type: 'error', text: 'Required', group: null }, 'name')

      expect(result.success).toBe(false)
      expect(result.hasErrors).toBe(true)
      expect(result.hasWarnings).toBe(false)
      expect(result.results[0].text).toBe('Required')
    })

    it('should return warning result', () => {
      const result = buildFieldResult({ type: 'warning', text: 'Short name', group: null }, 'name')

      expect(result.success).toBe(false)
      expect(result.hasWarnings).toBe(true)
      expect(result.hasErrors).toBe(false)
      expect(result.warningHash).toBe('Short name')
    })

    it('should handle case-insensitive success type', () => {
      const result = buildFieldResult({ type: 'Success', text: '', group: null }, 'name')

      expect(result.success).toBe(true)
    })

    it('should treat missing type as success', () => {
      const result = buildFieldResult({ type: undefined as any, text: 'something', group: null }, 'name')

      // type is undefined → success: type === 'success' || !type = true
      expect(result.success).toBe(true)
    })
  })

  describe('hashCode', () => {
    it('should return empty string for empty input', () => {
      expect(hashCode('')).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(hashCode(undefined)).toBe('')
    })

    it('should return a non-empty hex string for valid input', () => {
      const hash = hashCode('hello')
      expect(hash.length).toBeGreaterThan(0)
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })

    it('should return the same hash for the same input', () => {
      expect(hashCode('test')).toBe(hashCode('test'))
    })

    it('should return different hashes for different inputs', () => {
      expect(hashCode('hello')).not.toBe(hashCode('world'))
    })

    it('should handle single character input', () => {
      const hash = hashCode('a')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should handle very long strings', () => {
      const longStr = 'a'.repeat(10000)
      const hash = hashCode(longStr)
      expect(hash.length).toBeGreaterThan(0)
    })
  })
})
