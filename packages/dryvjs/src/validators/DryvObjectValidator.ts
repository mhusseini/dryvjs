import type { DryvOptions, DryvValidatableObject, DryvValidationResult, FieldEvent } from '@/types'
import { DryvValidator } from './DryvValidator'
import { DryvValidationSession } from '@/session/DryvValidationSession'
import { manageChildValidators } from './childValidatorManager'
import { createObjectFacade, createObservableProxy, createProxyLifecycle } from '@/internal'
import { DryvCompositeValidator } from './DryvCompositeValidator'

/**
 * Composite validator for nested objects.
 * Creates Layer 1 and Layer 2 proxies, maintains a field map of child validators,
 * and delegates child lifecycle management to `manageChildValidators()`.
 *
 * @typeParam TModel - The model type.
 */
export class DryvObjectValidator<TModel extends object = any> extends DryvCompositeValidator<TModel, TModel, FieldEvent<TModel>> {
  /** Map of field names to their child validators (or `null` for skipped fields). */
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel>,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this.fields = {}
    this.facadeProxy = this.createFacade()
    this.proxy = this.updateModel(this.model)
  }

  protected override createFacade(): DryvValidatableObject<TModel> {
    return createObjectFacade(this) as DryvValidatableObject<TModel>
  }

  protected override initChildValidators(): void {
    manageChildValidators(this, this.lifecycle!, this.session, this.options)
  }

  private updateModel(model: TModel): TModel {
    this.replaceProxy(() => createProxyLifecycle<TModel, FieldEvent<TModel>>(createObservableProxy(model)))
    this.model = model

    this.initChildValidators()

    return this.proxy
  }

  override get value(): TModel {
    return this.proxy
  }

  override set value(value: TModel) {
    this.updateModel(value)
  }

  override childValidators(): DryvValidator[] {
    return Object.values(this.fields).filter((f) => !!f) as DryvValidator[]
  }

  async validate(): Promise<DryvValidationResult> {
    return this.session.validateObject(this)
  }
}
