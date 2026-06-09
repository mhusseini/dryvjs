import type { ArrayEvent, DryvValidatableArray, DryvValidationResult, DryvOptions } from '@/types'
import { DryvValidator } from './DryvValidator'
import { DryvValidationSession } from '@/session/DryvValidationSession'
import { createChildValidator } from './createValidator'
import { createArrayFacade, observableArrayProxy, SpecialTypeWrapper, createProxyLifecycle, type ProxyLifecycle } from '@/internal'

export class DryvArrayValidator<TModel = any> extends DryvValidator<any, TModel[]> {
  private _lifecycle?: ProxyLifecycle<TModel[], ArrayEvent<TModel>>
  private readonly _items: DryvValidator[]
  proxy: TModel[]

  constructor(
    model: TModel[],
    session: DryvValidationSession,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof any
  ) {
    super(model, session, parent, options, field)
    this._items = options.reactiveWrapper([])
    this.facadeProxy = createArrayFacade<TModel>(this) as DryvValidatableArray<TModel>
    this.proxy = this.updateArray(model, true)
  }

  protected override onParentChanged() {
    this.rootModel = null
  }

  private updateArray(model: TModel[], skipModelUpdate = false): TModel[] {
    this._lifecycle?.destroy()

    const lifecycle = createProxyLifecycle<TModel[], ArrayEvent<TModel>>(
      observableArrayProxy<TModel>(SpecialTypeWrapper.wrap(model))
    )
    this._lifecycle = lifecycle
    this.proxy = lifecycle.proxy
    this._items.length = 0
    if (!skipModelUpdate) {
      this.model.length = 0
    }

    for (let i = 0; i < model.length; i++) {
      const item = model[i]
      const validator = this.createValidator(item)

      if (!skipModelUpdate) {
        this.model.push(item)
      }

      if (validator) {
        validator.index = i
        this._items.push(validator)
      }
    }

    lifecycle.register((event: ArrayEvent<TModel>) => this.onArrayEvent(event))

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

            this._items[index]?.destroy()
            this._items[index] = validator
          }
        }
        break
      case 'remove':
        for (const item of event.oldValue ?? []) {
          const index = this._items.findIndex((i) => i.model === item)
          if (index >= 0) {
            this._items.splice(index, 1).forEach((i) => i.destroy())
          }
        }
        break
    }

    this.updateItemIndexes()

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

  override onDestroy() {
    this._lifecycle?.destroy()
  }

  private createValidator(item: TModel) {
    return createChildValidator<TModel>(this, item, undefined, undefined, this.session, this.options)
  }

  private updateItemIndexes() {
    for (let i = 0; i < this._items.length; i++) {
      this._items[i].index = i
    }
  }
}
