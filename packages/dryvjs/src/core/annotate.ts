import {
  DryvOptions,
  DryvProxy,
  DryvValidationRuleSet,
  DryvValidatable,
  DryvValidationRule,
  DryvObject
} from './typings'
import { isDryvValidatable } from './'

export function annotate<TModel extends object, TParameters = object>(
  model: DryvProxy<TModel>,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>,
  options: DryvOptions
) {
  annotateDryvObject<TModel, TParameters>(model.$validatable.value!, ruleSet, options)
}

function annotateDryvObject<TModel extends object, TParameters = object>(
  dryvObject: DryvObject<TModel>,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>,
  options: DryvOptions
) {
  for (const key in dryvObject) {
    if (options.excludedFields?.find((regexp) => regexp.test(key))) {
      continue
    }

    const value = dryvObject[key as keyof TModel] as any
    if (isDryvValidatable(value)) {
      annotateValidatable<TModel, TParameters>(value, ruleSet)
    } else if (typeof value === 'object') {
      annotateDryvObject<TModel, TParameters>(value, ruleSet, options)
    }
  }
}

function annotateValidatable<TModel extends object, TParameters = object>(
  validatable: DryvValidatable<TModel>,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>
) {
  validatable.required = !!(ruleSet.validators as any)?.[validatable.path!]?.find(
    (rule: DryvValidationRule<TModel>) => rule.annotations?.required
  )
}
