import type { ArrayEvent, DryvValidatableArray, DryvValidationResult, DryvOptions } from '@/types'
import { DryvValidator } from './DryvValidator'
import { DryvValidationSession } from '@/session/DryvValidationSession'
import { createChildValidator } from './createValidator'
import { createArrayFacade, createObservableArrayProxy, SpecialTypeWrapper, createProxyLifecycle } from '@/internal'
import { DryvCompositeValidator } from './DryvCompositeValidator'

/**
 * Composite validator for arrays.
 * Creates Layer 1 and Layer 2 proxies, maintains a reactive list of child validators
 * (one per array element), and handles `ArrayEvent`s to add/remove/replace children.
 *
 * @typeParam TModel - The element type of the array.
 */
export class DryvArrayValidator<TModel = any> extends DryvCompositeValidator<any, TModel[], ArrayEvent<TModel>> {
  private readonly _items: DryvValidator[]

  constructor(
    model: TModel[],
    session: DryvValidationSession,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: PropertyKey
  ) {
    super(model, session, parent, options, field)
    this._items = options.reactiveWrapper([])
    this.facadeProxy = this.createFacade()
    this.proxy = this.updateArray(model, true)
  }

  protected override createFacade(): DryvValidatableArray<TModel> {
    return createArrayFacade<TModel>(this) as DryvValidatableArray<TModel>
  }

  protected override initChildValidators(): void {
    this.lifecycle!.register((event: ArrayEvent<TModel>) => this.onArrayEvent(event))
  }

  protected override onParentChanged() {
    this.rootModel = null as unknown as any
  }

  private updateArray(model: TModel[], skipModelUpdate = false): TModel[] {
    this.replaceProxy(() => createProxyLifecycle<TModel[], ArrayEvent<TModel>>(
      createObservableArrayProxy<TModel>(SpecialTypeWrapper.wrap(model))
    ))
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

    this.initChildValidators()

    return this.proxy
  }

  private onArrayEvent(event: ArrayEvent<TModel>) {
    const handler = this.actionHandlers[event.action]
    if (handler) {
      handler(event)
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

  private readonly actionHandlers: Record<string, (e: ArrayEvent<TModel>) => void> = {
    insert: (e) => this.addItems(e.newValue, 'unshift'),
    append: (e) => this.addItems(e.newValue, 'push'),
    remove: (e) => this.removeItems(e.oldValue),
    replace: (e) => this.replaceItems(e.newValue)
  }

  private addItems(items: TModel[] | undefined, method: 'push' | 'unshift') {
    for (const item of items ?? []) {
      const validator = this.createValidator(item)
      if (validator) {
        this._items[method](validator)
      }
    }
  }

  private removeItems(items: TModel[] | undefined) {
    for (const item of items ?? []) {
      const index = this._items.findIndex((i) => i.model === item)
      if (index >= 0) {
        this._items.splice(index, 1).forEach((i) => i.destroy())
      }
    }
  }

  private replaceItems(items: TModel[] | undefined) {
    for (const item of items ?? []) {
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

  private createValidator(item: TModel) {
    return createChildValidator<TModel>(this, item, undefined, undefined, this.session, this.options)
  }

  private updateItemIndexes() {
    for (let i = 0; i < this._items.length; i++) {
      this._items[i].index = i
    }
  }
}
