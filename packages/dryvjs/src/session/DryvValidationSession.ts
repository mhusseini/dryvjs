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
import { successResult, aggregateFieldResults, buildFieldResult } from './validationResults'
import { DryvRuleContext } from './DryvRuleContext'
import { getValidationTriggerPolicy, type ValidationTriggerPolicy } from './validationTriggerPolicy'

/**
 * Orchestrates validation across a validator tree.
 * Holds the rule set, manages validation chains, tracks per-field/per-group
 * results, and enforces the configured validation trigger policy.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 */
export class DryvValidationSession<TModel extends object = any, TParameters = any> {
  private _depth = 0
  private _isTriggered = false
  private _processedFields: { [field: string | symbol]: boolean } | undefined = undefined
  private previousWarningHash: string | null | undefined
  private readonly triggerPolicy: ValidationTriggerPolicy
  readonly ruleContext: DryvRuleContext<TModel, TParameters>

  /** Reactive per-field and per-group validation results, updated after each validation pass. */
  readonly results: {
    fields: Record<string, DryvFieldValidationResult | undefined>
    groups: Record<string, DryvFieldValidationResult | undefined>
  }

  constructor(
    private options: DryvOptions,
    public ruleSet: DryvValidationRuleSet<TModel, TParameters>
  ) {
    this.results = options.reactiveWrapper!({
      fields: {},
      groups: {}
    })
    this.ruleContext = new DryvRuleContext(options, ruleSet)
    this.triggerPolicy = getValidationTriggerPolicy(options.validationTrigger)
  }

  /**
   * Post-processes a rule's result via the configured `handleResult` option.
   */
  handleResult(
    session: DryvValidationSession<TModel>,
    $m: TModel,
    field: keyof TModel | string,
    rule: DryvValidationRule<TModel> | undefined | null,
    result: any
  ): Promise<any> {
    return this.options.handleResult!(session, $m, field as keyof TModel, rule!, result)
  }

  /** `true` while a validation pass is in progress. */
  get isValidating() {
    return this._depth > 0
  }

  /** Resets the triggered state and warning hash for a fresh validation cycle. */
  reset() {
    this._isTriggered = false
    this.previousWarningHash = undefined
  }

  /**
   * Validates the given object validator and all its children in parallel.
   * @param objectValidator - The object validator to validate.
   * @returns The aggregated validation result.
   */
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

  /**
   * Validates a single field, running disablers first then validators.
   * Updates the field's reactive state and records the result.
   * @param field - The field validator to validate.
   * @param model - The model instance (resolved from the tree root if omitted).
   * @returns The field-level validation result.
   */
  async validateField(field: IValidator<TModel>, model?: TModel): Promise<DryvValidationResult> {
    if (!this.canValidateFields() || this._processedFields?.[field.uniquePath!]) {
      return successResult(field.path!)
    }

    if (!model) {
      model = this.getModel(field)
    }

    const newValidationChain = this.startValidationChain()
    const fieldResult = await this.validateFieldInternal(model!, field)

    field.type = fieldResult?.type ?? 'success'
    field.text = fieldResult?.text ?? null
    field.group = fieldResult?.group ?? null

    const result = buildFieldResult(fieldResult, field.path!)

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
    return this.triggerPolicy.canValidate(this.isValidating, this._isTriggered)
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

  private runDisablers(model: TModel, field: keyof TModel | string): Promise<boolean> {
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
