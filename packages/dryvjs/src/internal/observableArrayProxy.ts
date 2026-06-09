import type { ArrayEvent } from '@/types'
import { ProxyEventEmitter } from './ProxyEventEmitter'

export interface ArrayEventHandler<TModel> {
  (event: ArrayEvent<TModel>): void
}

/**
 * **Proxy Layer 1 — Change Detection (Observable Array Proxy)**
 *
 * Wraps a model array in a Proxy that intercepts mutating methods
 * (`push`, `splice`, `unshift`, index assignment) and emits `ArrayEvent`s
 * to registered handlers.
 *
 * Consumed by `DryvArrayValidator` to detect array mutations, triggering
 * child validator creation/destruction and re-validation.
 *
 * @see createObservableProxy     — analogous layer for object mutations
 * @see createArrayFacade   — Layer 2 (developer-facing facade for arrays)
 */
export function createObservableArrayProxy<TModel>(model: TModel[]) {
  const proxyHandler = new ObservableArrayProxyHandler<TModel>(model)
  const proxy = new Proxy(model, proxyHandler)

  return {
    proxy,
    register: (eventHandler: ArrayEventHandler<TModel>) => proxyHandler.register(eventHandler),
    unregister: (id: number) => proxyHandler.unregister(id)
  }
}

class ObservableArrayProxyHandler<TModel> extends ProxyEventEmitter<ArrayEvent<TModel>> {
  constructor(private array: TModel[]) {
    super()
  }

  set(target: TModel[], prop: string | symbol, value: any, receiver: any) {
    const result = Reflect.set(target, prop, value, receiver)

    if (prop === 'length' && value === 0) {
      this.clear()
    }

    return result
  }

  get(target: TModel[], prop: string | symbol, receiver: any) {
    return prop === 'push' ||
      prop === 'pop' ||
      prop === 'shift' ||
      prop === 'unshift' ||
      prop === 'splice'
      ? this[prop]?.bind(this) ?? Reflect.get(target, prop, receiver)
      : Reflect.get(target, prop, receiver)
  }

  private clear() {
    const array = this.array
    const items = [...array]
    array.splice(0, array.length)
    this.fire({ action: 'remove', oldValue: items })
  }

  private push(...items: TModel[]) {
    const result = this.array.push(...items)
    this.fire({ action: 'append', newValue: items })
    return result
  }

  private pop() {
    const item = this.array.pop()
    if (item !== undefined) {
      this.fire({ action: 'remove', oldValue: [item] })
    }
  }

  private shift() {
    const item = this.array.shift()
    if (item !== undefined) {
      this.fire({ action: 'remove', oldValue: [item] })
    }
  }

  private unshift(...items: TModel[]) {
    const result = this.array.unshift(...items)
    this.fire({ action: 'insert', newValue: items })
    return result
  }

  private splice(start: number, deleteCount: number, ...items: TModel[]) {
    const deletedItems = this.array.splice(start, deleteCount, ...items)
    this.fire({ action: 'replace', oldValue: deletedItems, newValue: items })
    return deletedItems
  }
}
