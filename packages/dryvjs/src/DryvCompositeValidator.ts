import type { DryvValidationSession } from './'
import { DryvOptions } from './'
import { DryvValidator } from './DryvValidator'

export abstract class DryvCompositeValidator<
  TModel extends object = any,
  TTransparentProxy = any
> extends DryvValidator<TModel, TModel, DryvCompositeValidator> {
  private _ignoreChildChanges = false
  private _isReverting = false
  private _transparentProxy?: TTransparentProxy

  protected constructor(
    model: TModel,
    session: DryvValidationSession<TModel>,
    parent: DryvCompositeValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
  }

  get transparentProxy(): TTransparentProxy {
    return this._transparentProxy!
  }

  protected set transparentProxy(value: TTransparentProxy) {
    this._transparentProxy = value
  }

  protected get isReverting() {
    return this._isReverting
  }

  override revert() {
    try {
      this._isReverting = true
      super.revert()
    } finally {
      this._isReverting = false
    }
  }

  refreshDirty() {
    if (this._ignoreChildChanges) {
      return
    }

    const wasDirty = this.isDirty
    this.isDirty = this.childValidators().some((f) => f?.isDirty)

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }
}
