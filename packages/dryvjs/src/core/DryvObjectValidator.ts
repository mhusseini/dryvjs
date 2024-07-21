import type { DryvValidationResult, DryvValidationSession, FieldEvent } from '@/core'
import { DryvFieldValidator, DryvOptions } from '@/core'
import { DryvValidator } from '@/core/DryvValidator'
import { dryvObjectValidatorTransparentProxy } from '@/core/dryvObjectValidatorTransparentProxy'
import { observableProxy } from '@/core/ObservableProxy'

export class DryvObjectValidator<TModel extends object, TParameters = object> extends DryvValidator<
  TModel,
  TParameters
> {
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }
  private unregister?: () => void
  proxy: TModel
  readonly transparentProxy: DryvObjectValidator<TModel, TParameters>

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, TParameters>,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this.fields = {}
    this.transparentProxy = dryvObjectValidatorTransparentProxy(this)
    this.proxy = this.updateModel(model)
  }

  private updateModel(model: TModel): TModel {
    if (this.unregister) {
      this.unregister()
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

    this.unregister = () => unregister(evendId)

    return this.proxy
  }

  override get value(): any {
    return this.fields
  }

  override set value(value: any) {
    this.updateModel(value)
  }

  override childValidators(): DryvValidator[] {
    return Object.values(this.fields).filter((f) => !!f) as DryvValidator[]
  }

  async validate(): Promise<DryvValidationResult> {
    return this.session.validateObject(this)
  }

  destroy() {
    if (this.unregister) {
      this.unregister()
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
