import {
  DryvFieldValidationResult,
  DryvFieldValidator,
  DryvObjectValidator,
  DryvOptions,
  DryvValidateFunctionResult,
  DryvValidationResult,
  DryvValidationResultType,
  DryvValidationRule,
  DryvValidationRuleSet,
  DryvValidationSession,
  DryvValidationSessionInternal,
  DryvValidator
} from '@/core'
import { getValidatorByPath } from '@/core/getMemberByPath'

export function dryvValidatorSession<TModel extends object, TParameters = object>(
  options: DryvOptions,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>
): DryvValidationSession<TModel, TParameters> {
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
      objectValidator: DryvObjectValidator<TModel, TParameters>
    ): Promise<DryvValidationResult> {
      if (
        await runDisablers(
          session,
          ruleSet,
          objectValidator.rootModel,
          objectValidator.field ?? ('' as any)
        )
      ) {
        objectValidator.clear()
        return {
          success: true,
          path: objectValidator.path!,
          hasErrors: false,
          hasWarnings: false,
          warningHash: null,
          results: []
        }
      }

      _depth++
      _isTriggered = true

      try {
        const newValidationChain = startValidationChain()
        const fieldResults: DryvValidationResult[] = await Promise.all(
          Array.from(traverseFields(ruleSet, objectValidator.value)).map(([field, value]) =>
            value.validate().then((result) => ({ ...result, path: value.path ?? undefined }))
          )
        )
        const result = createObjectResults(fieldResults.filter((r) => !!r))

        objectValidator.type = result.hasErrors
          ? 'error'
          : result.hasWarnings
            ? 'warning'
            : 'success'

        if (newValidationChain) {
          endValidationChain()
        }

        return result
      } finally {
        _depth--
      }
    },
    async validateField(
      field: DryvFieldValidator<TModel, TParameters>,
      model?: TModel
    ): Promise<DryvValidationResult> {
      if (!canValidateFields() || _processedFields?.[field.field!]) {
        return success(field.path!)
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

  function* traverseFields(
    ruleSet: DryvValidationRuleSet<TModel, TParameters>,
    obj: any,
    parentPath?: string
  ): IterableIterator<[string, DryvValidator]> {
    if (!parentPath) {
      parentPath = ''
    }

    for (const key in obj) {
      if (!(!isExcludedField(key) && obj.hasOwnProperty(key))) {
        console.log('*** excluded field ' + key)
        continue
      }
      const path = parentPath ? parentPath + '.' + key : key
      const value = obj[key]
      if (typeof value !== 'object') {
        console.log('*** what field ' + path)
        continue
      }

      const model = (obj as any).$model ?? obj
      const disablers = ruleSet.disablers?.[key]
      if (disablers && disablers.find((disabler) => disabler.validate(model, session))) {
        console.log('*** skipping field ' + path)
        continue
      }

      if (value instanceof DryvValidator) {
        console.log('*** using field ' + path)
        yield [path, value]
      } else {
        console.log('*** drilling into field ' + path)
        yield* traverseFields(ruleSet, value, path)
      }
    }
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

  async function validateFieldInternal<TModel extends object, TParameters = object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel, TParameters>,
    model: TModel,
    validatable: DryvValidator<TModel, TParameters>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    const field = validatable.field
    if (!field || !ruleSet) {
      return Promise.resolve(null)
    }

    if (_processedFields) {
      _processedFields[field] = true
    }

    const rules = ruleSet?.validators?.[validatable.path!] as DryvValidationRule<TModel>[]

    if (!rules || rules.length <= 0) {
      return Promise.resolve(null)
    }

    if (await runDisablers(session, ruleSet, model, field)) {
      return Promise.resolve(null)
    }

    return await runValidators(session, rules, model, validatable, options)
  }

  async function runDisablers<TModel extends object, TParameters = object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel, TParameters>,
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
    model: TModel,
    validatable: DryvValidator<TModel>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    let result: DryvValidateFunctionResult = null

    try {
      for (const rule of rules) {
        rule.related?.forEach((relatedField) => {
          if (!relatedField || relatedField === validatable.path) {
            return
          }
          const field = getValidatorByPath(validatable.rootValidator, relatedField as string)
          if (!field) {
            return
            //model[relatedField] = null!
          }
          session.validateField(field, model)
        })
        const r = await rule.validate(model, session)
        if (!r || r === true) {
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

function getModel<TModel extends object>(parent: DryvValidator<TModel>): TModel {
  while (parent.parent) {
    parent = parent.parent
  }

  return parent.model
}

function success(path: string): DryvValidationResult {
  return {
    results: [],
    success: true,
    hasErrors: false,
    hasWarnings: false,
    warningHash: null,
    path
  }
}

function createObjectResults(results: DryvValidationResult[]): {
  results: DryvFieldValidationResult[]
  hasErrors: boolean
  hasWarnings: boolean
  warningHash: string
  success: boolean
} {
  const fieldResults = results
    .filter((r) => r)
    .flatMap((r) => r.results.map((r2) => ({ ...r2, path: r.path })))
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

function createFieldValidationResult<TModel extends object, TParameters>(
  result: DryvFieldValidationResult | null,
  field: DryvValidator<TModel, TParameters>
): DryvValidationResult {
  if (result) {
    field.type = result.type ?? 'success'
    field.text = result.text ?? null
    field.group = result.group ?? null

    const type = result.type?.toLowerCase()

    return type === 'success'
      ? success(field.path!)
      : {
          results: [result],
          hasErrors: type === 'error',
          hasWarnings: type === 'warning',
          warningHash: type === 'warning' ? result.text : null,
          success: type === 'success' || !type,
          path: String(field.path)
        }
  } else {
    field.type = 'success'
    field.text = null
    field.group = null

    return success(field.path!)
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
