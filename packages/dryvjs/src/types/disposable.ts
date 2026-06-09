/**
 * Explicit disposal contract for validator resources.
 * Enables TC39 Explicit Resource Management (`using` declarations).
 */
export interface IDisposable {
  /** Releases all resources held by this instance. */
  dispose(): void
}
