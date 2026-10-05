import type { DryvValidationRuleSet, DryvValidationRuleSetResolver } from '@/types'
import { defaultDryvOptions, defaultDryvRuleSetResolvers } from './defaultDryvOptions'

/**
 * Resolves a named validation rule set using the provided (or default) resolvers.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 * @param ruleSetName - The name of the rule set to resolve.
 * @param resolvers - Optional list of resolvers to use (falls back to configured defaults).
 * @returns The resolved rule set, or `undefined` if no resolver matched.
 */
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
