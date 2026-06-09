import type { DryvOptions, DryvValidationResult } from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { DryvValidator } from './DryvValidator'

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

    this.isDirty = !!v !== !!iv || v !== iv

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }

  override revert() {
    this.value = this._initialValue
    super.revert()
  }

  override commit() {
    this._initialValue = this.value
    super.commit()
  }

  override childValidators(): DryvValidator[] {
    return []
  }

  override async validate(): Promise<DryvValidationResult> {
    return this.session.validateField(this, this.rootModel)
  }
}
