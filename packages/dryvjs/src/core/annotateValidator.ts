import { DryvFieldValidator, DryvObjectValidator, DryvValidationRuleSet } from '@/core'

export function annotateValidator<TModel extends object, TParameters = object>(
  validator: DryvObjectValidator<TModel>,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>
) {
  for (const childValidator of Object.values(validator.value)) {
    if ((childValidator as any) instanceof DryvFieldValidator) {
      annotateFieldValidator(childValidator as any, ruleSet)
    } else if ((childValidator as any) instanceof DryvObjectValidator) {
      annotateValidator(childValidator as any, ruleSet)
    }
  }
}

function annotateFieldValidator<TModel extends object, TParameters = object>(
  validator: DryvFieldValidator<TModel>,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>
) {
  const rules = ruleSet.validators[validator.path ?? '']
  validator.required = !!rules?.find((rule) => !!rule.annotations?.required)
}
