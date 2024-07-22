import { ArrayEvent } from '@/typings'

export interface ArrayEventHandler<TModel extends object> {
  (event: ArrayEvent<TModel>): void
}

export function observableArrayProxy<TModel extends any[]>(model: TModel) {
  const proxyHandler = new ObservableArrayProxyHandler<TModel>()
  const proxy = new Proxy(model, proxyHandler)

  return {
    proxy,
    register: (eventHandler: ArrayEventHandler<TModel>) => proxyHandler.register(eventHandler),
    unregister: (id: number) => proxyHandler.unregister(id)
  }
}

class ObservableArrayProxyHandler<TModel extends object> {
  private readonly _eventHandlers = new Map<number, (event: ArrayEvent<TModel>) => void>()
  private _nextId = 0

  set(target: TModel[], prop: string | symbol, value: any, receiver: any) {
    const result = Reflect.set(target, prop, value, receiver)

    if (prop === 'length' && value === 0) {
      this.clear(target)
    }

    return result
  }

  get(target: TModel, prop: string | symbol, receiver: any) {
    return prop === 'push' ||
      prop === 'pop' ||
      prop === 'shift' ||
      prop === 'unshift' ||
      prop === 'splice'
      ? this[prop] ?? Reflect.get(target, prop, receiver)
      : Reflect.get(target, prop, receiver)
  }

  register(eventHandler: ArrayEventHandler<TModel>): number {
    this._eventHandlers.set(++this._nextId, eventHandler)
    return this._nextId
  }

  unregister(id: number) {
    this._eventHandlers.delete(id)
  }

  private clear(array: TModel[]) {
    const items = [...array]
    Reflect.get(array, 'splice').apply(array, [0, array.length])
    this.fire({ action: 'remove', oldValue: items })
  }

  private push(array: TModel[], ...items: TModel[]) {
    const result = Reflect.get(array, 'push').apply(array, items)
    this.fire({ action: 'append', newValue: items })
    return result
  }

  private pop(array: TModel[]) {
    const item = Reflect.get(array, 'pop').apply(array)
    if (item !== undefined) {
      this.fire({ action: 'remove', oldValue: [item] })
    }
  }

  private shift(array: TModel[]) {
    const item = Reflect.get(array, 'shift').apply(array)
    if (item !== undefined) {
      this.fire({ action: 'remove', oldValue: [item] })
    }
  }

  private unshift(array: TModel[], ...items: TModel[]) {
    const result = Reflect.get(array, 'unshift').apply(array, items)
    this.fire({ action: 'insert', newValue: items })
    return result
  }

  private splice(array: TModel[], start: number, deleteCount: number, ...items: TModel[]) {
    const deletedItems = Reflect.get(array, 'splice').apply(array, [start, deleteCount, ...items])
    this.fire({ action: 'replace', oldValue: deletedItems, newValue: items })
    return deletedItems
  }

  private fire(event: ArrayEvent<TModel>) {
    for (const eventHandler of this._eventHandlers.values()) {
      eventHandler(event)
    }
  }
}
