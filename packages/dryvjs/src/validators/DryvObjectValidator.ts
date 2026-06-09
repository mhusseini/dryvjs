import type { DryvOptions, DryvValidatableObject, DryvValidationResult, FieldEvent } from '@/types'
import { DryvValidator } from './DryvValidator'
import { DryvValidationSession } from '@/session/DryvValidationSession'
import { createValidator } from './createValidator'
import { createObjectFacade, createObservableProxy, createProxyLifecycle, type ProxyLifecycle } from '@/internal'

export class DryvObjectValidator<TModel extends object = any> extends DryvValidator<TModel, TModel> {
  private _lifecycle?: ProxyLifecycle<TModel, FieldEvent<TModel>>
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }
  proxy: TModel

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel>,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this.fields = {}
    this.facadeProxy = createObjectFacade(this) as DryvValidatableObject<TModel>
    this.proxy = this.updateModel(this.model)
  }

  private updateModel(model: TModel): TModel {
    this._lifecycle?.destroy()

    const lifecycle = createProxyLifecycle<TModel, FieldEvent<TModel>>(createObservableProxy(model))
    this._lifecycle = lifecycle
    this.proxy = lifecycle.proxy
    this.model = model

    Object.values(this.fields).forEach((field) => field?.destroy())

    for (const field in model) {
      this.fields[field] = createValidator(
        this,
        lifecycle.proxy[field],
        lifecycle.proxy,
        field,
        this.session,
        this.options
      )
    }

    lifecycle.register((event: FieldEvent<TModel>) => {
      let validator = this.fields[event.field]

      if (
        validator === undefined ||
        (validator instanceof DryvObjectValidator && validator.value !== event.newValue)
      ) {
        validator?.destroy()
        validator = createValidator(
          this,
          event.newValue,
          lifecycle.proxy,
          event.field,
          this.session,
          this.options
        )
        this.fields[event.field] = validator
      }

      if (this.isReverting || validator === null) {
        return
      }

      validator?.refreshDirty()
      validator?.validate()
    })

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

  override onDestroy() {
    this._lifecycle?.destroy()
  }
}
