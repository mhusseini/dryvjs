import type {
  DryvOptions,
  DryvProxy,
  DryvValidationRuleSet,
  DryvValidatable,
  DryvValidationRule
} from './typings'
import { isDryvValidatable } from './'

export function annotate<TModel extends object>(
  model: DryvProxy<TModel>,
  ruleSet: DryvValidationRuleSet<TModel>,
  options: DryvOptions
) {
  annotateObject<TModel>(model.$dryv, ruleSet, options)
}

function annotateObject<TModel extends object>(
  validatable: DryvValidatable<TModel>,
  ruleSet: DryvValidationRuleSet<TModel>,
  options: DryvOptions
) {
  const model = validatable.value
  for (const key in model) {
    if (options.excludedFields?.find((regexp) => regexp.test(key))) {
      continue
    }

    const value = model[key]
    if (isDryvValidatable(value)) {
      annotateValidatable<TModel>(value, ruleSet)
    }

    if (typeof value === 'object') {
      annotateObject<TModel>(value, ruleSet, options)
    }
  }
}

function annotateValidatable<TModel extends object>(
  validatable: DryvValidatable<TModel>,
  ruleSet: DryvValidationRuleSet<TModel>
) {
  validatable.required =
    (ruleSet.validators as any)?.[validatable.field]?.find(
      (rule: DryvValidationRule<TModel>) => rule.annotations?.required
    ) ?? false
}
