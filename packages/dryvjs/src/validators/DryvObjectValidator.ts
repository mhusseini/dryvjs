import type { DryvOptions, DryvValidatableObject, DryvValidationResult, FieldEvent } from '@/types'
import { DryvValidator } from './DryvValidator'
import { DryvValidationSession } from '@/session/DryvValidationSession'
import { manageChildValidators } from './childValidatorManager'
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

    manageChildValidators(this, lifecycle, this.session, this.options, this.fields)

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
