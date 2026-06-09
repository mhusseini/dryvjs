import type {
  DryvFieldValidationResult,
  DryvOptions,
  DryvValidationResult,
  DryvValidationRule,
  DryvValidationRuleSet,
  IValidator
} from '@/types'
import { runValidationRules } from './runValidationRules'
import { runDisablerRules } from './runDisablerRules'
import { successResult, aggregateFieldResults, applyFieldResult } from './validationResults'

export class DryvValidationSession<TModel extends object = any, TParameters = any> {
  private _depth = 0
  private _isTriggered = false
  private _processedFields: { [field: string | symbol]: boolean } | undefined = undefined
  private previousWarningHash: string | null | undefined

  readonly results: {
    fields: Record<string, DryvFieldValidationResult | undefined>
    groups: Record<string, DryvFieldValidationResult | undefined>
  }

  /**
   * @deprecated Access callServer, handleResult, parseDate, format directly on the session.
   */
  get dryv(): this {
    return this
  }

  constructor(
    private options: DryvOptions,
    public ruleSet: DryvValidationRuleSet<TModel, TParameters>
  ) {
    this.results = options.reactiveWrapper!({
      fields: {},
      groups: {}
    })
  }

  callServer(url: string, method: string, data: any): Promise<any> {
    return this.options.callServer!(url, method, data)
  }

  handleResult(
    session: DryvValidationSession<TModel>,
    $m: TModel,
    field: keyof TModel | string,
    rule: DryvValidationRule<TModel> | undefined | null,
    result: any
  ): Promise<any> {
    return this.options.handleResult!(session, $m, field as keyof TModel, rule!, result)
  }

  parseDate(date: string, locale: string, format: string): number {
    return this.options.parseDate!(date, locale, format)
  }

  format(data: any, type: string, pattern?: string): string {
    return this.options.format!(data, type, pattern)
  }

  get isValidating() {
    return this._depth > 0
  }

  parameter(key: string): any {
    return this.ruleSet.parameters?.[key as keyof TParameters]
  }

  reset() {
    this._isTriggered = false
    this.previousWarningHash = undefined
  }

  async validateObject(objectValidator: IValidator<TModel>): Promise<DryvValidationResult> {
    if (await this.runDisablers(objectValidator.rootModel, objectValidator.field ?? ('' as any))) {
      objectValidator.clear()
      return successResult(objectValidator.path!)
    }

    this._depth++
    this._isTriggered = true

    try {
      const newValidationChain = this.startValidationChain()
      const fieldResults: DryvValidationResult[] = await Promise.all([
        this.validateField(objectValidator, objectValidator.rootModel),
        ...objectValidator.childValidators().map(async (v: IValidator) => {
          const result = await v.validate()
          return { ...result, path: v.path }
        })
      ])
      const result = aggregateFieldResults(fieldResults, this.previousWarningHash)

      if (result.hasNewWarnings) {
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

  async validateField(field: IValidator<TModel>, model?: TModel): Promise<DryvValidationResult> {
    if (!this.canValidateFields() || this._processedFields?.[field.uniquePath!]) {
      return successResult(field.path!)
    }

    if (!model) {
      model = this.getModel(field)
    }

    const newValidationChain = this.startValidationChain()
    const fieldResult = await this.validateFieldInternal(model!, field)
    const result = applyFieldResult(fieldResult, field)

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
    validatable: IValidator<TModel>
  ): Promise<DryvFieldValidationResult | null> {
    const field = validatable.field
    if (!field || !this.ruleSet) {
      return Promise.resolve(null)
    }

    if (this._processedFields) {
      this._processedFields[validatable.uniquePath] = true
    }

    const rules = this.ruleSet?.validators?.[validatable.path!]

    if (!rules || rules.length <= 0) {
      return Promise.resolve(null)
    }

    if (await this.runDisablers(model, field)) {
      return Promise.resolve(null)
    }

    return await this.runValidators(rules, model, validatable)
  }

  private runDisablers(model: any, field: keyof TModel | string): Promise<boolean> {
    const disablers = this.ruleSet?.disablers?.[field]
    return runDisablerRules(disablers, model, this)
  }

  private runValidators(
    rules: DryvValidationRule<TModel>[],
    model: TModel,
    validatable: IValidator<TModel>
  ): Promise<DryvFieldValidationResult | null> {
    return runValidationRules(
      rules,
      model,
      validatable,
      this,
      this.options,
      (field, m) => { this.validateField(field, m) }
    )
  }

  private getModel(parent: IValidator<TModel>): TModel {
    while (parent.parent) {
      parent = parent.parent as IValidator<TModel>
    }

    return parent.model
  }
}
