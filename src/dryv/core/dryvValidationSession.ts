import type {
  DryvFieldValidationResult,
  DryvOptions,
  DryvProxy,
  DryvValidatable,
  DryvValidationResult,
  DryvValidationResultStatus,
  DryvValidationRule,
  DryvValidationRuleSet,
  DryvValidationSession
} from './typings'

import { isDryvProxy } from './isDryvProxy'
import { isDryvValidatable } from './isDryvValidatableValue'

export function dryvValidationSession<TModel>(
  options: DryvOptions,
  ruleSet?: DryvValidationRuleSet<TModel>
): DryvValidationSession<TModel> {
  const _excludedFields: { [field: string]: boolean } = {}

  const session: DryvValidationSession<TModel> = {
    dryv: {
      callServer: options.callServer,
      handleResult: options.handleResult,
      valueOfDate: options.valueOfDate
    },

    async validateObject(
      objOrProxy: DryvValidatable<TModel> | DryvProxy<TModel>
    ): Promise<DryvValidationResult<TModel> | null> {
      const obj = isDryvProxy(objOrProxy) ? objOrProxy.$dryv : objOrProxy
      const results: DryvValidationResult<TModel>[] = await Promise.all(
        Object.entries(obj.value)
          .filter(([key, value]) => isDryvValidatable(value) && !isExcludedField(key))
          .map(([_, value]) => (value as any as DryvValidatable).validate(session))
      )
      const fieldResults = results.filter((r) => r).flatMap((r) => r.results)
      const warnings = fieldResults.filter((r) => r.status === 'warning')
      const hasErrors = fieldResults.some((r) => r.status === 'error')

      obj.status = hasErrors ? 'error' : warnings.length > 0 ? 'warning' : 'success'

      return {
        results: fieldResults,
        hasErrors: hasErrors,
        hasWarnings: warnings.length > 0,
        warningHash: fieldResults.map((r) => r.text).join('|')
      }
    },

    validateField: async function <TValue>(
      field: DryvValidatable<TModel, TValue>,
      model?: TModel
    ): Promise<DryvValidationResult<TModel> | null> {
      if (!model) {
        model = getModel(field)
      }

      const result = await validateFieldInternal(session, ruleSet, model, field, options)

      if (result) {
        field.status = result.status
        field.text = result.text
        field.group = result.group

        const status = result.status?.toLowerCase()

        return status === 'success'
          ? null
          : {
              results: [result],
              hasErrors: status === 'error',
              hasWarnings: status === 'warning',
              warningHash: status === 'warning' ? result.text : null
            }
      } else {
        field.status = 'success'
        field.text = null
        field.group = null

        return null
      }
    }
  }

  return session

  function isExcludedField(path: string, fieldName: string): boolean {
    if (!options.excludedFields) {
      return false
    }

    const key = path ? path + '.' + fieldName : fieldName

    if (_excludedFields[key] === undefined) {
      _excludedFields[key] = options.excludedFields.find((regexp) => regexp.test(key))
    }

    return _excludedFields[key]
  }
}

async function validateFieldInternal<TModel>(
  session: DryvValidationSession,
  ruleSet: DryvValidationRuleSet<TModel>,
  model: TModel,
  field: DryvValidatable<TModel>,
  options: DryvOptions
): Promise<DryvFieldValidationResult | null> | null {
  const fieldName = field?.field
  if (!fieldName) {
    return null
  }

  const validators = ruleSet?.validators?.[fieldName] as DryvValidationRule<TModel>[]
  if (!validators || validators.length <= 0) {
    return null
  }

  if (await runDisablers(ruleSet, fieldName)) {
    return null
  }

  return await runValidators(session, validators, model, field, fieldName, options)
}

async function runDisablers<TModel>(
  ruleSet: DryvValidationResultStatus<TModel>,
  fieldName: string
) {
  const disablers = ruleSet?.disablers?.[fieldName] as DryvValidationRule<TModel>[]

  if (disablers && disablers.length > 0) {
    for (const rule of disablers) {
      if (await rule.validate(model, session)) {
        return true
      }
    }
  }

  return false
}

async function runValidators<TModel>(
  session: DryvValidationSession<TModel>,
  validators: DryvValidationRule<TModel>[],
  model: TModel,
  field: DryvValidatable<TModel>,
  fieldName,
  options: DryvOptions
) {
  let result: DryvFieldValidationResult | null = null

  try {
    for (const rule of validators) {
      result = await rule.validate(model, session)
      if (result && result.status !== 'success') {
        break
      }
    }
  } catch (error) {
    console.error(`DRYV: Error validating field '${fieldName}'`, error)
    if (options.exceptionHandling === 'failValidation') {
      result = {
        path: field.path,
        status: 'error',
        text: 'Validation failed.',
        group: null
      }
    }
  }

  return result && result.status !== 'success' ? result : null
}

function getModel(parent: DryvValidatable<TModel>): DryvProxy<TModel> {
  while (parent.parent) {
    parent = parent.parent
  }

  return parent.value.$model
}
