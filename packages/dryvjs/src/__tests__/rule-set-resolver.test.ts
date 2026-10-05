import { describe, it, expect, afterEach } from 'vitest'
import { dryvRuleSet } from '@/config/dryvRuleSet'
import { defaultDryvOptions } from '@/config/defaultDryvOptions'
import type { DryvValidationRuleSet, DryvValidationRuleSetResolver } from '@/.'

describe('dryvRuleSet — Rule Set Resolution', () => {
  const originalResolvers = [...(defaultDryvOptions.ruleSetResolvers ?? [])]

  afterEach(() => {
    // Restore original resolvers
    defaultDryvOptions.ruleSetResolvers = [...originalResolvers]
  })

  it('should return undefined when no resolvers match', () => {
    const result = dryvRuleSet('nonexistent')

    expect(result).toBeUndefined()
  })

  it('should resolve a rule set from inline resolvers', () => {
    const mockRuleSet: DryvValidationRuleSet = {
      name: '',
      validators: {} as any
    }

    const resolver: DryvValidationRuleSetResolver = {
      name: 'myResolver',
      resolve: (name: string) => name === 'myRules' ? mockRuleSet : undefined
    }

    const result = dryvRuleSet('myRules', [resolver])

    expect(result).toBe(mockRuleSet)
    expect(result!.name).toBe('myRules')
  })

  it('should set the name on the resolved rule set', () => {
    const mockRuleSet: DryvValidationRuleSet = {
      name: '',
      validators: {} as any
    }

    const resolver: DryvValidationRuleSetResolver = {
      name: 'test',
      resolve: () => mockRuleSet
    }

    const result = dryvRuleSet('expectedName', [resolver])

    expect(result!.name).toBe('expectedName')
  })

  it('should try resolvers in order and return first match', () => {
    const ruleSet1: DryvValidationRuleSet = { name: '', validators: {} as any }
    const ruleSet2: DryvValidationRuleSet = { name: '', validators: {} as any }

    const resolver1: DryvValidationRuleSetResolver = {
      name: 'first',
      resolve: () => ruleSet1
    }

    const resolver2: DryvValidationRuleSetResolver = {
      name: 'second',
      resolve: () => ruleSet2
    }

    const result = dryvRuleSet('test', [resolver1, resolver2])

    expect(result).toBe(ruleSet1)
  })

  it('should skip resolvers that return undefined', () => {
    const ruleSet: DryvValidationRuleSet = { name: '', validators: {} as any }

    const resolver1: DryvValidationRuleSetResolver = {
      name: 'skip',
      resolve: () => undefined
    }

    const resolver2: DryvValidationRuleSetResolver = {
      name: 'match',
      resolve: () => ruleSet
    }

    const result = dryvRuleSet('test', [resolver1, resolver2])

    expect(result).toBe(ruleSet)
  })
})
