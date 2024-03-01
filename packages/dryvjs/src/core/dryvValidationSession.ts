import type {
  DryvFieldValidationResult,
  DryvOptions,
  DryvProxy,
  DryvValidatable,
  DryvValidateFunctionResult,
  DryvValidationResult,
  DryvValidationRule,
  DryvValidationRuleSet,
  DryvValidationSession,
  DryvValidationSessionInternal
} from './typings'

import { isDryvProxy, isDryvValidatable } from '.'
import { getMemberByPath } from './getMemberByPath'

export function dryvValidationSession<TModel extends object>(
  options: DryvOptions,
  ruleSet: DryvValidationRuleSet<TModel>
): DryvValidationSession<TModel> {
  if (!options.callServer) {
    throw new Error('The callServer option is required.')
  }
  if (!options.handleResult) {
    throw new Error('The handleResult option is required.')
  }
  if (!options.valueOfDate) {
    throw new Error('The valueOfDate option is required.')
  }
  const _excludedFields: {
    [field: string]: boolean
  } = {}
  let _isTriggered = false
  let _depth = 0
  let _processedFields: { [field: string | symbol]: boolean } | undefined = undefined

  function isValidating() {
    return _depth > 0
  }

  const session: DryvValidationSessionInternal<TModel> = {
    dryv: {
      callServer: options.callServer,
      handleResult: options.handleResult,
      valueOfDate: options.valueOfDate
    },

    results: options.objectWrapper!({
      fields: {},
      groups: {}
    }),

    async validateObject(
      objOrProxy: DryvValidatable<TModel> | DryvProxy<TModel>
    ): Promise<DryvValidationResult> {
      const obj: DryvValidatable<TModel> = isDryvProxy(objOrProxy)
        ? (objOrProxy.$validatable as DryvValidatable<TModel>)
        : (objOrProxy as DryvValidatable<TModel>)

      if (!obj) {
        throw new Error('The value null of undefined is not validatable.')
      }

      _depth++
      _isTriggered = true

      try {
        const newValidationChain = startValidationChain()
        const fieldResults = await Promise.all(
          Object.entries<DryvValidatable>(obj.value)
            .filter(([field, value]) => isDryvValidatable(value) && !isExcludedField(field))
            .map(([field, value]) => value.validate().then((result) => ({ ...result, field })))
        )
        const result = createObjectResults(fieldResults.filter((r) => !!r))

        obj.type = result.hasErrors ? 'error' : result.hasWarnings ? 'warning' : 'success'

        if (newValidationChain) {
          endValidationChain()
        }

        return result
      } finally {
        _depth--
      }
    },

    async validateField<TValue>(
      field: DryvValidatable<TModel, TValue>,
      model?: DryvProxy<TModel>
    ): Promise<DryvValidationResult> {
      if (!canValidateFields() || _processedFields?.[field.field!]) {
        return success(field.field)
      }

      if (!model) {
        model = getModel(field)
      }

      const newValidationChain = startValidationChain()
      const fieldResult = await validateFieldInternal(session, ruleSet, model, field, options)
      const result = createFieldValidationResult(fieldResult, field)

      session.results.fields[field.path!] = result.success ? undefined : fieldResult ?? undefined
      if (fieldResult?.group) {
        session.results.groups[fieldResult?.group] = result.success ? undefined : fieldResult
      }

      if (newValidationChain) {
        endValidationChain()
      }

      return result
    }
  }

  return session

  function canValidateFields(): boolean {
    switch (options.validationTrigger) {
      case 'auto':
        if (session.$initializing) {
          return false
        }
        break
      case 'manual':
        if (!isValidating()) {
          return false
        }
        break
      case 'autoAfterManual':
        if (!_isTriggered && !isValidating()) {
          return false
        }
        break
    }

    return true
  }

  function startValidationChain(): boolean {
    const newValidationChain = !_processedFields

    if (newValidationChain) {
      _processedFields = {}
    }

    return newValidationChain
  }

  function endValidationChain(): void {
    _processedFields = undefined
  }

  function isExcludedField(fieldName: string, path?: string): boolean {
    if (!options.excludedFields) {
      return false
    }

    const key = path ? path + '.' + fieldName : fieldName

    if (_excludedFields[key] === undefined) {
      _excludedFields[key] = !!options.excludedFields.find((regexp) => regexp.test(key))
    }

    return _excludedFields[key]
  }

  async function validateFieldInternal<TModel extends object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel>,
    model: DryvProxy<TModel>,
    validatable: DryvValidatable<TModel>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    const field = validatable.field
    if (!field || !ruleSet) {
      return Promise.resolve(null)
    }

    if (_processedFields) {
      _processedFields[field] = true
    }

    const rules = ruleSet?.validators?.[field] as DryvValidationRule<TModel>[]

    if (!rules || rules.length <= 0) {
      return Promise.resolve(null)
    }

    if (await runDisablers(session, ruleSet, model, field)) {
      return Promise.resolve(null)
    }

    return await runValidators(session, rules, model, validatable, options)
  }

  async function runDisablers<TModel extends object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel>,
    model: TModel,
    field: keyof TModel
  ) {
    const disablers = ruleSet?.disablers?.[field] as DryvValidationRule<TModel>[]

    if (disablers && disablers.length > 0) {
      for (const rule of disablers) {
        if (await rule.validate(model, session)) {
          return true
        }
      }
    }

    return false
  }

  async function runValidators<TModel extends object>(
    session: DryvValidationSession<TModel>,
    rules: DryvValidationRule<TModel>[],
    model: DryvProxy<TModel>,
    validatable: DryvValidatable<TModel>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    let result: DryvValidateFunctionResult = null

    try {
      for (const rule of rules) {
        rule.related?.forEach((relatedField) => {
          if (!relatedField) {
            return
          }
          const field = getMemberByPath(model.$validatable.value!, relatedField as string)
          if (!field) {
            model[relatedField] = null!
          }
          session.validateField(field, model)
        })
        const r = await rule.validate(model, session)
        if (!r) {
          // continue
        } else if (typeof r === 'string') {
          result = {
            path: validatable.path!,
            type: 'error',
            text: r,
            group: rule.group
          }
          break
        } else if (r.type !== 'success') {
          result = r
          if (!result.group) {
            result.group = rule.group
          }
          break
        }
      }
    } catch (error) {
      console.error(`DRYV: Error validating field '${String(validatable.field)}'`, error)
      if (options.exceptionHandling === 'failValidation') {
        result = {
          path: validatable.path!,
          type: 'error',
          text: 'Validation failed.',
          group: null
        }
      }
    }

    return result && result.type !== 'success' ? result : null
  }
}

