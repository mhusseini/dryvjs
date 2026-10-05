import { describe, it, expect, beforeEach } from 'vitest'

describe('Warning Result Handler Logic', () => {
  function createMockSession(ruleSetName = 'testRuleSet') {
    return { ruleSet: { name: ruleSetName } } as any
  }

  function createMockRule() {
    return {} as any
  }

  describe('Warning deduplication behavior', () => {
    let state: Record<string, Record<string, string>>
    let handler: (
      session: any,
      model: any,
      path: string,
      rule: any,
      result: any
    ) => Promise<any>

    beforeEach(() => {
      state = {}

      handler = async function handleWarningResult(
        session: any,
        _model: any,
        path: string,
        _rule: any,
        result: any
      ): Promise<any> {
        let prevWarnings = state[session.ruleSet.name]
        const prevHash = prevWarnings?.[path]

        if (!prevHash) {
          if (!result?.warningHash) {
            return result
          } else {
            if (!prevWarnings) {
              prevWarnings = {}
              state[session.ruleSet.name] = prevWarnings
            }
            prevWarnings[path] = result.warningHash
            return result
          }
        } else if (result?.warningHash) {
          if (prevHash === result.warningHash) {
            return {
              hasWarnings: false,
              hasErrors: false,
              hasNewWarnings: false,
              warningHash: undefined,
              success: true,
              results: []
            }
          } else {
            prevWarnings![path] = result.warningHash
            return result
          }
        }

        return result
      }
    })

    it('should pass through results without warningHash', async () => {
      const session = createMockSession()
      const result = {
        success: true,
        hasErrors: false,
        hasWarnings: false,
        results: []
      }

      const output = await handler(session, {}, 'name', createMockRule(), result)
      expect(output).toBe(result)
    })

    it('should store first warning hash and return the result', async () => {
      const session = createMockSession()
      const result = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'hash1',
        results: []
      }

      const output = await handler(session, {}, 'name', createMockRule(), result)
      expect(output).toBe(result)
      expect(state['testRuleSet']['name']).toBe('hash1')
    })

    it('should return success when same warning hash is seen again', async () => {
      const session = createMockSession()
      const result = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'hash1',
        results: []
      }

      await handler(session, {}, 'name', createMockRule(), result)
      const output = await handler(session, {}, 'name', createMockRule(), result)

      expect(output!.success).toBe(true)
      expect(output!.hasWarnings).toBe(false)
      expect(output!.hasErrors).toBe(false)
    })

    it('should update hash and return result when warning changes', async () => {
      const session = createMockSession()
      const result1 = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'hash1',
        results: []
      }
      const result2 = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'hash2',
        results: []
      }

      await handler(session, {}, 'name', createMockRule(), result1)
      const output = await handler(session, {}, 'name', createMockRule(), result2)

      expect(output).toBe(result2)
      expect(state['testRuleSet']['name']).toBe('hash2')
    })

    it('should track warnings per field path independently', async () => {
      const session = createMockSession()
      const nameResult = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'nameHash',
        results: []
      }
      const emailResult = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'emailHash',
        results: []
      }

      await handler(session, {}, 'name', createMockRule(), nameResult)
      await handler(session, {}, 'email', createMockRule(), emailResult)

      expect(state['testRuleSet']['name']).toBe('nameHash')
      expect(state['testRuleSet']['email']).toBe('emailHash')
    })

    it('should track warnings per rule set independently', async () => {
      const session1 = createMockSession('ruleSet1')
      const session2 = createMockSession('ruleSet2')
      const result = {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        warningHash: 'commonHash',
        results: []
      }

      await handler(session1, {}, 'name', createMockRule(), result)
      await handler(session2, {}, 'name', createMockRule(), result)

      expect(state['ruleSet1']['name']).toBe('commonHash')
      expect(state['ruleSet2']['name']).toBe('commonHash')
    })
  })
})
