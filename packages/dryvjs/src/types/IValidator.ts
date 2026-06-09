import type { DryvValidationResult } from './results'

/**
 * Core validator contract used by cross-cutting modules (session, result builders,
 * rule execution). Decouples these modules from the concrete `DryvValidator` class,
 * eliminating circular imports through the barrel.
 */
export interface IValidator<TModel extends object = any> {
  /** Dot-notation path used for rule lookup (e.g. `"address.city"`). */
  readonly path: string | null
  /** Unique path including array indices for deduplication. */
  readonly uniquePath: string
  /** The model property key this validator represents, or `undefined` for the root. */
  readonly field: keyof TModel | undefined
  /** The top-level model object at the root of the validator tree. */
  readonly rootModel: TModel
  /** The root validator node of the tree. */
  readonly rootValidator: IValidator<TModel>
  /** The model object this validator is bound to. */
  readonly model: TModel
  /** The parent validator in the tree, or `null`/`undefined` for the root. */
  readonly parent: IValidator | null | undefined

  /** Current validation result type (`'error'`, `'warning'`, `'success'`), or `null`. */
  type: string | null
  /** Current validation message text, or `null` if no message. */
  text: string | null
  /** Validation group this field belongs to, or `null`. */
  group: string | null

  /** Resets the validation state of this node and all descendants. */
  clear(): void
  /** Returns the direct child validators of this node. */
  childValidators(): IValidator[]
  /** Runs validation for this node and returns the aggregated result. */
  validate(): Promise<DryvValidationResult>
}
