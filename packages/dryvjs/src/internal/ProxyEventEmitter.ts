export class ProxyEventEmitter<TEvent> {
  private readonly handlers = new Map<number, (e: TEvent) => void>()
  private nextId = 0

  register(handler: (e: TEvent) => void): number {
    this.handlers.set(++this.nextId, handler)
    return this.nextId
  }

  unregister(id: number): void {
    this.handlers.delete(id)
  }

  protected fire(event: TEvent): void {
    for (const handler of this.handlers.values()) {
      handler(event)
    }
  }
}
