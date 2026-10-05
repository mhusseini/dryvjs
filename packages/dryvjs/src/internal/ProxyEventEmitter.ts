/**
 * Generic typed event emitter base class used by observable proxy handlers.
 * Supports multiple concurrent handlers identified by numeric IDs.
 *
 * @typeParam TEvent - The event payload type.
 */
export class ProxyEventEmitter<TEvent> {
  private readonly handlers = new Map<number, (e: TEvent) => void>()
  private nextId = 0

  /**
   * Registers an event handler.
   * @param handler - Callback invoked when an event fires.
   * @returns A numeric ID that can be passed to {@link unregister} to remove the handler.
   */
  register(handler: (e: TEvent) => void): number {
    this.handlers.set(++this.nextId, handler)
    return this.nextId
  }

  /**
   * Removes a previously registered handler.
   * @param id - The ID returned by {@link register}.
   */
  unregister(id: number): void {
    this.handlers.delete(id)
  }

  /**
   * Dispatches an event to all registered handlers.
   * @param event - The event payload.
   */
  protected fire(event: TEvent): void {
    for (const handler of this.handlers.values()) {
      handler(event)
    }
  }
}
