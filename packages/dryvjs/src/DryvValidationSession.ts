import {
  DryvFieldValidationResult,
  DryvOptions,
  DryvValidateFunctionResult,
  DryvValidationResult,
  DryvValidationRule,
  DryvValidationRuleSet,
  DryvValidator
} from '@/.'
import { getValidatorByPath } from '@/internal'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'

export class DryvValidationSession<TModel extends object = any, TParameters = any> {
  private _depth = 0
  private _isTriggered = false
  private _processedFields: { [field: string | symbol]: boolean } | undefined = undefined
  private previousWarningHash: string | null | undefined

  readonly results: {
    fields: Record<string, DryvFieldValidationResult | undefined>
    groups: Record<string, DryvFieldValidationResult | undefined>
  }

  readonly dryv: {
    callServer(url: string, method: string, data: any): Promise<any>

    handleResult(
      session: DryvValidationSession<TModel>,
      $m: TModel,
      field: keyof TModel | string,
      rule: DryvValidationRule<TModel> | undefined | null,
      result: any
    ): Promise<any>

    valueOfDate(date: string, locale: string, format: string): number
  }

  constructor(
    private options: DryvOptions,
    public ruleSet: DryvValidationRuleSet<TModel, TParameters>
  ) {
    this.dryv = {
      callServer: options.callServer!,
      handleResult: options.handleResult!,
      valueOfDate: options.valueOfDate!
    }

    this.results = options.reactiveWrapper!({
      fields: {},
      groups: {}
    })
  }

  get isValidating() {
    return this._depth > 0
  }

  parameter(key: string): any {
    return this.ruleSet.parameters?.[key as keyof TParameters]
  }

  reset() {
    this._isTriggered = false
  }

  async validateObject(objectValidator: DryvCompositeValidator): Promise<DryvValidationResult> {
    if (await this.runDisablers(objectValidator.rootModel, objectValidator.field ?? ('' as any))) {
      objectValidator.clear()
      return {
        success: true,
        path: objectValidator.path!,
        hasErrors: false,
        hasWarnings: false,
        hasNewWarnings: false,
        warningHash: null,
        results: []
      }
    }

    this._depth++
    this._isTriggered = true

    try {
      const newValidationChain = this.startValidationChain()
      const fieldResults: DryvValidationResult[] = await Promise.all([
        this.validateField(objectValidator as DryvValidator<TModel>, objectValidator.rootModel),
        ...objectValidator.childValidators().map(async (v) => {
          const result = await v.validate()
          return { ...result, path: v.path }
        })
      ])
      const result = this.createObjectResults(fieldResults)

      if (!!result.hasNewWarnings) {
        this.previousWarningHash = result.warningHash
      }

      objectValidator.type = result.hasErrors ? 'error' : result.hasWarnings ? 'warning' : 'success'

      if (newValidationChain) {
        this.endValidationChain()
      }

      return result
    } finally {
      this._depth--
    }
  }

  async validateField(field: DryvValidator<TModel>, model?: TModel): Promise<DryvValidationResult> {
    if (!this.canValidateFields() || this._processedFields?.[field.uniquePath!]) {
      return this.success(field.path!)
    }

    if (!model) {
      model = this.getModel(field)
    }

    const newValidationChain = this.startValidationChain()
    const fieldResult = await this.validateFieldInternal(model, field)
    const result = this.createFieldValidationResult(fieldResult, field)

    this.results.fields[field.path!] = result.success ? undefined : (fieldResult ?? undefined)
    if (fieldResult?.group) {
      this.results.groups[fieldResult?.group] = result.success ? undefined : fieldResult
    }

    if (newValidationChain) {
      this.endValidationChain()
    }

    return result
  }

  private canValidateFields(): boolean {
    switch (this.options.validationTrigger) {
      case 'auto':
        // if (this.$initializing) {
        //   return false
        // }
        break
      case 'manual':
        if (!this.isValidating) {
          return false
        }
        break
      case 'autoAfterManual':
        if (!this._isTriggered && !this.isValidating) {
          return false
        }
        break
    }

    return true
  }

