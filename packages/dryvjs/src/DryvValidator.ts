import {
  DryvOptions,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidationResult,
  DryvValidationResultType,
  DryvValidationSession
} from './'

export abstract class DryvValidator<
  TModel extends object = any,
  TValue = any,
  TParent extends DryvValidator = any
> {
  public readonly __dryvValidator = true
  private _parent?: TParent | null
  private _index?: number

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

  private _rootModel: any
  private _rootValidator: DryvValidator<TModel, any>
  private _reactive: any

  protected constructor(
    public model: TModel,
    protected session: DryvValidationSession<TModel>,
    parent: TParent | undefined,
    protected options: DryvOptions,
    public readonly field: keyof TModel | undefined = undefined
  ) {
    this._rootModel = model
    this._rootValidator = this
    this._reactive = options.reactiveWrapper({
      path: null,
      uniquePath: null,
      text: null,
      group: null,
      required: null,
      groupShown: false,
      type: null,
      isDirty: false
    })
    this.parent = parent
  }

  abstract get value(): TValue
  abstract set value(value: TValue)

  abstract validate(): Promise<DryvValidationResult>

  abstract refreshDirty(): void

  revert() {
    this.type = null
    this.text = null
    this.group = null
    this.groupShown = false
    this.isDirty = false

    for (const validator of this.childValidators()) {
      validator?.revert()
    }
  }

  commit() {
    this.type = null
    this.text = null
    this.group = null
    this.groupShown = false
    this.isDirty = false

    for (const validator of this.childValidators()) {
      validator?.commit()
    }
  }

  public abstract childValidators(): DryvValidator[]

  get hasError(): boolean {
    return this.type === 'error'
  }

  get hasWarning(): boolean {
    return this.type === 'warning'
  }

  get isSuccess(): boolean {
    return !this.hasError && !this.hasWarning
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

  protected set rootModel(value: any) {
    this._rootModel = value
  }

  public get rootValidator() {
    return this._rootValidator
  }

  get parent(): TParent | undefined | null {
    return this._parent
  }

  set parent(parent: TParent | undefined | null) {
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

    this.path = [parent?.path, this.field].filter((x) => !!x).join('.')
    this.uniquePath = [parent?.uniquePath, this.index, this.field]
      .filter((x) => typeof x === 'number' || !!x)
      .join('.')

    if (cascade) {
      this.childValidators().forEach((v) => v.updateHierarchy(true))
    }
  }

  clear(): void {
    this.type = null
    this.text = null
    this.group = null

    this.childValidators().forEach((v) => v.clear())
  }

  setValidationResult(response: DryvServerValidationResponse | DryvServerErrors): boolean {
    return this.childValidators().reduce(
      (acc: boolean, v: DryvValidator) => v.setValidationResult(response) && acc,
      true
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
    return {
      ...this,
      value: this.value,
      path: this.path,
      text: this.text,
      hasError: this.hasError,
      hasWarning: this.hasWarning,
      isSuccess: this.isSuccess,
      uniquePath: this.uniquePath,
      _parent: undefined,
      _path: undefined,
      _rootModel: undefined,
      _rootValidator: undefined,
      _reactive: undefined,
      _initialValue: undefined,
      _ignoreChildChanges: undefined,
      _isReverting: undefined,
      _items: undefined,
      _uniquePath: undefined,
      rootValidator: undefined,
      rootModel: undefined,
      parent: undefined,
      model: undefined,
      proxy: undefined,
      session: undefined,
      options: undefined,
      transparentProxy: undefined
    }
  }
}
