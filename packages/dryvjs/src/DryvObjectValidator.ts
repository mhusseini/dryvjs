import type { DryvValidationResult, DryvValidationSession, FieldEvent } from './'
import { DryvFieldValidator, DryvOptions, DryvValidatableObject } from './'
import { DryvValidator } from './DryvValidator'
import { dryvValidatableObject, observableProxy } from '@/internal'

export class DryvObjectValidator<TModel extends object = any> extends DryvValidator<
  TModel,
  TModel,
  DryvObjectValidator
> {
  private _ignoreChildChanges = false
  private _unregister?: () => void
  readonly fields: { [field: string | symbol | number]: DryvValidator | null }
  proxy: TModel
  readonly transparentProxy: DryvValidatableObject<TModel>
  private _isReverting = false

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, any>,
    parent: DryvObjectValidator | undefined,
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
      let validator = this.fields[event.field]

      if (validator === undefined) {
        validator = this.createValidator(event.field, event.newValue)
        this.fields[event.field] = validator
      }

      if (this._isReverting || validator === null) {
        return
      }

      validator?.refreshDirty()
      validator?.validate()
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

  override revert() {
    try {
      this._isReverting = true
      super.revert()
    } finally {
      this._isReverting = false
    }
  }

  async validate(): Promise<DryvValidationResult> {
    return this.session.validateObject(this)
  }

  destroy() {
    if (this._unregister) {
      this._unregister()
    }
  }

  refreshDirty() {
    if (this._ignoreChildChanges) {
      return
    }

    const wasDirty = this.isDirty
    this.isDirty = Object.values(this.fields).some((f) => f?.isDirty)

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
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
