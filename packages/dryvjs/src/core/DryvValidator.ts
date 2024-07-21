import {
  DryvOptions,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidationResult,
  DryvValidationResultType,
  DryvValidationSession
} from '@/core'

export abstract class DryvValidator<TModel extends object = any, TParameters = object> {
  private _parent?: DryvValidator | null
  private _path?: string

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
  private _rootModel: TModel
  private _rootValidator: DryvValidator<TModel>
  private _reactive: any
  public get rootModel() {
    return this._rootModel
  }
  public get rootValidator() {
    return this._rootValidator
  }

  protected constructor(
    public model: TModel,
    protected session: DryvValidationSession<TModel, TParameters>,
    parent: DryvValidator | undefined,
    protected options: DryvOptions,
    public readonly field: keyof TModel | undefined = undefined
  ) {
    this._rootModel = model
    this._rootValidator = this
    this._reactive = options.objectWrapper({
      text: null,
      group: null,
      required: null,
      groupShown: false,
      type: null
    })
    this.parent = parent
  }

  abstract get value(): any
  abstract set value(value: any)

  abstract validate(): Promise<DryvValidationResult>

  abstract childValidators(): DryvValidator[]

  get hasError(): boolean {
    return this.type === 'error'
  }

  get hasWarning(): boolean {
    return this.type === 'warning'
  }

  get isSuccess(): boolean {
    return !this.hasError && !this.hasWarning
  }

  get path(): string | null {
    return this._path ?? null
  }

  get parent(): DryvValidator | undefined | null {
    return this._parent
  }

  set parent(parent: DryvValidator | undefined | null) {
    this._parent = parent

    if (parent) {
      if (this.field) {
        this._path = parent.path ? `${parent.path}.${String(this.field)}` : String(this.field)
      } else {
        this._path = ''
      }
      this._rootModel = parent.rootModel
      this._rootValidator = parent.rootValidator
    } else {
      this._path = this.field ? String(this.field) : ''
      this._rootModel = this.model
      this._rootValidator = this
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

  toJSON(): any {
    return {
      ...this,
      value: this.value,
      path: this.path,
      hasError: this.hasError,
      hasWarning: this.hasWarning,
      isSuccess: this.isSuccess,
      _parent: undefined,
      _path: undefined,
      _rootModel: undefined,
      _rootValidator: undefined,
      _reactive: undefined,
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
