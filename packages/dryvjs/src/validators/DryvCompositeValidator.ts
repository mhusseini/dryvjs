import type { DryvOptions } from '@/types'
import type { ProxyLifecycle } from '@/internal'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { DryvValidator } from './DryvValidator'

export abstract class DryvCompositeValidator<
  TModel extends object,
  TProxy,
  TEvent
> extends DryvValidator<TModel, TProxy> {
  protected lifecycle?: ProxyLifecycle<TProxy, TEvent>
  proxy!: TProxy

  protected constructor(
    model: TModel,
    session: DryvValidationSession<TModel>,
    parent: DryvValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
  }

  protected replaceProxy(factory: () => ProxyLifecycle<TProxy, TEvent>): TProxy {
    this.lifecycle?.destroy()
    this.lifecycle = factory()
    this.proxy = this.lifecycle.proxy
    return this.proxy
  }

  override onDestroy() {
    this.lifecycle?.destroy()
  }
}
