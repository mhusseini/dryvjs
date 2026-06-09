import type { DryvValidationRuleSet, DryvValidationRuleSetResolver } from '@/types'
import { defaultDryvOptions, defaultDryvRuleSetResolvers } from './defaultDryvOptions'

export function dryvRuleSet<TModel extends object, TParameters = object>(
  ruleSetName: string,
  resolvers?: DryvValidationRuleSetResolver[]
): DryvValidationRuleSet<TModel, TParameters> | undefined {
  const effectiveResolvers = resolvers
    ?? defaultDryvOptions.ruleSetResolvers
    ?? defaultDryvRuleSetResolvers
  for (const resolver of effectiveResolvers) {
    const ruleSet = resolver.resolve(ruleSetName)
    if (ruleSet) {
      ruleSet.name = ruleSetName
      return ruleSet as DryvValidationRuleSet<TModel, TParameters>
    }
  }
  return undefined
}
