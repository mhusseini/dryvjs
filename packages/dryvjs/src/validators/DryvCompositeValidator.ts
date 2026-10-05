import type { DryvOptions } from '@/types'
import type { ProxyLifecycle } from '@/internal'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { DryvValidator } from './DryvValidator'

/**
 * Abstract base class for validators that own a proxy lifecycle (object and array validators).
 * Provides proxy replacement, lifecycle management, and template methods for
 * facade creation and child validator initialization.
 *
 * @typeParam TModel - The model type.
 * @typeParam TProxy - The observable proxy type.
 * @typeParam TEvent - The event type emitted by the proxy.
 */
export abstract class DryvCompositeValidator<
  TModel extends object,
  TProxy,
  TEvent
> extends DryvValidator<TModel, TProxy> {
  /** The current proxy lifecycle instance, if any. */
  protected lifecycle?: ProxyLifecycle<TProxy, TEvent>
  /** The current Layer 1 observable proxy. */
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

  /**
   * Destroys the current lifecycle and creates a new one from the given factory.
   * @param factory - A function that creates a new proxy lifecycle.
   * @returns The new observable proxy.
   */
  protected replaceProxy(factory: () => ProxyLifecycle<TProxy, TEvent>): TProxy {
    this.lifecycle?.destroy()
    this.lifecycle = factory()
    this.proxy = this.lifecycle.proxy
    return this.proxy
  }

  /**
   * Template method: subclasses create their specific facade (object or array).
   */
  protected abstract createFacade(): unknown

  /**
   * Template method: subclasses initialize their child validator tracking.
   */
  protected abstract initChildValidators(): void

  override onDestroy() {
    this.lifecycle?.destroy()
  }
}
