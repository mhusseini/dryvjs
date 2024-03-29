import { defaultDryvOptions } from '../core'

export interface DryvTransactionOptions {
  objectWrapper?<TObject>(object: TObject): TObject

  changeHook?(model: any, field: string, newValue: any, oldValue: any): void
}

export interface DryTransaction<TModel extends object = any> {
  rollback: () => void
  commit: () => void
  model: TModel
  dirty: () => boolean
}

export function dryvTransaction<TModel extends object>(
  model: TModel,
  options?: DryvTransactionOptions
): DryTransaction<TModel> {
  options = Object.assign({}, defaultDryvOptions, options)

  const handlers: DryvTransactionProxyHandler[] = options.objectWrapper!([])
  const proxy = new Proxy(model, new DryvTransactionProxyHandler(model, options, handlers))

  return {
    commit() {
      handlers.forEach((handler) => handler.commit())
    },
    rollback() {
      handlers.forEach((handler) => handler.rollback())
    },
    model: proxy,
    dirty() {
      return handlers.some((handler) => handler.dirty.value)
    }
  }
}

export function isDryvTransaction(obj: any): boolean {
  return obj && obj[DryvTransactionProxyHandler.isTransactionProp]
}

class DryvTransactionProxyHandler<TModel extends object = {}> {
  static isTransactionProp = '____trans'
  private dirtyFields: { [field: string]: boolean } = {}
  private originalValues: TModel
  private originalKeys: { [p: string]: boolean }
  private values: { [p: string | symbol]: boolean }

  dirty: { value: boolean }

  constructor(
    public model: TModel,
    private options: DryvTransactionOptions,
    private handlers: DryvTransactionProxyHandler[]
  ) {
    handlers.push(this)
    this.dirty = this.options.objectWrapper!({ value: false })
    this.originalValues = { ...model }
    this.originalKeys = Object.keys(model).reduce(
      (acc, key) => {
        acc[key] = true
        return acc
      },
      {} as { [key: string]: boolean }
    )

    const values = Object.keys(model).reduce(
      (acc, key) => {
        const value = model[key as keyof TModel]
        acc[key] =
          !!value && typeof value === 'object' && !Array.isArray(value)
            ? new Proxy(
                value,
                new DryvTransactionProxyHandler(value as any, this.options, this.handlers)
              )
            : value
        return acc
      },
      {} as { [key: string]: boolean }
    )
    this.values = this.options.objectWrapper!(values)
  }

  get(target: any, prop: string | symbol, receiver: any) {
    return prop === DryvTransactionProxyHandler.isTransactionProp
      ? true
      : this.values[prop] ?? Reflect.get(target, prop, receiver)
  }

  set(target: any, prop: string | symbol, value: any) {
    const field = prop as keyof TModel
    const isTransaction = isDryvTransaction(value)
    const isObject = !!value && typeof value === 'object'
    if (isObject && !isTransaction && !Array.isArray(value)) {
      value = new Proxy(value, new DryvTransactionProxyHandler(value, this.options, this.handlers))
    }

    const oldValue = this.values[field]
    this.values[field] = value

    if (!isObject) {
      this.dirtyFields[String(prop)] = value !== this.originalValues[field]
      this.dirty.value = Object.values(this.dirtyFields).find((x) => x) ?? false

      this.options.changeHook?.(this.model, field as string, value, oldValue)
    }

    return true
  }

  commit() {
    Object.assign(this.model, this.values)
    this.dirtyFields = {}
    this.dirty.value = false
  }

  rollback() {
    Object.assign(this.values, this.model)
    Object.keys(this.values)
      .filter((key) => !this.originalKeys[key])
      .forEach((key) => ((this.values as any)[key] = undefined))
    this.dirtyFields = {}
    this.dirty.value = false
  }
}
