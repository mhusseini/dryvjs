import { ArrayEvent, createValidator, DryvValidationResult } from './'
import { DryvOptions, DryvValidatableObject } from './'
import { type DryvValidator } from './DryvValidator'
import { DryvValidationSession } from './DryvValidationSession'
import { dryvValidatableArray, dryvValidatableObject } from '@/internal'
import { observableArrayProxy } from '@/internal/observableArrayProxy'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'

export class DryvArrayValidator<TModel extends object = any> extends DryvCompositeValidator<
  any,
  TModel[]
> {
  private _unregisterArray?: () => void
  private readonly _items: DryvValidator[]
  proxy: TModel[]

  constructor(
    model: TModel[],
    session: DryvValidationSession,
    parent: DryvCompositeValidator | undefined,
    options: DryvOptions,
    field?: keyof any
  ) {
    super(model, session, parent, options, field)
    this._items = options.reactiveWrapper([])
    this.transparentProxy = dryvValidatableArray(this._items)
    this.proxy = this.updateArray(model)
  }

  private updateArray(model: TModel[]): TModel[] {
    if (this._unregisterArray) {
      this._unregisterArray()
    }
    const { proxy, register, unregister } = observableArrayProxy(model)
    this.proxy = proxy
    this.model = model
    this._items.length = 0

    for (const item of model) {
      const validator = this.createValidator(item)
      if (validator) {
        this._items.push(validator)
      }
    }

    const eventId = register((event: ArrayEvent<TModel>) => this.onArrayEvent(event))
    this._unregisterArray = () => unregister(eventId)

    return this.proxy
  }

  private onArrayEvent(event: ArrayEvent<TModel>) {
    switch (event.action) {
      case 'insert':
        for (const item of event.newValue ?? []) {
          const validator = this.createValidator(item)
          if (validator) {
            this._items.unshift(validator)
          }
        }
        break
      case 'append':
        for (const item of event.newValue ?? []) {
          const validator = this.createValidator(item)
          if (validator) {
            this._items.push(validator)
          }
        }
        break
      case 'replace':
        for (const item of event.newValue ?? []) {
          const index = this._items.findIndex((i) => i.model === item)
          if (index >= 0) {
            const validator = this.createValidator(item)
            if (!validator) {
              throw new Error('Could not create a validator to replace the item in the array.')
            }

            this._items[index] = validator
          }
        }
        break
      case 'remove':
        for (const item of event.oldValue ?? []) {
          const index = this._items.findIndex((i) => i.model === item)
          if (index >= 0) {
            this._items.splice(index, 1)
          }
        }
        break
    }

    if (this.isReverting) {
      return
    }

    for (const validator of this._items) {
      validator.refreshDirty()
      validator.validate()
    }
  }

  override get value(): TModel[] {
    return this.proxy
  }

  override set value(value: TModel[]) {
    this.updateArray(value)
  }

  override childValidators(): DryvValidator[] {
    return this._items
  }

  async validate(): Promise<DryvValidationResult> {
    return this.session.validateObject(this)
  }

  destroy() {
    if (this._unregisterArray) {
      this._unregisterArray()
    }
  }

  private createValidator(item: TModel) {
    return createValidator<TModel>(this, item, undefined, this.field, this.session, this.options)
  }
}
