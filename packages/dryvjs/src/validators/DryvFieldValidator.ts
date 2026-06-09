import type { DryvOptions, DryvValidationResult } from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { DryvValidator } from './DryvValidator'

/**
 * Leaf validator representing a single scalar field on the model.
 * Reads/writes directly to `model[field]` through the Layer 1 observable proxy.
 * Tracks an initial value for dirty detection and revert.
 *
 * @typeParam TModel - The model type.
 */
export class DryvFieldValidator<TModel extends object> extends DryvValidator<
  TModel,
  TModel[keyof TModel]
> {
  private _initialValue: TModel[keyof TModel]

  constructor(
    model: TModel,
    session: DryvValidationSession,
    parent: DryvValidator,
    options: DryvOptions,
    field: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this._initialValue = model[field]
  }

  override get value(): any {
    return this.model[this.field!]
  }

  override set value(value: any) {
    this.model[this.field!] = value
  }

  override refreshDirty() {
    const wasDirty = this.isDirty
    const v = this.value
    const iv = this._initialValue

    this.markDirty(!!v !== !!iv || v !== iv)

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }

  protected override performRevert() {
    this.value = this._initialValue
    super.performRevert()
  }

  protected override performCommit() {
    this._initialValue = this.value
    super.performCommit()
  }

  override childValidators(): DryvValidator[] {
    return []
  }

  override async validate(): Promise<DryvValidationResult> {
    return this.session.validateField(this, this.rootModel)
  }
}
