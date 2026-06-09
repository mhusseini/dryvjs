import type { DryvValidationRuleSet } from '@/types'
import { defaultDryvRuleSetResolvers } from './defaultDryvOptions'

export function dryvRuleSet<TModel extends object, TParameters = object>(
  ruleSetName: string
): DryvValidationRuleSet<TModel, TParameters> | undefined {
  for (let resolver of defaultDryvRuleSetResolvers) {
    const ruleSet = resolver.resolve(ruleSetName)
    if (ruleSet) {
      ruleSet.name = ruleSetName
      return ruleSet as DryvValidationRuleSet<TModel, TParameters>
    }
  }
  return undefined
}
