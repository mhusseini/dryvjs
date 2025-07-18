import type { DryvValidationSession } from '@/DryvValidationSession'
import { DryvOptions } from '@/typings'
import { DryvValidator } from '@/DryvValidator'
import { DryvArrayValidator } from '@/DryvArrayValidator'
import { DryvFieldValidator } from '@/DryvFieldValidator'
import { DryvObjectValidator } from '@/DryvObjectValidator'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'
import { SpecialTypeWrapper } from '@/internal'

export function createValidator<TModel>(
  parent: DryvCompositeValidator,
  value: any,
  model: TModel | undefined,
  field: keyof TModel | undefined,
  session: DryvValidationSession,
  options: DryvOptions
): DryvValidator | null {
  field ??= '' as keyof TModel
  model ??= { [field]: value } as any

  if (Array.isArray(value)) {
    return new DryvArrayValidator(value, session, parent, options, field)
  }

  if (typeof value === 'function') {
    return null
  }
  if (SpecialTypeWrapper.isSpecialType(value)) {
    const validator = new DryvFieldValidator(
      model as object,
      session,
      parent,
      options,
      field! as keyof object
    )
    const rules = session.ruleSet.validators[validator.path ?? '']
    validator.required = !!(rules && rules.find((rule) => !!rule.annotations?.required))

    return validator
  }

  if (value instanceof Object) {
    return new DryvObjectValidator(SpecialTypeWrapper.wrap(value), session, parent, options, field)
  }

  const validator = new DryvFieldValidator(
    model! as object,
    session,
    parent,
    options,
    field! as keyof object
  )
  const rules = session.ruleSet.validators[validator.path ?? '']
  validator.required = !!(rules && rules.find((rule) => !!rule.annotations?.required))

  return validator
}
