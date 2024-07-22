import type { DryvValidationResult, DryvValidationSession, FieldEvent } from '@/core'
import { DryvFieldValidator, DryvOptions, DryvValidatableObject } from '@/core'
import { DryvValidator } from '@/core/DryvValidator'
import { dryvValidatableObject } from '@/core/dryvValidatableObject'
import { observableProxy } from '@/core/observableProxy'

export class DryvObjectValidator<TModel extends object> extends DryvValidator<TModel, TModel> {
  private _unregister?: () => void
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }
  proxy: TModel
  readonly transparentProxy: DryvValidatableObject<TModel>

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, any>,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this.fields = {}
    this.transparentProxy = dryvValidatableObject(this)
    this.proxy = this.updateModel(model)
  }

  private updateModel(model: TModel): TModel {
    if (this._unregister) {
      this._unregister()
    }
    const { proxy, register, unregister } = observableProxy(model)
    this.proxy = proxy
    this.model = model

    for (const field in model) {
      this.fields[field] = this.createValidator(field, model[field])
    }

    const evendId = register((event: FieldEvent<TModel>) => {
      if (this.fields[event.field]) {
        return
      }
      this.fields[event.field] = this.createValidator(event.field, event.newValue)
    })

    this._unregister = () => unregister(evendId)

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

  destroy() {
    if (this._unregister) {
      this._unregister()
    }
  }

  private createValidator(field: keyof TModel, newValue: any): DryvValidator | null {
    if (Array.isArray(newValue)) {
      throw new Error('Arrays are not supported, yet.')
    }

    const type = typeof newValue
    if (type === 'function') {
      return null
    }

    if (newValue instanceof Object) {
      return new DryvObjectValidator(newValue, this.session, this, this.options, field)
    }

    return new DryvFieldValidator(this.proxy!, this.session, this, this.options, field)
  }
}
