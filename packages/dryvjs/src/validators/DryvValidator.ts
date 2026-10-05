import type {
  DryvOptions,
  DryvReactiveState,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidationResult,
  DryvValidationResultType,
  IDisposable,
  IValidator
} from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { serializeValidator } from './serializeValidator'
import { computeHierarchy } from './validatorTree'
import { resetValidatorState, walkValidatorTree } from './validatorLifecycle'
import { applyServerValidationResult } from './serverResultMapper'

/**
 * Abstract base class for all validator nodes in the validation tree.
 * Provides reactive state, tree traversal, lifecycle management, and
 * delegates to extracted helper modules for serialization, state reset,
 * hierarchy computation, and server result mapping.
 *
 * @typeParam TModel - The model type this validator is bound to.
 * @typeParam TValue - The value type this validator manages.
 */
export abstract class DryvValidator<
  TModel extends object = any,
  TValue = any
> implements IValidator<TModel>, IDisposable {
  /** Marker flag used by {@link getDryvValidator} to identify validator instances. */
  public readonly __dryvValidator = true
  /** The reactive state object holding all observable validation properties. */
  public readonly reactive: DryvReactiveState

  private _parent?: DryvValidator | null
  private _index?: number
  private _rootModel: TModel
  private _rootValidator: DryvValidator<TModel>
  private _isReverting = false
  private _facadeProxy?: unknown

  /** The array index of this validator (for array element validators). */
  get index(): number | undefined {
    return this._index
  }

  set index(value: number | undefined) {
    if (this._index === value) {
      return
    }
    this._index = value
    this.updateHierarchy(true)
  }

  /** Whether the field value has changed from its initial value. */
  get isDirty(): boolean {
    return this.reactive.isDirty
  }

  /** Sets the dirty flag on the reactive state. */
  protected markDirty(value: boolean) {
    this.reactive.isDirty = value
  }

  /** Current validation message text, or `null` if no message. */
  get text(): string | null {
    return this.reactive.text
  }

  set text(value: string | null) {
    this.reactive.text = value
  }

  /** Validation group this field belongs to, or `null`. */
  get group(): string | null {
    return this.reactive.group
  }

  set group(value: string | null) {
    this.reactive.group = value
  }

  /** Whether the field is marked as required by rule annotations. */
  get required(): boolean | null {
    return this.reactive.required
  }

  set required(value: boolean | null) {
    this.reactive.required = value
  }

  /** Whether the validation group UI is currently shown. */
  get groupShown(): boolean {
    return this.reactive.groupShown
  }

  set groupShown(value: boolean) {
    this.reactive.groupShown = value
  }

  /** Current validation result type (`'error'`, `'warning'`, `'success'`), or `null`. */
  get type(): DryvValidationResultType | null {
    return this.reactive.type
  }

  set type(value: DryvValidationResultType | null) {
    this.reactive.type = value
  }

  protected constructor(
    public model: TModel,
    protected session: DryvValidationSession<TModel>,
    parent: DryvValidator | undefined,
    protected options: DryvOptions,
    public readonly field: keyof TModel | undefined = undefined
  ) {
    this._rootModel = model
    this._rootValidator = this
    this.reactive = options.reactiveWrapper<DryvReactiveState>({
      path: null,
      uniquePath: null,
      text: null,
      group: null,
      required: null,
      groupShown: false,
      type: null,
      isDirty: false
    })
    this.attachToTree(parent)
  }

  /** The current value managed by this validator. */
  abstract get value(): TValue
  abstract set value(value: TValue)

  /** Runs validation for this node and returns the result. */
  abstract validate(): Promise<DryvValidationResult>

  /** Recalculates the dirty flag based on child validators and propagates changes up the tree. */
  refreshDirty() {
    const wasDirty = this.isDirty
    this.markDirty(this.childValidators().some((f) => f?.isDirty))

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }

  /** The Layer 2 facade proxy for this validator, set by subclasses. */
  get facadeProxy(): unknown {
    return this._facadeProxy
  }

  protected set facadeProxy(value: unknown) {
    this._facadeProxy = value
  }

  /** `true` while a revert operation is in progress. */
  get isReverting() {
    return this._isReverting
  }

  /** Reverts this node and all descendants to their initial values and clears validation state. */
  revert() {
    this._isReverting = true
    try {
      this.walkTree((v) => v.performRevert())
    } finally {
      this._isReverting = false
    }
  }

  /** Commits the current values as the new initial values for all descendants. */
  commit() {
    this.walkTree((v) => v.performCommit())
  }

  /** Resets validation state during a revert. Override in subclasses for value restoration. */
  protected performRevert() {
    this.resetState(true)
  }

  /** Resets validation state during a commit. Override in subclasses to snapshot current values. */
  protected performCommit() {
    this.resetState(true)
  }

  /** Returns the direct child validators of this node. */
  public abstract childValidators(): DryvValidator[]

  /** `true` if this validator's type is `'error'`. */
  get hasErrors(): boolean {
    return this.type?.toLowerCase() === 'error'
  }

  /** `true` if this validator's type is `'warning'`. */
  get hasWarnings(): boolean {
    return this.type?.toLowerCase() === 'warning'
  }

  /** `true` if this validator has no errors or warnings. */
  get isSuccess(): boolean {
    return !this.hasErrors && !this.hasWarnings
  }

  /** Dot-notation path used for rule lookup (e.g. `"address.city"`). */
  get path(): string {
    return this.reactive.path ?? ''
  }

  private set path(value: string) {
    this.reactive.path = value
  }

  /** Unique path including array indices for deduplication. */
  get uniquePath(): string {
    return this.reactive.uniquePath ?? ''
  }

  private set uniquePath(value: string) {
    this.reactive.uniquePath = value
  }

  /** The top-level model object at the root of the validator tree. */
  public get rootModel() {
    return this._rootModel
  }

  protected set rootModel(value: TModel) {
    this._rootModel = value
  }

  /** The root validator node of the tree. */
  public get rootValidator() {
    return this._rootValidator
  }

  /** The parent validator in the tree, or `null`/`undefined` for the root. */
  get parent(): DryvValidator | undefined | null {
    return this._parent
  }

  /** Attaches this validator to a parent, recomputing hierarchy paths and notifying subclasses. */
  attachToTree(parent?: DryvValidator | null) {
    this._parent = parent
    this.updateHierarchy()
    this.onParentChanged()
  }

  protected onParentChanged() {
    // nop;
  }

  private updateHierarchy(cascade = false) {
    const result = computeHierarchy(this.parent, this.model, this, this.field, this.index)
    this._rootModel = result.rootModel as TModel
    this._rootValidator = result.rootValidator as DryvValidator<TModel>
    this.path = result.path
    this.uniquePath = result.uniquePath

    if (cascade) {
      this.childValidators().forEach((v) => v.updateHierarchy(true))
    }
  }

  /** Resets the validation state (text, type, group) of this node and all descendants. */
  clear(): void {
    walkValidatorTree(this, (v) => resetValidatorState(v.reactive, false))
  }

  private resetState(includeDirty: boolean) {
    resetValidatorState(this.reactive, includeDirty)
  }

  private walkTree(action: (v: DryvValidator) => void) {
    walkValidatorTree(this, action)
  }

  /**
   * Maps a server validation response onto this validator tree.
   * @param response - The server response to apply.
   * @returns `true` if the entire subtree is successful.
   */
  setValidationResult(response: DryvServerValidationResponse | DryvServerErrors): boolean {
    return applyServerValidationResult(this, response)
  }

  /** Releases all resources held by this validator and its descendants. */
  dispose() {
    this.onDestroy()
    this.childValidators().forEach((v) => v.dispose())
  }

  [Symbol.dispose]() {
    this.dispose()
  }

  /** Alias for {@link dispose}. */
  destroy() {
    this.dispose()
  }

  /** Hook called during disposal. Override in subclasses to release owned resources. */
  onDestroy() {
    // nop
  }

  /** Serializes this validator's public state to a plain JSON-safe object. */
  toJSON(): any {
    return serializeValidator(this)
  }
}
