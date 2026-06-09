import type {
  DryvOptions,
  DryvReactiveState,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidationResult,
  DryvValidationResultType,
  IValidator
} from '@/types'
import { isStructuredResponse } from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import { serializeValidator } from './serializeValidator'
import { computeValidatorPaths } from '@/internal/computeValidatorPaths'

export abstract class DryvValidator<
  TModel extends object = any,
  TValue = any
> implements IValidator<TModel> {
  public readonly __dryvValidator = true
  public readonly _reactive: DryvReactiveState

  private _parent?: DryvValidator | null
  private _index?: number
  private _rootModel: TModel
  private _rootValidator: DryvValidator<TModel>
  private _isReverting = false
  private _facadeProxy?: unknown

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

  get isDirty(): boolean {
    return this._reactive.isDirty
  }

  protected set isDirty(value: boolean) {
    this._reactive.isDirty = value
  }

  get text(): string | null {
    return this._reactive.text
  }

  set text(value: string | null) {
    this._reactive.text = value
  }

  get group(): string | null {
    return this._reactive.group
  }

  set group(value: string | null) {
    this._reactive.group = value
  }

  get required(): boolean | null {
    return this._reactive.required
  }

  set required(value: boolean | null) {
    this._reactive.required = value
  }

  get groupShown(): boolean {
    return this._reactive.groupShown
  }

  set groupShown(value: boolean) {
    this._reactive.groupShown = value
  }

  get type(): DryvValidationResultType | null {
    return this._reactive.type
  }

  set type(value: DryvValidationResultType | null) {
    this._reactive.type = value
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
    this._reactive = options.reactiveWrapper<DryvReactiveState>({
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

  abstract get value(): TValue
  abstract set value(value: TValue)

  abstract validate(): Promise<DryvValidationResult>

  refreshDirty() {
    const wasDirty = this.isDirty
    this.isDirty = this.childValidators().some((f) => f?.isDirty)

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }

  get facadeProxy(): any {
    return this._facadeProxy
  }

  protected set facadeProxy(value: any) {
    this._facadeProxy = value
  }

  get isReverting() {
    return this._isReverting
  }

  revert() {
    this._isReverting = true
    try {
      this.walkTree((v) => v.performRevert())
    } finally {
      this._isReverting = false
    }
  }

  commit() {
    this.walkTree((v) => v.performCommit())
  }

  protected performRevert() {
    this.resetState(true)
  }

  protected performCommit() {
    this.resetState(true)
  }

  public abstract childValidators(): DryvValidator[]

  get hasErrors(): boolean {
    return this.type?.toLowerCase() === 'error'
  }

  get hasWarnings(): boolean {
    return this.type?.toLowerCase() === 'warning'
  }

  get isSuccess(): boolean {
    return !this.hasErrors && !this.hasWarnings
  }

  get path(): string {
    return this._reactive.path ?? ''
  }

  private set path(value: string) {
    this._reactive.path = value
  }

  get uniquePath(): string {
    return this._reactive.uniquePath ?? ''
  }

  private set uniquePath(value: string) {
    this._reactive.uniquePath = value
  }

  public get rootModel() {
    return this._rootModel
  }

  protected set rootModel(value: TModel) {
    this._rootModel = value
  }

  public get rootValidator() {
    return this._rootValidator
  }

  get parent(): DryvValidator | undefined | null {
    return this._parent
  }

  set parent(value: DryvValidator | undefined | null) {
    this._parent = value
  }

  attachToTree(parent?: DryvValidator | null) {
    this._parent = parent
    this.updateHierarchy()
    this.onParentChanged()
  }

  protected onParentChanged() {
    // nop;
  }

  private updateHierarchy(cascade = false) {
    const parent = this.parent

    if (parent) {
      this._rootModel = parent.rootModel ?? this.model
      this._rootValidator = parent.rootValidator
    } else {
      this._rootModel = this.model
      this._rootValidator = this
    }

    const paths = computeValidatorPaths(parent?.path, parent?.uniquePath, this.field, this.index)
    this.path = paths.path
    this.uniquePath = paths.uniquePath

    if (cascade) {
      this.childValidators().forEach((v) => v.updateHierarchy(true))
    }
  }

  clear(): void {
    this.walkTree((v) => v.resetState(false))
  }

  private resetState(includeDirty: boolean) {
    this._reactive.type = null
    this._reactive.text = null
    this._reactive.group = null
    this._reactive.groupShown = false
    if (includeDirty) this._reactive.isDirty = false
  }

  private walkTree(action: (v: DryvValidator) => void) {
    action(this)
    for (const child of this.childValidators()) {
      child?.walkTree(action)
    }
  }

  setValidationResult(response: DryvServerValidationResponse | DryvServerErrors): boolean {
    const messages =
      isStructuredResponse(response) ? response.messages : response

    const message = messages?.[this.path!]

    if (message && message.type !== 'success') {
      this.text = message.text ?? ''
      this.group = message.group ?? ''
      this.type = message.type ?? null
    } else {
      this.text = null
      this.group = null
      this.type = null
    }

    return this.childValidators().reduce(
      (acc: boolean, v: DryvValidator) => v.setValidationResult(response) && acc,
      this.isSuccess
    )
  }

  destroy() {
    this.onDestroy()
    this.childValidators().forEach((v) => v.destroy())
  }

  onDestroy() {
    // nop
  }

  toJSON(): any {
    return serializeValidator(this)
  }
}
