import type { DryvValidationResultType } from './rules'

/**
 * Reactive state held by every validator node.
 * Wrapped via `options.reactiveWrapper` for framework integration (e.g. Vue `reactive()`).
 */
export interface DryvReactiveState {
  /** Dot-notation path used for rule lookup (e.g. `"address.city"`). */
  path: string | null
  /** Unique path including array indices for deduplication (e.g. `"items.0.name"`). */
  uniquePath: string | null
  /** Current validation message text, or `null` if no message. */
  text: string | null
  /** Validation group this field belongs to, or `null`. */
  group: string | null
  /** Whether the field is marked as required by rule annotations. */
  required: boolean | null
  /** Whether the validation group UI is currently shown. */
  groupShown: boolean
  /** Current validation result type (`'error'`, `'warning'`, `'success'`), or `null`. */
  type: DryvValidationResultType | null
  /** Whether the field value has changed from its initial value. */
  isDirty: boolean
}
