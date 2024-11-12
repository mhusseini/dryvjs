import { createValidator, DryvValidationResult, DryvValidationSession, FieldEvent } from './'
import { DryvOptions, DryvValidatableObject } from './'
import { DryvValidator } from './DryvValidator'
import { annotateValidator, dryvValidatableObject, observableProxy } from '@/internal'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'

export class DryvObjectValidator<TModel extends object = any> extends DryvCompositeValidator<
  TModel,
  DryvValidatableObject<TModel>
> {
  private _unregister?: () => void
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }
  proxy: TModel

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, any>,
    parent: DryvCompositeValidator | undefined,
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

    Object.values(this.fields).forEach((field) => field?.destroy())

    for (const field in model) {
      this.fields[field] = createValidator(
        this,
        proxy[field],
        proxy,
        field,
        this.session,
        this.options
      )
    }

    const eventId = register((event: FieldEvent<TModel>) => {
      let validator = this.fields[event.field]

      if (validator === undefined) {
        validator = createValidator(
          this,
          event.newValue,
          proxy,
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

    this._unregister = () => unregister(eventId)
    annotateValidator(this, this.session.ruleSet)

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
    if (this._unregister) {
      this._unregister()
    }
  }
}