  private startValidationChain(): boolean {
    const newValidationChain = !this._processedFields

    if (newValidationChain) {
      this._processedFields = {}
    }

    return newValidationChain
  }

  private endValidationChain(): void {
    this._processedFields = undefined
  }

  private async validateFieldInternal(
    model: TModel,
    validatable: DryvValidator<TModel, TParameters>
  ): Promise<DryvFieldValidationResult | null> {
    const field = validatable.field
    if (!field || !this.ruleSet) {
      return Promise.resolve(null)
    }

    if (this._processedFields) {
      this._processedFields[validatable.uniquePath] = true
    }

    const rules = this.ruleSet?.validators?.[validatable.path]

    if (!rules || rules.length <= 0) {
      return Promise.resolve(null)
    }

    if (await this.runDisablers(model, field)) {
      return Promise.resolve(null)
    }

    return await this.runValidators(rules, model, validatable)
  }

  private async runDisablers(model: any, field: keyof TModel | string): Promise<boolean> {
    const disablers = this.ruleSet?.disablers?.[field]

    if (disablers && disablers.length > 0) {
      for (const rule of disablers) {
        if (await rule.validate(model, this)) {
          return true
        }
      }
    }

    return false
  }

  private async runValidators(
    rules: DryvValidationRule<TModel>[],
    model: TModel,
    validatable: DryvValidator<TModel>
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
          this.validateField(field, model)
        })
        const r = await rule.validate(model, this)
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
      if (this.options.exceptionHandling === 'failValidation') {
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

  private getModel<TModel extends object>(parent: DryvValidator<TModel>): TModel {
    while (parent.parent) {
      parent = parent.parent
    }

    return parent.model
  }

  private success(path: string): DryvValidationResult {
    return {
      results: [],
      success: true,
      hasErrors: false,
      hasWarnings: false,
      hasNewWarnings: false,
      warningHash: null,
      path
    }
  }

  private createObjectResults(results: DryvValidationResult[]): {
    results: DryvFieldValidationResult[]
    hasErrors: boolean
    hasWarnings: boolean
    hasNewWarnings: boolean
    warningHash: string
    success: boolean
  } {
    const fieldResults = results
      .filter(Boolean)
      .flatMap((r) => r.results.map((r2) => ({ ...r2, path: r.path })))

      for (const r of fieldResults) {
          r.type = r.type?.toLowerCase()
      }

    const hasWarnings = fieldResults.some((r) => r.text && r.type && /warning/i.test(r.type))
    const hasErrors = fieldResults.some((r) => r.text && r.type && /error/i.test(r.type))
    const warningHash = this.hashCode(
      fieldResults
        .filter((r) => r.text && /warning/i.test(r.text))
        .map((r) => r.text)
        .join()
    )

    return {
      results: fieldResults,
      hasErrors: hasErrors,
      hasWarnings: hasWarnings,
      hasNewWarnings: hasWarnings && warningHash !== this.previousWarningHash,
      warningHash: warningHash,
      success: !hasErrors && !hasWarnings
    }
  }

  private createFieldValidationResult<TModel extends object, TParameters>(
    result: DryvFieldValidationResult | null,
    field: DryvValidator<TModel, TParameters>
  ): DryvValidationResult {
    if (result) {
      field.type = result.type ?? 'success'
      field.text = result.text ?? null
      field.group = result.group ?? null

      const type = result.type?.toLowerCase()

      return type === 'success'
        ? this.success(field.path!)
        : {
            results: [result],
            hasErrors: type === 'error',
            hasWarnings: type === 'warning',
            warningHash: type === 'warning' ? result.text : null,
            hasNewWarnings: undefined,
            success: type === 'success' || !type,
            path: String(field.path)
          }
    } else {
      field.type = 'success'
      field.text = null
      field.group = null

      return this.success(field.path!)
    }
  }

  private hashCode(text?: string) {
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
}