function getModel<TModel extends object>(parent: DryvValidatable<TModel>): DryvProxy<TModel> {
  while (parent.parent) {
    parent = parent.parent
  }

  return (parent as any).$model ?? parent.value.$model
}

function success<TModel extends object>(field: keyof TModel | undefined): DryvValidationResult {
  return {
    results: [],
    success: true,
    hasErrors: false,
    hasWarnings: false,
    warningHash: null,
    field: String(field)
  }
}

function createObjectResults<TModel extends object>(results: DryvValidationResult[]) {
  const fieldResults = results.filter((r) => r).flatMap((r) => r.results)
  const hasWarnings = fieldResults.some((r) => r.type === 'warning')
  const hasErrors = fieldResults.some((r) => r.type === 'error')

  return {
    results: fieldResults,
    hasErrors: hasErrors,
    hasWarnings: hasWarnings,
    warningHash: hashCode(
      fieldResults
        .filter((r) => r.type === 'warning')
        .map((r) => r.text)
        .join()
    ),
    success: !hasErrors && !hasWarnings
  }
}

function createFieldValidationResult<TModel extends object, TValue>(
  result: DryvFieldValidationResult | null,
  field: DryvValidatable<TModel, TValue>
): DryvValidationResult {
  if (result) {
    field.type = result.type
    field.text = result.text
    field.group = result.group

    const type = result.type?.toLowerCase()

    return type === 'success'
      ? success(field.field)
      : {
          results: [result],
          hasErrors: type === 'error',
          hasWarnings: type === 'warning',
          warningHash: type === 'warning' ? result.text : null,
          success: type === 'success' || !type,
          field: String(field.field)
        }
  } else {
    field.type = 'success'
    field.text = null
    field.group = null

    return success(field.field!)
  }
}

function hashCode(text?: string) {
  if (!text || text.length === 0) {
    return ''
  }

  let hash = 0

  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16)
}
